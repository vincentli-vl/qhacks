import requests
from bs4 import BeautifulSoup
import json
import urllib3
import html
import os

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

session = requests.Session()
session.verify = False

url = "https://www.cityofkingston.ca/bylaws-and-animal-services/"
r = session.get(url, verify=False)
soup = BeautifulSoup(r.text, "lxml")

bylaws_data = []
base_url = "https://www.cityofkingston.ca"
seen_bylaws = set()

# Find all bylaw links/containers
bylaw_items = soup.find_all("a", {"class": ["bylaw", "bylaw-link", "btn-primary"]})

# If the above doesn't work, try finding all links in the main content
if not bylaw_items:
    content = soup.find("main") or soup.find("article") or soup.find("div", {"class": "content"})
    if content:
        bylaw_items = content.find_all("a")

print(f"Found {len(bylaw_items)} bylaw items")

for item in bylaw_items:
    bylaw_name = item.get_text(strip=True)
    bylaw_url = item.get("href", "")
    
    # Skip empty links
    if not bylaw_name or not bylaw_url:
        continue
    
    # Create unique ID
    bylaw_id = bylaw_name
    
    if bylaw_id not in seen_bylaws:
        seen_bylaws.add(bylaw_id)
        
        # Make absolute URLs
        if bylaw_url.startswith("/"):
            bylaw_url = base_url + bylaw_url
        elif not bylaw_url.startswith("http"):
            bylaw_url = base_url + "/" + bylaw_url
        
        bylaws_data.append({
            "name": bylaw_name,
            "url": html.unescape(bylaw_url)
        })

# Save to JSON
output_dir = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "bylaws_data.json")

with open(output_path, "w") as f:
    json.dump(bylaws_data, f, indent=2)

print(f"\nSaved {len(bylaws_data)} bylaws to bylaws_data.json")