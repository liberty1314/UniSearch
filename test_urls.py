import os
import re
import requests
import time

failed_plugins = ["libvio", "ash", "xuexizhinan", "djgou", "cldi", "fox4k", "yuhuage", "kule", "kanjuba", "52api", "yppan", "jikepan", "duoduo", "hdr4k", "pan666", "qupansou", "zhizhen"]
base_dir = "/Users/abner/Desktop/MyProject/UniSearch_dev/backend/plugin"

results = []

for p in failed_plugins:
    p_dir = os.path.join(base_dir, p)
    if not os.path.isdir(p_dir):
        print(f"{p}: Directory not found")
        continue
    
    url = None
    for root, _, files in os.walk(p_dir):
        for f in files:
            if f.endswith(".go"):
                with open(os.path.join(root, f), 'r', encoding='utf-8') as file:
                    content = file.read()
                    match = re.search(r'\"https?://[^\"]+\"', content)
                    if match:
                        url = match.group(0).strip('"')
                        break
        if url:
            break
            
    if url:
        print(f"Testing {p}: {url}")
        try:
            # We want to test just the domain root to see if it's alive, or the URL itself
            # Let's extract domain root
            domain_match = re.match(r'(https?://[^/]+)', url)
            if domain_match:
                domain = domain_match.group(1)
                headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                res = requests.get(domain, headers=headers, timeout=5, verify=False)
                print(f"{p}: {domain} -> Status {res.status_code}")
                results.append((p, "alive" if res.status_code in [200, 301, 302, 403] else "dead"))
            else:
                print(f"{p}: Invalid URL {url}")
        except Exception as e:
            print(f"{p}: {url} -> Exception: {e}")
            results.append((p, "dead"))
    else:
        print(f"{p}: No URL found")

print("\n--- Summary ---")
for r in results:
    print(f"{r[0]}: {r[1]}")

