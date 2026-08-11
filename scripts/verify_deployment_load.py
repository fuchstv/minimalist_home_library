#!/usr/bin/env python3
import time
import subprocess
import threading
import json
import os
import shutil

SAMPLE_INTERVAL = 0.1  # 100ms sampling

class ResourceMonitor:
    def __init__(self):
        self.running = False
        self.samples = []
        self._thread = None

    def _get_cpu_mem(self):
        meminfo = {}
        with open("/proc/meminfo", "r") as f:
            for line in f:
                fields = line.split(":")
                if len(fields) == 2:
                    meminfo[fields[0].strip()] = int(fields[1].strip().split()[0]) * 1024
        
        used_mem_mb = (meminfo.get("MemTotal", 0) - meminfo.get("MemAvailable", 0)) / (1024 * 1024)

        with open("/proc/stat", "r") as f:
            fields = f.readline().split()[1:]
            cpu_times = [float(x) for x in fields[:7]]
            idle_time = cpu_times[3] + cpu_times[4]
            total_time = sum(cpu_times)
        
        return total_time, idle_time, used_mem_mb

    def _monitor_loop(self):
        t1, i1, m1 = self._get_cpu_mem()
        while self.running:
            time.sleep(SAMPLE_INTERVAL)
            t2, i2, m2 = self._get_cpu_mem()
            dt = t2 - t1
            di = i2 - i1
            cpu_pct = round(((dt - di) / dt) * 100, 2) if dt > 0 else 0.0
            self.samples.append({
                "cpu_pct": cpu_pct,
                "mem_mb": round(m2, 2)
            })
            t1, i1, m1 = t2, i2, m2

    def start(self):
        self.running = True
        self.samples = []
        self._thread = threading.Thread(target=self._monitor_loop)
        self._thread.daemon = True
        self._thread.start()

    def stop(self):
        self.running = False
        if self._thread:
            self._thread.join()

    def get_summary(self):
        if not self.samples:
            return {"avg_cpu": 0, "max_cpu": 0, "avg_mem": 0, "max_mem": 0}
        cpus = [s["cpu_pct"] for s in self.samples]
        mems = [s["mem_mb"] for s in self.samples]
        return {
            "avg_cpu": round(sum(cpus) / len(cpus), 2),
            "max_cpu": round(max(cpus), 2),
            "avg_mem": round(sum(mems) / len(mems), 2),
            "max_mem": round(max(mems), 2),
            "sample_count": len(self.samples)
        }

def test_rsync_deployment():
    src_dir = "/home/ubuntu/minimalist_home_library/frontend"
    dst_dir = "/tmp/rsync_deploy_simulation"
    os.makedirs(dst_dir, exist_ok=True)

    monitor = ResourceMonitor()
    monitor.start()
    
    start_time = time.time()
    # Simulate realistic rsync deployment of assets over 5 sync passes
    for _ in range(10):
        subprocess.run(["rsync", "-avz", "--delete", "--exclude=node_modules", f"{src_dir}/", dst_dir], capture_output=True, text=True)
        time.sleep(0.2)
    duration = time.time() - start_time
    
    monitor.stop()
    summary = monitor.get_summary()
    summary["duration_sec"] = round(duration, 3)
    
    shutil.rmtree(dst_dir, ignore_errors=True)
    return summary

def test_onhost_build():
    monitor = ResourceMonitor()
    monitor.start()
    
    start_time = time.time()
    # Simulate local build on host
    res = subprocess.run(["npm", "run", "build"], cwd="/home/ubuntu/minimalist_home_library/frontend", capture_output=True, text=True)
    duration = time.time() - start_time
    
    monitor.stop()
    summary = monitor.get_summary()
    summary["duration_sec"] = round(duration, 3)
    summary["exit_code"] = res.returncode
    return summary

def main():
    print("=== Deploy Load Verification Benchmark ===")
    print("1. Measuring Baseline Idle System Load...")
    base_monitor = ResourceMonitor()
    base_monitor.start()
    time.sleep(3.0)
    base_monitor.stop()
    base_summary = base_monitor.get_summary()
    print(f"   Baseline System RAM: {base_summary['avg_mem']} MB | Baseline System CPU: {base_summary['avg_cpu']}%\n")

    print("2. Scenario A: GitHub Actions Remote Build + rsync Transfer (Phase 7 Pattern)...")
    rsync_res = test_rsync_deployment()
    print(f"   Duration: {rsync_res['duration_sec']}s")
    print(f"   CPU Usage  - Avg: {rsync_res['avg_cpu']}% | Peak: {rsync_res['max_cpu']}%")
    print(f"   RAM Usage  - Avg: {rsync_res['avg_mem']} MB | Peak: {rsync_res['max_mem']} MB")
    print(f"   Net CPU Load during rsync: {round(max(0, rsync_res['avg_cpu'] - base_summary['avg_cpu']), 2)}%\n")

    print("3. Scenario B: On-Host Build (Local npm run build on Lightsail)...")
    build_res = test_onhost_build()
    print(f"   Duration: {build_res['duration_sec']}s")
    print(f"   CPU Usage  - Avg: {build_res['avg_cpu']}% | Peak: {build_res['max_cpu']}%")
    print(f"   RAM Usage  - Avg: {build_res['avg_mem']} MB | Peak: {build_res['max_mem']} MB")
    print(f"   Net CPU Load during local build: {round(max(0, build_res['avg_cpu'] - base_summary['avg_cpu']), 2)}%\n")

    net_rsync_cpu = round(max(0, rsync_res['avg_cpu'] - base_summary['avg_cpu']), 2)
    net_build_cpu = round(max(0, build_res['avg_cpu'] - base_summary['avg_cpu']), 2)

    print("=== Empirical Benchmark Results Summary ===")
    print(f"{'Metric':<35} | {'GitHub Actions rsync (Phase 7)':<30} | {'On-Host Local Build':<25}")
    print("-" * 95)
    print(f"{'Total Duration':<35} | {str(rsync_res['duration_sec']) + ' s':<30} | {str(build_res['duration_sec']) + ' s':<25}")
    print(f"{'Peak System CPU':<35} | {str(rsync_res['max_cpu']) + ' %':<30} | {str(build_res['max_cpu']) + ' %':<25}")
    print(f"{'Average System CPU':<35} | {str(rsync_res['avg_cpu']) + ' %':<30} | {str(build_res['avg_cpu']) + ' %':<25}")
    print(f"{'Net CPU Load Added over Baseline':<35} | {str(net_rsync_cpu) + ' %':<30} | {str(net_build_cpu) + ' %':<25}")
    print(f"{'Peak RAM Usage':<35} | {str(rsync_res['max_mem']) + ' MB':<30} | {str(build_res['max_mem']) + ' MB':<25}")
    print("-" * 95)

    report = {
        "baseline": base_summary,
        "github_actions_rsync": rsync_res,
        "onhost_build": build_res,
        "net_rsync_cpu_pct": net_rsync_cpu,
        "net_build_cpu_pct": net_build_cpu
    }
    with open("/home/ubuntu/minimalist_home_library/logs/deploy_verification_report.json", "w") as f:
        json.dump(report, f, indent=2)

if __name__ == "__main__":
    main()
