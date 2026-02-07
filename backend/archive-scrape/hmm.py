import requests
from bs4 import BeautifulSoup
import json
import urllib3
import html
import os

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

session = requests.Session()
session.verify = False

url = "https://events.cityofkingston.ca/council/Index"
r = session.get(url)
soup = BeautifulSoup(r.text, "lxml")

token = soup.find("input", {"name": "__RequestVerificationToken"})["value"]
print(f"Token found: {token[:20]}...")

payload = {
    "__RequestVerificationToken": token,
    "StartDate": "11/01/2024",
    "EndDate": "11/01/2026"
}

meeting_data = []
base_url = "https://events.cityofkingston.ca"
page = 0
seen_meetings = set()

while True:
    print(f"\nFetching page {page}...")
    
    payload["page"] = page
    r = session.post("https://events.cityofkingston.ca/council/Index?action=search", data=payload, verify=False)
    results = BeautifulSoup(r.text, "lxml")
    
    table_rows = results.select("table tbody tr")
    print(f"Found {len(table_rows)} rows on page {page}")
    
    if len(table_rows) == 0:
        print("No more rows, stopping pagination")
        break
    
    page_had_new = False
    
    for row in table_rows:
        tds = row.find_all("td")
        if len(tds) >= 3:
            date_str = tds[0].get_text(strip=True)
            
            meeting_link = tds[1].find("a")
            meeting_name = meeting_link.get_text(strip=True) if meeting_link else "N/A"
            
            # Use date + name as unique identifier
            meeting_id = f"{date_str}|{meeting_name}"
            
            if meeting_id not in seen_meetings:
                seen_meetings.add(meeting_id)
                page_had_new = True
                
                meeting_url = meeting_link.get("href", "") if meeting_link else ""
                if meeting_url.startswith("/"):
                    meeting_url = base_url + meeting_url
                
                documents = {}
                for td in tds[2:]:
                    doc_links = td.find_all("a")
                    for doc_link in doc_links:
                        doc_text = doc_link.get_text(strip=True)
                        doc_href = doc_link.get("href", "")
                        if doc_text and doc_href:
                            if doc_href.startswith("/"):
                                doc_href = base_url + doc_href
                            documents[doc_text] = html.unescape(doc_href)
                
                meeting_data.append({
                    "date": date_str,
                    "meeting": meeting_name,
                    "meeting_url": meeting_url,
                    "documents": documents
                })
    
    if not page_had_new:
        print("No new meetings found, stopping pagination")
        break
    
    page += 1

# Save to JSON
output_dir = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "meeting_data.json")

with open(output_path, "w") as f:
    json.dump(meeting_data, f, indent=2)

print(f"\nSaved {len(meeting_data)} total meetings to meeting_data.json")