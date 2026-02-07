import requests
from bs4 import BeautifulSoup
import time
import json
from datetime import datetime

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

base_url = "https://events.cityofkingston.ca"
all_events = []

# Define the date range you want to scrape
start_date = "02/10/2026"  # February 10, 2026
end_date = "02/28/2026"    # February 28, 2026

# Scrape first page only
page = 0
current_url = base_url + f"/council/Index?action=search&StartDate={start_date}&EndDate={end_date}"

print(f"Scraping page 1: {current_url}")

try:
    response = requests.get(current_url, headers=headers, timeout=10)
    response.raise_for_status()
except requests.exceptions.ConnectionError:
    print("Connection error: The server closed the connection. Try again later.")
    exit()
except requests.exceptions.Timeout:
    print("Timeout error: The request took too long.")
    exit()

soup = BeautifulSoup(response.text, "html.parser")

# Find all table rows
for row in soup.select("table tbody tr"):
    tds = row.find_all("td")
    if len(tds) >= 2:
        date = tds[0].text.strip()
        link_elem = tds[1].find("a")
        if link_elem:
            title = link_elem.text.strip()
            link = link_elem.get("href", "")
            all_events.append({
                "date": date,
                "title": title,
                "link": link
            })

print(f"Found {len(all_events)} events on first page")

# Debug: fetch first event detail page to inspect structure
if all_events:
    debug_url = base_url + all_events[0]["link"]
    print(f"\nDEBUG: Fetching {debug_url}")
    debug_response = requests.get(debug_url, headers=headers, timeout=10)
    debug_soup = BeautifulSoup(debug_response.text, "html.parser")
    print(debug_soup.prettify()[:5000])  # Print first 5000 chars to inspect

# Fetch detail pages for each event
detailed_events = []

for idx, event in enumerate(all_events):
    try:
        detail_url = base_url + event["link"]
        print(f"Fetching event {idx+1}/{len(all_events)}: {event['title']}")
        
        detail_response = requests.get(detail_url, headers=headers, timeout=10)
        detail_response.raise_for_status()
        detail_soup = BeautifulSoup(detail_response.text, "html.parser")
        
        # Try multiple selectors for agenda and minutes
        agenda_section = detail_soup.find("div", {"class": ["agenda", "icrt-calendarContentSideContent"]})
        agenda_html = str(agenda_section) if agenda_section else None
        
        minutes_section = detail_soup.find("div", {"class": "minutes"})
        minutes_html = str(minutes_section) if minutes_section else None
        
        detailed_events.append({
            "date": event["date"],
            "title": event["title"],
            "link": event["link"],
            "agenda_html": agenda_html,
            "minutes_html": minutes_html
        })
        
        time.sleep(0.5)  # Be respectful with requests
        
    except Exception as e:
        print(f"Error fetching {event['link']}: {e}")
        detailed_events.append({
            "date": event["date"],
            "title": event["title"],
            "link": event["link"],
            "agenda_html": None,
            "minutes_html": None,
            "error": str(e)
        })

# Save to JSON file
with open("events_detailed.json", "w") as f:
    json.dump(detailed_events, f, indent=2)

print(f"Extracted {len(detailed_events)} events with details")