# Deployment

```shell
# https://github.com/Wowu/docker-rollout
sudo su ghaction
cd /home/ghaction/capeetal-tracker
docker compose --file docker-compose-stg.yaml --env-file staging.env up
# OR
docker rollout -f docker-compose-stg.yaml --env-file staging.env capeetal-tracker-stg

docker rollout -f ./docker-compose.yaml capeetal-tracker-prod

docker compose --file ~/capeetal-tracker/docker-compose.yaml up -d

docker compose --file ~/capeetal-tracker/docker-compose.yaml down
```
