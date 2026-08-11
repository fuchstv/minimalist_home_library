#!/usr/bin/env python3
import time
import urllib.request
import concurrent.futures
import json

TARGETS = [
    "http://localhost:8080/",
    "http://localhost/api/books.php",
    "http://localhost/api/pages.php",
    "http://localhost/",
]

def make_request(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "LoadTester/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status
    except Exception as e:
        return str(e)

def run_load(duration_sec=30, concurrency=20):
    print(f"Starting load test for {duration_sec}s with concurrency={concurrency}...")
    start_time = time.time()
    total_reqs = 0
    errors = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        while time.time() - start_time < duration_sec:
            futures = [executor.submit(make_request, TARGETS[i % len(TARGETS)]) for i in range(concurrency)]
            for f in concurrent.futures.as_completed(futures):
                total_reqs += 1
                res = f.result()
                if res != 200:
                    errors += 1
            time.sleep(0.05)

    elapsed = time.time() - start_time
    print(f"Load test complete: {total_reqs} requests in {elapsed:.2f}s ({total_reqs/elapsed:.2f} req/s), errors: {errors}")

if __name__ == "__main__":
    run_load()
