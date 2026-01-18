"""Simple test script for YOLO training API."""

import asyncio
import base64
import json
from pathlib import Path

import httpx


async def test_api():
    """Test the training API."""
    base_url = "http://localhost:8000"

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Test health endpoint
        print("Testing health endpoint...")
        response = await client.get(f"{base_url}/health")
        print(f"Health: {response.json()}\n")

        # Test root endpoint
        print("Testing root endpoint...")
        response = await client.get(f"{base_url}/")
        print(f"Root: {response.json()}\n")

        print("API is running successfully!")
        print("\nTo test training, you need to:")
        print("1. Prepare a dataset ZIP with this structure:")
        print("   dataset.zip/")
        print("   ├── classes.txt")
        print("   ├── images/")
        print("   │   ├── train/")
        print("   │   └── val/")
        print("   └── labels/")
        print("       ├── train/")
        print("       └── val/")
        print("\n2. Use the frontend or make a POST request to /api/training/start")


if __name__ == "__main__":
    asyncio.run(test_api())
