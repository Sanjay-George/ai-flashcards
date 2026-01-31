.PHONY: install start dev clean test help

VENV := .venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
UVICORN := $(VENV)/bin/uvicorn

help:
	@echo "Available commands:"
	@echo "  make install    - Create virtual environment and install dependencies"
	@echo "  make start      - Start the AI service (production mode)"
	@echo "  make dev        - Start the AI service with hot reload (development mode)"
	@echo "  make clean      - Remove virtual environment and cache files"
	@echo "  make test       - Run tests"

install:
	uv venv
	uv pip install -r requirements.txt

start:
	$(PYTHON) main.py

venv:
	source $(VENV)/bin/activate

dev:
	$(UVICORN) main:app --reload --host 0.0.0.0 --port 9052

clean:
	rm -rf $(VENV)
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

test:
	$(PYTHON) -m pytest tests/ -v
