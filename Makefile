.PHONY: dev down

dev:
	sudo docker compose -f docker-compose.dev.yml up --build

down:
	sudo docker compose -f docker-compose.dev.yml down
