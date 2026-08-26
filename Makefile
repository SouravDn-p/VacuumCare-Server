startproject:
	@docker run --rm -v ${PWD}:/app -w /app python:3.13-slim sh -c "pip install Django && django-admin startproject crossc1 ."



ps:
	@docker ps

cps:
	@docker compose ps

logs:
	@echo "docker compose logs -f"
	@docker compose logs -f
	
down:
	@echo "docker compose down"
	@echo "Stopping all services..."
	@docker compose down

build-compose:
	@echo "docker compose build"
	@echo "Building Docker ..."
	@docker compose build

build:
	@echo "Building Docker vacuumcare..."
	@docker compose up --build -d

bp:
	@docker build -t souravdebanth/vacuumcare-backend:latest .
	@docker push souravdebanth/vacuumcare-backend:latest

cache:
	@echo "docker compose build --no-cache"
	@echo "Clearing Docker build cache..."
	@docker compose build --no-cache

up:
	@echo "docker compose up -d"
	@echo "Starting all services..."
	@docker compose up -d

restart:
	@docker restart crossc1_web_server

bash:
	@docker exec -it crossc1_web_server bash

images:
	@docker images

pull:
	@docker pull souravdebanth/vacuumcare-backend:latest

push:
	@docker push souravdebanth/vacuumcare-backend:latest

mm:
	@docker exec -it vaccume-server npx prisma migrate dev

studio:
	@docker exec -it vaccume-server npx prisma studio

mig:
	@docker exec vaccume-server npx prisma migrate dev
	@docker exec vaccume-server npx prisma migrate deploy

sm:
	@docker exec -it vaccume-server 

net:
	@netstat -ano | findstr :9000

all: down build up logs


clean:
	docker stop $$(docker ps -aq) 2>/dev/null || true
	docker rm $$(docker ps -aq) 2>/dev/null || true
	docker rmi -f $$(docker images -aq) 2>/dev/null || true
	docker volume rm $$(docker volume ls -q) 2>/dev/null || true
	docker network prune -f

# Git helpers
cm ?= Update code

git:
	git add .
	git status
	git commit -m "$(cm)"
	git log -1 --graph --oneline
	git push origin main

	