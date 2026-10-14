# Monitoring and alerts (production)

All alerts email **support@trakcode.com** through the SNS topic
`trakcode-alerts` (us-east-2). The subscription has to be confirmed once from
the email AWS sends. Each alarm also sends an "OK" email when it recovers.

| Alarm | Fires when | What happens automatically |
|---|---|---|
| `trakcode-site-down` | https://trakcode.com/health fails 3 checks in a row (checked every minute) | Email |
| `trakcode-server-errors` | 5 or more server errors in 5 minutes | Email |
| `trakcode-ec2-system-check` | AWS hardware or host problem under the server | Server is moved to healthy hardware (EC2 recover), plus email |
| `trakcode-ec2-instance-check` | The server's OS stops responding | Server reboots, plus email |

## Uptime check

The account's org policy blocks us-east-1, where Route 53 health-check alarms
live, so the check is a small Lambda in us-east-2 instead:

- Function `trakcode-uptime` (source: `deploy/uptime/lambda_function.py`), run
  every minute by the EventBridge rule `trakcode-uptime-every-minute`.
- It writes `TrakCode/Uptime` metrics: `HealthOk` (1 up, 0 down) and
  `ResponseTimeMs`. No data counts as down.

To change the code: zip `lambda_function.py`, upload it to
`s3://<deploy-bucket>/monitoring/uptime.zip`, then update the
function code from that object.

## Logs

The `web`, `api` and `sandbox` containers send their output to CloudWatch Logs
through Docker's `awslogs` driver (see `docker-compose.yml`). Logs are kept
**30 days** in the `/trakcode/web`, `/trakcode/api` and `/trakcode/sandbox`
log groups. `docker compose logs` on the server still works too.

Server errors are counted from two one-line markers the API prints
(`server/src/middleware/errorHandler.ts`):

- `UNHANDLED_ERROR <method> <path>`: a bug or unexpected failure (HTTP 500).
  The full error follows on the next lines.
- `SERVICE_UNAVAILABLE <method> <path> <error>`: a dependency is down, such as
  the AI provider or the code sandbox (HTTP 503).

The `server-errors` metric filter on `/trakcode/api` turns these markers into
the `TrakCode/Api` `ServerErrors` metric.

To find what went wrong, open CloudWatch Logs Insights on `/trakcode/api` and run:

```
fields @timestamp, @message
| filter @message like /UNHANDLED_ERROR|SERVICE_UNAVAILABLE/
| sort @timestamp desc
| limit 50
```

## Backups

Data Lifecycle Manager snapshots the server's disk daily and keeps 7. The disk
includes MongoDB's data at `/srv/trakcode/mongo`. Restore steps, and the date
of the last restore test, are in `deploy/restore.md`.
