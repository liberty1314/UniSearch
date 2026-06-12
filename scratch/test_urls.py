import os
import re
import urllib.request
import urllib.error
import ssl

failed_plugins = ["libvio", "ash", "xuexizhinan", "djgou", "cldi", "fox4k", "yuhuage", "kule", "kanjuba", "52api", "yppan", "jikepan", "duoduo", "hdr4k", "pan666", "qupansou", "zhizhen"]
base_dir = "/Users/abner/Desktop/MyProject/UniSearch_dev/backend/plugin"

results = []

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

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
            domain_match = re.match(r'(https?://[^/]+)', url)
            if domain_match:
                domain = domain_match.group(1)
                req = urllib.request.Request(
                    domain, 
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
                )
                try:
                    response = urllib.request.urlopen(req, context=ctx, timeout=5)
                    status = response.getcode()
                    print(f"{p}: {domain} -> Status {status}")
                    results.append((p, "alive"))
                except urllib.error.HTTPError as e:
                    print(f"{p}: {domain} -> HTTP Error {e.code}")
                    results.append((p, "alive" if e.code in [403, 401] else "dead"))
                except urllib.error.URLError as e:
                    print(f"{p}: {domain} -> URL Error {e.reason}")
                    results.append((p, "dead"))
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
