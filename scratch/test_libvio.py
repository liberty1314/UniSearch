import urllib.request
import urllib.parse
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Try MacCMS style path
url = "https://www.libvio.mov/search/" + urllib.parse.quote("test") + "-------------.html"
req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'}
)
try:
    response = urllib.request.urlopen(req, context=ctx)
    print("Saved to libvio.html, Status:", response.getcode())
except Exception as e:
    print("Error with path search:", e)

# Try /index.php/vod/search.html?wd=test
url2 = "https://www.libvio.mov/index.php/vod/search.html?wd=" + urllib.parse.quote("test")
req2 = urllib.request.Request(
    url2, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'}
)
try:
    response2 = urllib.request.urlopen(req2, context=ctx)
    print("Status 2:", response2.getcode())
except Exception as e:
    print("Error with query search:", e)
