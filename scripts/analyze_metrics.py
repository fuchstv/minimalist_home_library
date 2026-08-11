#!/usr/bin/env python3
import json
import sys
import os

LOG_FILE = "/home/ubuntu/minimalist_home_library/logs/resource_usage_24h.jsonl"

def parse_logs(filepath):
    if not os.path.exists(filepath):
        print(f"Log file not found: {filepath}")
        return

    records = []
    with open(filepath, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except Exception:
                    pass

    if not records:
        print("No log records found.")
        return

    print(f"=== Resource Log Analysis ({len(records)} samples) ===")
    first_ts = records[0]["timestamp"]
    last_ts = records[-1]["timestamp"]
    print(f"Time Range: {first_ts} to {last_ts}\n")

    # Host Memory Stats
    used_mems = [r["system"]["memory"]["used_bytes"] / (1024*1024) for r in records]
    avail_mems = [r["system"]["memory"]["available_bytes"] / (1024*1024) for r in records]
    total_mem = records[0]["system"]["memory"]["total_bytes"] / (1024*1024)

    print("--- Host Memory (MB) ---")
    print(f"Total System RAM: {total_mem:.1f} MB")
    print(f"Used RAM      - Min: {min(used_mems):.1f} MB | Avg: {sum(used_mems)/len(used_mems):.1f} MB | Max: {max(used_mems):.1f} MB")
    print(f"Available RAM - Min: {min(avail_mems):.1f} MB | Avg: {sum(avail_mems)/len(avail_mems):.1f} MB | Max: {max(avail_mems):.1f} MB\n")

    # Host CPU Stats
    cpu_idles = [r["system"]["cpu_pct"]["idle"] for r in records]
    cpu_users = [r["system"]["cpu_pct"]["user"] for r in records]
    cpu_systems = [r["system"]["cpu_pct"]["system"] for r in records]

    print("--- Host CPU Utilization (%) ---")
    print(f"User CPU   - Avg: {sum(cpu_users)/len(cpu_users):.1f}% | Max: {max(cpu_users):.1f}%")
    print(f"System CPU - Avg: {sum(cpu_systems)/len(cpu_systems):.1f}% | Max: {max(cpu_systems):.1f}%")
    print(f"Idle CPU   - Avg: {sum(cpu_idles)/len(cpu_idles):.1f}% | Min: {min(cpu_idles):.1f}%\n")

    # Container Stats
    container_stats = {}
    for r in records:
        for c in r.get("docker_containers", []):
            name = c["name"]
            if name not in container_stats:
                container_stats[name] = {"cpu": [], "mem": []}
            
            # parse cpu_pct
            try:
                cpu_v = float(c["cpu_pct"].replace("%", ""))
                container_stats[name]["cpu"].append(cpu_v)
            except Exception:
                pass
            
            # parse mem_usage e.g. "366.4MiB / 1.861GiB"
            try:
                mem_str = c["mem_usage"].split("/")[0].strip()
                if "MiB" in mem_str:
                    val = float(mem_str.replace("MiB", ""))
                elif "GiB" in mem_str:
                    val = float(mem_str.replace("GiB", "")) * 1024
                elif "KiB" in mem_str:
                    val = float(mem_str.replace("KiB", "")) / 1024
                elif "B" in mem_str:
                    val = float(mem_str.replace("B", "")) / (1024*1024)
                else:
                    val = 0.0
                container_stats[name]["mem"].append(val)
            except Exception:
                pass

    print("--- Docker Container Breakdown ---")
    for name, data in container_stats.items():
        cpus = data["cpu"]
        mems = data["mem"]
        if mems:
            print(f"Container: {name}")
            print(f"  RAM Usage: Min: {min(mems):.1f} MB | Avg: {sum(mems)/len(mems):.1f} MB | Max: {max(mems):.1f} MB")
        if cpus:
            print(f"  CPU Usage: Min: {min(cpus):.2f}% | Avg: {sum(cpus)/len(cpus):.2f}% | Max: {max(cpus):.2f}%")
        print()

if __name__ == "__main__":
    filepath = sys.argv[1] if len(sys.argv) > 1 else LOG_FILE
    parse_logs(filepath)
