const fs = require('fs');
const path = require('path');
const https = require('https');

const dir = path.join(__dirname, 'public', 'models', 'SmolLM2-135M-Instruct-q0f16-MLC');
const cacheFile = path.join(dir, 'ndarray-cache.json');
const baseUrl = 'https://hf-mirror.com/mlc-ai/SmolLM2-135M-Instruct-q0f16-MLC/resolve/main/';

async function downloadFile(filename) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(dir, filename);
        const url = baseUrl + filename;
        console.log(`Downloading ${filename}...`);
        
        const file = fs.createWriteStream(filePath);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirect
                https.get(response.headers.location, (res2) => {
                    res2.pipe(file);
                    file.on('finish', () => {
                        file.close(resolve);
                    });
                }).on('error', (err) => {
                    fs.unlink(filePath, () => {});
                    reject(err);
                });
            } else if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            } else {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            }
        }).on('error', (err) => {
            fs.unlink(filePath, () => {});
            reject(err);
        });
    });
}

async function run() {
    if (!fs.existsSync(cacheFile)) {
        console.error("ndarray-cache.json not found!");
        return;
    }
    
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    for (const record of cache.records) {
        const filename = record.dataPath;
        const expectedSize = record.nbytes;
        const filePath = path.join(dir, filename);
        
        let needsDownload = true;
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.size === expectedSize) {
                console.log(`[SKIP] ${filename} already exists and size matches.`);
                needsDownload = false;
            }
        }
        
        if (needsDownload) {
            try {
                await downloadFile(filename);
                console.log(`[OK] ${filename} downloaded successfully.`);
            } catch (err) {
                console.error(`[FAIL] ${filename}: ${err.message}`);
            }
        }
    }
    console.log("All done!");
}

run();
