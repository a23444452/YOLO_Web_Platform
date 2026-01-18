"""Pytest configuration and shared fixtures."""

import base64
import tempfile
import zipfile
from pathlib import Path
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from yolo_api.main import app
from yolo_api.models import TrainingConfig
from yolo_api.training import TrainingManager


@pytest.fixture
def tmp_training_dir() -> Path:
    """Create temporary training directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def training_manager(tmp_training_dir: Path) -> TrainingManager:
    """Create training manager instance with temporary directory."""
    return TrainingManager(work_dir=tmp_training_dir)


@pytest.fixture
def sample_config() -> TrainingConfig:
    """Create sample training config."""
    from yolo_api.models import AugmentationConfig

    return TrainingConfig(
        name="test_training",
        yolo_version="v8",
        model_size="n",
        dataset_id="test_dataset_123",
        epochs=3,
        batch_size=16,
        image_size=640,
        device="cpu",
        augmentation=AugmentationConfig(),
    )


@pytest.fixture
def sample_dataset_zip() -> str:
    """Create sample dataset ZIP in base64."""
    # Create temporary ZIP file
    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_zip:
        zip_path = Path(tmp_zip.name)

    try:
        # Create ZIP with dataset structure
        with zipfile.ZipFile(zip_path, "w") as zf:
            # Add classes.txt
            zf.writestr("classes.txt", "person\ncar\ndog\n")

            # Add sample images (fake data)
            zf.writestr("images/train/img1.jpg", b"fake image data 1")
            zf.writestr("images/train/img2.jpg", b"fake image data 2")
            zf.writestr("images/val/img3.jpg", b"fake image data 3")

            # Add sample labels
            zf.writestr("labels/train/img1.txt", "0 0.5 0.5 0.1 0.1\n")
            zf.writestr("labels/train/img2.txt", "1 0.3 0.3 0.2 0.2\n")
            zf.writestr("labels/val/img3.txt", "2 0.7 0.7 0.15 0.15\n")

        # Read and encode to base64
        with open(zip_path, "rb") as f:
            zip_data = base64.b64encode(f.read()).decode()

        return zip_data

    finally:
        # Clean up
        if zip_path.exists():
            zip_path.unlink()


@pytest.fixture
async def async_client() -> AsyncClient:
    """Create async HTTP client for testing API."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
