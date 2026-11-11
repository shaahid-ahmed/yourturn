.PHONY: install dev seed test lint typecheck secrets check
install:
	npm ci
dev:
	npm run dev
seed:
	npm run seed
test:
	npm test
lint:
	npm run lint
typecheck:
	npm run typecheck
secrets:
	npm run secrets
check:
	npm run check
