#!/usr/bin/env python3
import json
import subprocess
import time
import datetime
import os
import urllib.request

LOG_FILE = "/home/ubuntu/minimalist_home_library/logs/resource_usage_24h.jsonl"

def get_system_stats():
    # Load average
    with open("/proc/loadavg", "r") as f:
        parts = f.read().strip().split()
        load_1, load_5, load_15 = float(parts[0]), float(parts[1]), float(parts[2])

    # Memory info
    meminfo = {}
    with open("/proc/meminfo", "r") as f:
        for line in f:
            fields = line.split(":")
            if len(fields) == 2:
                key = fields[0].strip()
                val = fields[1].strip().split()[0]
                meminfo[key] = int(val) * 1024  # bytes

    total_mem = meminfo.get("MemTotal", 0)
    free_mem = meminfo.get("MemFree", 0)
    avail_mem = meminfo.get("MemAvailable", 0)
    buffers = meminfo.get("Buffers", 0)
    cached = meminfo.get("Cached", 0)
    used_mem = total_mem - avail_mem

    # vmstat for CPU percentages
    try:
        vmstat_out = subprocess.check_output(["vmstat", "1", "2"]).decode("utf-8").strip().split("\n")
        last_line = vmstat_out[-1].split()
        # vmstat output columns: r b swpd free buff cache si so bi bo in cs us sy id wa st
        us, sy, id_cpu, wa, st = int(last_line[12]), int(last_line[13]), int(last_line[14]), int(last_line[15]), int(last_line[16])
    except Exception:
        us, sy, id_cpu, wa, st = 0, 0, 100, 0, 0

    # iostat for Disk I/O
    tps, read_kb_s, write_kb_s = 0.0, 0.0, 0.0
    try:
        iostat_out = subprocess.check_output(["iostat", "-d", "1", "2"]).decode("utf-8").strip().split("\n")
        # Find device summary line
        for line in reversed(iostat_out):
            parts = line.split()
            if len(parts) >= 6 and parts[0] not in ("Device", "Linux", ""):
                try:
                    tps = float(parts[1])
                    read_kb_s = float(parts[2])
                    write_kb_s = float(parts[3])
                    break
                except ValueError:
                    continue
    except Exception:
        pass

    return {
        "load_avg": {"1m": load_1, "5m": load_5, "15m": load_15},
        "memory": {
            "total_bytes": total_mem,
            "used_bytes": used_mem,
            "free_bytes": free_mem,
            "available_bytes": avail_mem,
            "buffers_bytes": buffers,
            "cached_bytes": cached,
            "used_pct": round((used_mem / total_mem) * 100, 2) if total_mem > 0 else 0
        },
        "cpu_pct": {
            "user": us,
            "system": sy,
            "idle": id_cpu,
            "iowait": wa,
            "steal": st
        },
        "disk_io": {
            "tps": tps,
            "read_kb_s": read_kb_s,
            "write_kb_s": write_kb_s
        }
    }

def get_docker_stats():
    containers = []
    try:
        cmd = ["docker", "stats", "--no-stream", "--format", "{{.ID}}|{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}|{{.BlockIO}}|{{.PIDs}}"]
        output = subprocess.check_output(cmd).decode("utf-8").strip()
        if output:
            for line in output.split("\n"):
                parts = line.split("|")
                if len(parts) == 8:
                    containers.append({
                        "id": parts[0],
                        "name": parts[1],
                        "cpu_pct": parts[2],
                        "mem_usage": parts[3],
                        "mem_pct": parts[4],
                        "net_io": parts[5],
                        "block_io": parts[6],
                        "pids": parts[7]
                    })
    except Exception as e:
        print(f"Error getting docker stats: {e}")
    return containers

def check_hausbibliothek_port():
    status = {"port_8080": "DOWN", "latency_ms": None}
    start = time.time()
    try:
        req = urllib.request.Request("http://localhost:8080/", headers={"User-Agent": "ResourceMonitor/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            elapsed = (time.time() - start) * 1000
            status["port_8080"] = f"UP_{resp.status}"
            status["latency_ms"] = round(elapsed, 2)
    except Exception as e:
        status["error"] = str(e)
    return status

def main():
    record = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "system": get_system_stats(),
        "docker_containers": get_docker_stats(),
        "health": check_hausbibliothek_port()
    }
    
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(record) + "\n")
    
    print(f"[{record['timestamp']}] Logged resource metrics successfully.")

if __name__ == "__main__":
    main()
