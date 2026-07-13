import os
import json
import urllib.request
import sys

dir_path = os.path.join('public', 'models', 'SmolLM2-135M-Instruct-q0f16-MLC')
cache_file = os.path.join(dir_path, 'ndarray-cache.json')
base_url = 'https://hf-mirror.com/mlc-ai/SmolLM2-135M-Instruct-q0f16-MLC/resolve/main/'

if not os.path.exists(cache_file):
    print("ndarray-cache.json not found!")
    sys.exit(1)

with open(cache_file, 'r', encoding='utf-8') as f:
    cache = json.load(f)

for record in cache['records']:
    filename = record['dataPath']
    expected_size = record['nbytes']
    file_path = os.path.join(dir_path, filename)
    
    needs_download = True
    if os.path.exists(file_path):
        size = os.path.getsize(file_path)
        if size == expected_size:
            print(f"[SKIP] {filename} already exists and size matches.")
            needs_download = False
        else:
            print(f"[RE-DOWNLOAD] {filename} size mismatch ({size} vs {expected_size}).")
            
    if needs_download:
        url = base_url + filename
        print(f"Downloading {filename}...")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as response, open(file_path, 'wb') as f_out:
                while True:
                    chunk = response.read(8192)
                    if not chunk:
                        break
                    f_out.write(chunk)
            print(f"[OK] {filename} downloaded successfully.")
        except Exception as e:
            print(f"[FAIL] {filename}: {str(e)}")

print("All done!")
