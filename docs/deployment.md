# Deployment

```shell
# https://github.com/Wowu/docker-rollout
sudo su ghaction
cd /home/ghaction/capeetal-tracker

# PROD
docker rollout -f docker-compose/docker-compose-prod.yaml --env-file production.env capeetal-tracker-prod
# OR
docker compose --file docker-compose/docker-compose-prod.yaml --env-file production.env up -d

# STG
docker rollout -f docker-compose/docker-compose-stg.yaml --env-file staging.env capeetal-tracker-stg
# OR
docker compose --file docker-compose/docker-compose-stg.yaml --env-file staging.env up -d
```

# Out of space issue
```
docker system prune
```