import requests
from bs4 import BeautifulSoup
import json
import urllib3
import os
from urllib.parse import urljoin, urlparse

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

session = requests.Session()
session.verify = False

BASE = "https://www.cityofkingston.ca"
START_URL = f"{BASE}/building-and-renovating/building-permits/"

visited = set()
archive = []

def get_soup(url):
    try:
        r = session.get(url, timeout=20)
        r.raise_for_status()
        return BeautifulSoup(r.text, "lxml")
    except Exception:
        return None

def is_internal(url):
    return urlparse(url).netloc == urlparse(BASE).netloc

def crawl_page(url):
    if url in visited:
        return
    visited.add(url)

    print(f"Crawling: {url}")
    soup = get_soup(url)
    if not soup:
        return

    # Extract main text content
    main = soup.find("main") or soup.body
    text_content = ""
    if main:
        text_content = "\n".join(p.get_text(strip=True) for p in main.find_all("p"))

    # Store this page's content
    archive.append({
        "page_url": url,
        "page_title": soup.title.string.strip() if soup.title else "",
        "text": text_content
    })

    # find and follow internal links within this section
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        full = urljoin(BASE, href)

        # only follow internal links under building permits
        if is_internal(full) and "/building-and-renovating/building-permits" in full:
            if full not in visited:
                crawl_page(full)

        # save any PDFs
        if full.lower().endswith(".pdf"):
            archive.append({
                "source_page": url,
                "pdf_url": full,
                "link_text": a.get_text(strip=True)
            })

def save_output():
    os.makedirs("data", exist_ok=True)
    with open("data/building_permits_archive.json", "w", encoding="utf-8") as f:
        json.dump(archive, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(archive)} items to building_permits_archive.json")

if __name__ == "__main__":
    crawl_page(START_URL)
    save_output()
