#!/bin/bash
set -e
git pull && sudo docker compose up -d --build
