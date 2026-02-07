import requests
from bs4 import BeautifulSoup
import json
import os
from urllib.parse import urljoin, urlparse
import time

BASE = "https://www.cityofkingston.ca"
START_PAGES = [
    "https://www.cityofkingston.ca/applications-licences-and-permits/birth-and-death-registrations/",
    "https://www.cityofkingston.ca/building-and-renovating/building-permits/",
    "https://www.cityofkingston.ca/applications-licences-and-permits/business-licences/",
    "https://www.cityofkingston.ca/applications-licences-and-permits/cemeteries/",
    "https://www.cityofkingston.ca/applications-licences-and-permits/commissioner-of-oaths/",
    "https://www.cityofkingston.ca/planning-and-development/development-applications/",
    "https://www.cityofkingston.ca/applications-licences-and-permits/food-truck-permits/",
    "https://www.cityofkingston.ca/applications-licences-and-permits/line-fence-disputes/",
    "https://www.cityofkingston.ca/applications-licences-and-permits/lottery-licences/",
    "https://www.cityofkingston.ca/applications-licences-and-permits/marriage-licences-and-ceremonies/",
    "https://www.cityofkingston.ca/council-and-city-administration/memorials-and-commemorations/",
    "https://www.cityofkingston.ca/applications-licences-and-permits/noise-exemption-application/",
    "https://www.cityofkingston.ca/emergency-services-and-public-health/open-air-fire-permits/",
    "https://www.cityofkingston.ca/roads-parking-and-transportation/parking/parking-permits/",
    "https://www.cityofkingston.ca/bylaws-and-animal-services/animal-and-pet-services/pet-licences/",
    "https://www.cityofkingston.ca/applications-licences-and-permits/right-of-way-permits/",
    "https://www.cityofkingston.ca/applications-licences-and-permits/short-term-rental-licensing/",
    "https://www.cityofkingston.ca/applications-licences-and-permits/speaking-to-council/",
    "https://www.cityofkingston.ca/applications-licences-and-permits/special-event-and-park-permits/",
    "https://www.cityofkingston.ca/applications-licences-and-permits/street-patio-program/",
    "https://www.cityofkingston.ca/bylaws-and-animal-services/commonly-requested-bylaws/tree-bylaw-and-permits/"
    ]


DATA_DIR = "data"
MAX_DEPTH = 2  # how deep to follow internal links

session = requests.Session()
session.verify = True
os.makedirs(DATA_DIR, exist_ok=True)

visited = set()  # track visited URLs globally for this category

def get_soup(url):
    try:
        r = session.get(url, timeout=20)
        r.raise_for_status()
        return BeautifulSoup(r.text, "lxml")
    except:
        return None

def parse_page(url, section_url, depth=0):
    """Crawl a page, return its content, follow internal links only under section_url"""
    if url in visited or depth > MAX_DEPTH:
        return []

    visited.add(url)
    print(f"[Depth {depth}] Crawling: {url}")

    soup = get_soup(url)
    if not soup:
        return []

    content = []
    main = soup.find("main") or soup.body

    if main:
        # Grab text and PDFs
        for tag in main.find_all(["h1","h2","h3","p","a"], recursive=True):
            if tag.name in ["h1","h2","h3"]:
                content.append({"heading": tag.get_text(strip=True), "text": "", "pdfs": []})
            elif tag.name == "p":
                if content:
                    content[-1]["text"] += tag.get_text(" ", strip=True) + " "
                else:
                    content.append({"heading": None, "text": tag.get_text(" ", strip=True), "pdfs": []})
            elif tag.name == "a":
                href = tag.get("href")
                if href and href.lower().endswith(".pdf"):
                    pdf_url = urljoin(BASE, href)
                    if content:
                        content[-1]["pdfs"].append({"text": tag.get_text(strip=True), "url": pdf_url})
                    else:
                        content.append({"heading": None, "text": "", "pdfs":[{"text": tag.get_text(strip=True), "url": pdf_url}]})

    # Follow internal links only under section_url
    for a in main.find_all("a", href=True):
        href = a["href"].strip()
        full_url = urljoin(BASE, href)
        if full_url.startswith(section_url) and full_url not in visited:
            time.sleep(0.3)
            content.extend(parse_page(full_url, section_url, depth + 1))

    return content

# --- MAIN LOOP ---
for start_url in START_PAGES:
    print(f"\n=== STARTING: {start_url} ===")
    visited.clear()  # reset per section
    archive = parse_page(start_url, start_url)
    filename = start_url.rstrip("/").split("/")[-1] + ".json"
    with open(os.path.join(DATA_DIR, filename), "w", encoding="utf-8") as f:
        json.dump(archive, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(archive)} sections to {filename}")
