```
sqlite3 us.db

CREATE TABLE locations (
   session CHAR(36) PRIMARY KEY NOT NULL,
   last_update DATETIME NOT NULL,
   locations TEXT NOT NULL
);

```