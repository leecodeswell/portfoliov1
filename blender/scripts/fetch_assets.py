"""Download CC0 Poly Haven assets used by the desk scene into blender/assets/."""
import json, os, urllib.request
ROOT = os.path.join(os.path.dirname(__file__), "..", "assets")
UA = {"User-Agent": "portfoliov1"}
ASSETS = [("smoked_walnut_veneer", "4k", "blend")]

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read()

for name, res, fmt in ASSETS:
    files = json.loads(get(f"https://api.polyhaven.com/files/{name}"))
    entry = files[fmt][res][fmt]
    dest = os.path.join(ROOT, name)
    jobs = [(entry["url"], os.path.basename(entry["url"]))]
    jobs += [(v["url"], k) for k, v in entry.get("include", {}).items()]
    for url, rel in jobs:
        p = os.path.join(dest, rel)
        if os.path.exists(p): continue
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, "wb").write(get(url)); print("got", name, rel)
