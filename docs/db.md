# Create schema

```
sqlite3 us.db

CREATE TABLE locations (
   session CHAR(36) PRIMARY KEY NOT NULL,
   last_update DATETIME NOT NULL,
   locations TEXT NOT NULL
);

```

# Backup

```
ssh dh -f "sqlite3 /data/capeetal-tracker-prod/db/us.db  \".backup 'backup/us.db'\""

scp dh:backup/us.db data/backup/

sqlite3 data/backup/us.db "select count(*) from locations;"

```