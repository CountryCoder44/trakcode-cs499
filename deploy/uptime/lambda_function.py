"""TrakCode uptime check (AWS Lambda, us-east-2, runs every minute).

Loads https://trakcode.com/health and records two CloudWatch metrics in the
TrakCode/Uptime namespace: HealthOk (1 = up, 0 = down) and ResponseTimeMs.
The trakcode-site-down alarm emails the trakcode-alerts topic when HealthOk
stays at 0. See deploy/monitoring.md.
"""
import time
import urllib.request

import boto3

cw = boto3.client("cloudwatch")
URL = "https://trakcode.com/health"


def handler(event, context):
    start = time.time()
    ok = 0
    try:
        req = urllib.request.Request(URL, headers={"User-Agent": "TrakCode-uptime-check"})
        with urllib.request.urlopen(req, timeout=10) as res:
            ok = 1 if res.status == 200 and b'"ok":true' in res.read(200) else 0
    except Exception as e:  # noqa: BLE001 - any failure means "down"
        print("health check failed:", repr(e))
    ms = (time.time() - start) * 1000
    cw.put_metric_data(
        Namespace="TrakCode/Uptime",
        MetricData=[
            {"MetricName": "HealthOk", "Value": ok, "Unit": "Count"},
            {"MetricName": "ResponseTimeMs", "Value": ms, "Unit": "Milliseconds"},
        ],
    )
    return {"ok": ok, "ms": round(ms)}
