.PHONY: install dev seed test lint lint-openapi typecheck secrets check
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
lint-openapi:
	npm run lint:openapi
typecheck:
	npm run typecheck
secrets:
	npm run secrets
check:
	npm run check
