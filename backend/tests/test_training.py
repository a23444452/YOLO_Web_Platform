"""Tests for training manager."""

import base64
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, Mock, patch

import pytest

from yolo_api.models import TrainingConfig
from yolo_api.training import TrainingManager


class TestTrainingManager:
    """Test TrainingManager class."""

    def test_init(self, tmp_training_dir: Path) -> None:
        """Test TrainingManager initialization."""
        manager = TrainingManager(work_dir=tmp_training_dir)

        assert manager.work_dir == tmp_training_dir
        assert manager.work_dir.exists()
        assert isinstance(manager.jobs, dict)
        assert isinstance(manager.callbacks, dict)
        assert isinstance(manager._pending_messages, dict)
        assert manager.executor is not None

    def test_register_callback(self, training_manager: TrainingManager) -> None:
        """Test callback registration."""
        job_id = "test_job_123"

        async def mock_callback(message: dict[str, Any]) -> None:
            pass

        # Register first callback
        training_manager.register_callback(job_id, mock_callback)
        assert job_id in training_manager.callbacks
        assert len(training_manager.callbacks[job_id]) == 1

        # Register second callback
        training_manager.register_callback(job_id, mock_callback)
        assert len(training_manager.callbacks[job_id]) == 2

    def test_extract_dataset(
        self, training_manager: TrainingManager, sample_dataset_zip: str
    ) -> None:
        """Test dataset extraction from base64 ZIP."""
        job_dir = training_manager.work_dir / "test_job"
        job_dir.mkdir(parents=True, exist_ok=True)

        # Extract dataset
        dataset_dir = training_manager._extract_dataset(sample_dataset_zip, job_dir)

        # Verify extraction
        assert dataset_dir.exists()
        assert (dataset_dir / "images" / "train" / "img1.jpg").exists()
        assert (dataset_dir / "images" / "train" / "img2.jpg").exists()
        assert (dataset_dir / "images" / "val" / "img3.jpg").exists()
        assert (dataset_dir / "labels" / "train" / "img1.txt").exists()
        assert (dataset_dir / "labels" / "train" / "img2.txt").exists()
        assert (dataset_dir / "labels" / "val" / "img3.txt").exists()
        assert (dataset_dir / "classes.txt").exists()

    def test_create_data_yaml(
        self,
        training_manager: TrainingManager,
        sample_dataset_zip: str,
        sample_config: TrainingConfig,
    ) -> None:
        """Test data.yaml creation for YOLO training."""
        job_dir = training_manager.work_dir / "test_job"
        job_dir.mkdir(parents=True, exist_ok=True)

        # Extract dataset first
        dataset_dir = training_manager._extract_dataset(sample_dataset_zip, job_dir)

        # Create data.yaml
        yaml_path = training_manager._create_data_yaml(dataset_dir, sample_config)

        # Verify YAML file creation
        assert yaml_path.exists()
        assert yaml_path.name == "data.yaml"

        # Read and verify YAML content
        import yaml

        with open(yaml_path) as f:
            data = yaml.safe_load(f)

        assert "path" in data
        assert "train" in data
        assert "val" in data
        assert "nc" in data
        assert "names" in data

        assert data["train"] == "images/train"
        assert data["val"] == "images/val"
        assert data["nc"] == 3  # 3 classes
        assert data["names"] == ["person", "car", "dog"]

    def test_create_data_yaml_missing_classes(
        self, training_manager: TrainingManager, sample_config: TrainingConfig
    ) -> None:
        """Test data.yaml creation fails when classes.txt is missing."""
        job_dir = training_manager.work_dir / "test_job"
        job_dir.mkdir(parents=True, exist_ok=True)

        # Create dataset without classes.txt
        dataset_dir = job_dir / "dataset"
        dataset_dir.mkdir(parents=True, exist_ok=True)

        # Should raise ValueError
        with pytest.raises(ValueError, match="classes.txt not found"):
            training_manager._create_data_yaml(dataset_dir, sample_config)

    @pytest.mark.asyncio
    async def test_notify_callbacks(self, training_manager: TrainingManager) -> None:
        """Test callback notification mechanism."""
        job_id = "test_job_123"
        received_messages: list[dict[str, Any]] = []

        async def mock_callback(message: dict[str, Any]) -> None:
            received_messages.append(message)

        # Register callback
        training_manager.register_callback(job_id, mock_callback)

        # Send notification
        test_message = {"type": "status", "data": {"status": "running"}}
        await training_manager._notify(job_id, test_message)

        # Verify callback was called
        assert len(received_messages) == 1
        assert received_messages[0] == test_message

    @pytest.mark.asyncio
    async def test_notify_callback_error_handling(
        self, training_manager: TrainingManager
    ) -> None:
        """Test callback error handling."""
        job_id = "test_job_123"

        async def failing_callback(message: dict[str, Any]) -> None:
            raise RuntimeError("Callback failed!")

        # Register failing callback
        training_manager.register_callback(job_id, failing_callback)

        # Should not raise exception (errors are caught)
        test_message = {"type": "status", "data": {"status": "running"}}
        await training_manager._notify(job_id, test_message)

    def test_get_status(self, training_manager: TrainingManager) -> None:
        """Test getting training job status."""
        from datetime import datetime

        from yolo_api.models import TrainingStatus

        # Create job status
        job_id = "test_job_123"
        status = TrainingStatus(
            job_id=job_id,
            status="running",
            progress=50.0,
            total_epochs=10,
            current_epoch=5,
            started_at=datetime.now(),
        )
        training_manager.jobs[job_id] = status

        # Get status
        retrieved_status = training_manager.get_status(job_id)
        assert retrieved_status is not None
        assert retrieved_status.job_id == job_id
        assert retrieved_status.status == "running"
        assert retrieved_status.progress == 50.0

        # Get non-existent job
        assert training_manager.get_status("non_existent") is None

    def test_stop_training(self, training_manager: TrainingManager) -> None:
        """Test stopping a training job."""
        from datetime import datetime

        from yolo_api.models import TrainingStatus

        # Create running job
        job_id = "test_job_123"
        status = TrainingStatus(
            job_id=job_id,
            status="running",
            progress=50.0,
            total_epochs=10,
            started_at=datetime.now(),
        )
        training_manager.jobs[job_id] = status

        # Stop training
        success = training_manager.stop_training(job_id)
        assert success is True
        assert training_manager.jobs[job_id].status == "stopped"

        # Try to stop non-existent job
        assert training_manager.stop_training("non_existent") is False

    def test_cleanup_job(
        self, training_manager: TrainingManager, sample_dataset_zip: str
    ) -> None:
        """Test cleaning up a training job."""
        from datetime import datetime

        from yolo_api.models import TrainingStatus

        # Create job with directory
        job_id = "test_job_123"
        job_dir = training_manager.work_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        # Create job status
        status = TrainingStatus(
            job_id=job_id,
            status="completed",
            progress=100.0,
            total_epochs=10,
            started_at=datetime.now(),
        )
        training_manager.jobs[job_id] = status

        # Register callback
        async def mock_callback(message: dict[str, Any]) -> None:
            pass

        training_manager.register_callback(job_id, mock_callback)

        # Verify everything exists
        assert job_dir.exists()
        assert job_id in training_manager.jobs
        assert job_id in training_manager.callbacks

        # Clean up
        training_manager.cleanup_job(job_id)

        # Verify cleanup
        assert not job_dir.exists()
        assert job_id not in training_manager.jobs
        assert job_id not in training_manager.callbacks

    def test_setup_callbacks(
        self, training_manager: TrainingManager, sample_config: TrainingConfig
    ) -> None:
        """Test YOLO callback setup."""
        job_id = "test_job_123"

        callbacks = training_manager._setup_callbacks(job_id, sample_config)

        # Verify callbacks are created
        assert isinstance(callbacks, dict)
        assert "on_train_epoch_end" in callbacks
        assert "on_train_start" in callbacks
        assert callable(callbacks["on_train_epoch_end"])
        assert callable(callbacks["on_train_start"])
