# Deployment

```shell
# https://github.com/Wowu/docker-rollout
docker rollout -f ./docker-compose.yaml capeetal-tracker-prod

docker compose --file ~/capeetal-tracker/docker-compose.yaml up -d

docker compose --file ~/capeetal-tracker/docker-compose.yaml down
```
