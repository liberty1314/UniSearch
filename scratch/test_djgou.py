import urllib.request

url = "https://duanjugou.top/search.php?q=test&page=1"
req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'}
)
try:
    response = urllib.request.urlopen(req)
    html = response.read().decode('utf-8')
    with open('/Users/abner/Desktop/MyProject/UniSearch_dev/scratch/djgou.html', 'w') as f:
        f.write(html)
    print("Saved to djgou.html")
except Exception as e:
    print("Error:", e)
