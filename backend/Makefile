.PHONY: help install dev test lint format type-check clean run

help:
	@echo "YOLO Backend - 可用指令："
	@echo "  make install      - 安裝生產依賴"
	@echo "  make dev          - 安裝開發依賴"
	@echo "  make run          - 啟動開發伺服器"
	@echo "  make test         - 執行測試"
	@echo "  make lint         - 執行代碼檢查"
	@echo "  make format       - 格式化代碼"
	@echo "  make type-check   - 執行類型檢查"
	@echo "  make clean        - 清理臨時檔案"

install:
	pip install -r requirements.txt

dev:
	pip install -r requirements-dev.txt

run:
	python -m yolo_api.main

test:
	pytest tests/ -v --cov=src/yolo_api --cov-report=term-missing

lint:
	ruff check src/

format:
	ruff format src/
	ruff check --fix src/

type-check:
	mypy src/ --strict

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	rm -rf dist/ build/

all: format lint type-check test
