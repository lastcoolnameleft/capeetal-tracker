# Development

```shell
# local start
npm start
# or
nodemon
# or 
docker compose  -f docker-compose/docker-compose-dev.yaml up --build
```


# Images

```
# I have no idea why Google charts makes it 556 pixels wide.  
magick public/images/share/capeetal_lookatmemap.png -resize 556 data/map/background.png
```

# Pull DB locally

```
ssh dh -f "sqlite3 /data/capeetal-tracker-prod/db/us.db  \".backup 'backup/us.db'\""

scp dh:backup/us.db data/db/us.db

sqlite3 data/db/us.db "select count(*) from locations;"

```