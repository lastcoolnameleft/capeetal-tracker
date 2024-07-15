# Deployment

```shell
# https://github.com/Wowu/docker-rollout
sudo su ghaction
cd /home/ghaction/capeetal-tracker

# STG
docker rollout -f docker-compose-stg.yaml --env-file staging.env capeetal-tracker-stg
# OR
docker compose --file docker-compose-stg.yaml --env-file staging.env up -d

# PROD
docker rollout -f docker-compose-prod.yaml --env-file production.env capeetal-tracker-prod
# OR
docker compose --file docker-compose-prod.yaml --env-file production.env up -d
```