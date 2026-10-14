# Restoring from a backup

Backups are daily EBS snapshots of the server's whole disk, kept for 7 days
(Data Lifecycle Manager policy `policy-044a29ab2e47fa45f`, volumes tagged
`Backup=daily`). MongoDB's data lives on that disk at `/srv/trakcode/mongo`, so
each snapshot holds the full database as of that moment.

## Last restore test: 2026-10-11 (passed)

The snapshot `snap-0e3b482bbfec3a7ff` (taken 2026-10-10 07:05 UTC) was restored on a
temporary server, not the production one. MongoDB 7 started cleanly on the
copied data files, and `trakcode_prod` contained what production held at that
time:
- 3 users
- 43 Sequential Curriculum topics
- 2 email entitlements
- 4 notifications

The temporary server, its disk and its security group were deleted afterwards.
Repeat this test after any change to how the database is stored.

## Inspect or recover data without touching production

Use this to check a backup, or to pull back a few deleted records.

1. In EC2, pick the snapshot under **Snapshots** (newest first, or the one from
   before the problem). Create a volume from it in `us-east-2a`.
2. Launch a temporary `t3.small` from the same Ubuntu AMI in the same subnet.
   Give it the `trakcode-ec2` instance profile (for SSM) and a security group
   with no inbound rules. Its user data installs Docker:
   `apt-get update && apt-get install -y docker.io`
3. Attach the volume as `/dev/sdf`. Then, through SSM Run Command on the
   temporary server:
   ```sh
   PART=$(lsblk -lpno NAME,FSTYPE /dev/nvme1n1 | awk '$2=="ext4"{print $1; exit}')
   mkdir -p /mnt/restore && mount -o ro,noload "$PART" /mnt/restore
   cp -a /mnt/restore/srv/trakcode/mongo /var/tmp/mongo-restore
   docker run -d --name restore-mongo -v /var/tmp/mongo-restore:/data/db mongo:7 --wiredTigerCacheSizeGB 0.25
   docker exec restore-mongo mongosh --quiet trakcode_prod --eval 'db.getCollectionNames().forEach(c=>print(c, db[c].countDocuments()))'
   ```
   Without `MONGO_INITDB_*` variables the restored copy runs without auth, so
   `mongosh` works directly. The copy is safe to query or `mongoexport` from.
4. Afterwards, terminate the temporary server, then delete the volume and the
   security group.

## Roll the whole server back (disaster recovery)

Use this only if the production disk itself is lost or corrupted. It discards
everything written since the snapshot.

1. Stop the production instance (`<instance-id>`).
2. Create a volume from the chosen snapshot in `us-east-2a`.
3. Detach the current root volume. Keep it until you're sure: don't delete it.
4. Attach the restored volume as the root device (`/dev/sda1`).
5. Start the instance. The Elastic IP and DNS stay the same, and Docker brings
   the containers back up on boot (`restart: unless-stopped`).
6. Check `https://trakcode.com/health`, then run
   `bash /srv/trakcode/current/deploy/healthcheck.sh` through SSM.
7. Redeploy the current release (`bash deploy/deploy.sh`) if the snapshot
   predates it.
