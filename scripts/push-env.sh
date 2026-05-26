#!/bin/bash
set -e

echo "Pushing env files to dh:capeetal-tracker..."
scp .env.stg dh:capeetal-tracker/
scp .env.prod dh:capeetal-tracker/
echo "Done."
