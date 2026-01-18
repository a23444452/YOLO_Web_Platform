"""Tests for Pydantic models."""

from datetime import datetime

import pytest
from pydantic import ValidationError

from yolo_api.models import (
    AugmentationConfig,
    StartTrainingRequest,
    TrainingConfig,
    TrainingMetrics,
    TrainingStatus,
    WSMessage,
)


class TestTrainingConfig:
    """Test TrainingConfig model."""

    def test_valid_config(self) -> None:
        """Test creating valid training config."""
        config = TrainingConfig(
            name="test_training",
            yolo_version="v8",
            model_size="n",
            dataset_id="test_dataset",
            epochs=10,
            batch_size=16,
            image_size=640,
            device="cpu",
            augmentation=AugmentationConfig(),
        )

        assert config.name == "test_training"
        assert config.yolo_version == "v8"
        assert config.model_size == "n"
        assert config.dataset_id == "test_dataset"
        assert config.epochs == 10
        assert config.batch_size == 16
        assert config.image_size == 640
        assert config.device == "cpu"

    def test_default_values(self) -> None:
        """Test default values in training config."""
        config = TrainingConfig(
            name="test",
            yolo_version="v8",
            model_size="n",
            dataset_id="test_dataset",
            epochs=10,
            augmentation=AugmentationConfig(),
        )

        # Check defaults
        assert config.batch_size == 16
        assert config.image_size == 640
        assert config.device == "cpu"
        assert config.workers == 4
        assert config.optimizer == "Adam"
        assert isinstance(config.augmentation, AugmentationConfig)

    def test_invalid_yolo_version(self) -> None:
        """Test invalid YOLO version raises error."""
        with pytest.raises(ValidationError):
            TrainingConfig(
                name="test",
                yolo_version="v99",  # Invalid version
                model_size="n",
                dataset_id="test",
                epochs=10,
                augmentation=AugmentationConfig(),
            )

    def test_invalid_model_size(self) -> None:
        """Test invalid model size raises error."""
        with pytest.raises(ValidationError):
            TrainingConfig(
                name="test",
                yolo_version="v8",
                model_size="z",  # Invalid size
                dataset_id="test",
                epochs=10,
                augmentation=AugmentationConfig(),
            )

    def test_negative_epochs(self) -> None:
        """Test negative epochs raises error."""
        with pytest.raises(ValidationError):
            TrainingConfig(
                name="test",
                yolo_version="v8",
                model_size="n",
                dataset_id="test",
                epochs=-1,  # Invalid
                augmentation=AugmentationConfig(),
            )


class TestTrainingMetrics:
    """Test TrainingMetrics model."""

    def test_valid_metrics(self) -> None:
        """Test creating valid training metrics."""
        metrics = TrainingMetrics(
            epoch=5,
            train_loss=0.5,
            val_loss=0.6,
            map50=0.85,
            map50_95=0.70,
            precision=0.88,
            recall=0.92,
            learning_rate=0.001,
        )

        assert metrics.epoch == 5
        assert metrics.train_loss == 0.5
        assert metrics.val_loss == 0.6
        assert metrics.map50 == 0.85
        assert metrics.map50_95 == 0.70
        assert metrics.precision == 0.88
        assert metrics.recall == 0.92
        assert metrics.learning_rate == 0.001


class TestTrainingStatus:
    """Test TrainingStatus model."""

    def test_valid_status(self) -> None:
        """Test creating valid training status."""
        now = datetime.now()
        status = TrainingStatus(
            job_id="test_123",
            status="running",
            progress=50.0,
            total_epochs=10,
            current_epoch=5,
            started_at=now,
        )

        assert status.job_id == "test_123"
        assert status.status == "running"
        assert status.progress == 50.0
        assert status.total_epochs == 10
        assert status.current_epoch == 5
        assert status.started_at == now
        assert status.completed_at is None
        assert status.error is None
        assert len(status.metrics) == 0

    def test_invalid_status(self) -> None:
        """Test invalid status value raises error."""
        with pytest.raises(ValidationError):
            TrainingStatus(
                job_id="test_123",
                status="invalid_status",  # Invalid
                progress=0.0,
                total_epochs=10,
                started_at=datetime.now(),
            )

    def test_json_serialization(self) -> None:
        """Test JSON serialization with datetime."""
        now = datetime.now()
        status = TrainingStatus(
            job_id="test_123",
            status="completed",
            progress=100.0,
            total_epochs=10,
            started_at=now,
            completed_at=now,
        )

        # Should serialize without error
        json_data = status.model_dump(mode="json")
        assert isinstance(json_data["started_at"], str)
        assert isinstance(json_data["completed_at"], str)


class TestWSMessage:
    """Test WSMessage model."""

    def test_valid_ws_message(self) -> None:
        """Test creating valid WebSocket message."""
        message = WSMessage(
            type="status",
            job_id="test_123",
            data={"status": "running", "progress": 50.0},
        )

        assert message.type == "status"
        assert message.job_id == "test_123"
        assert isinstance(message.data, dict)

    def test_ws_message_with_string_data(self) -> None:
        """Test WebSocket message with string data."""
        message = WSMessage(
            type="log",
            job_id="test_123",
            data="Training started",
        )

        assert message.type == "log"
        assert message.data == "Training started"

    def test_invalid_message_type(self) -> None:
        """Test invalid message type raises error."""
        with pytest.raises(ValidationError):
            WSMessage(
                type="invalid_type",  # Invalid
                job_id="test_123",
                data=None,
            )


class TestStartTrainingRequest:
    """Test StartTrainingRequest model."""

    def test_valid_request(self, sample_config: TrainingConfig) -> None:
        """Test creating valid training request."""
        request = StartTrainingRequest(
            config=sample_config,
            dataset_zip="base64_encoded_data",
        )

        assert request.config == sample_config
        assert request.dataset_zip == "base64_encoded_data"


class TestAugmentationConfig:
    """Test AugmentationConfig model."""

    def test_default_augmentation(self) -> None:
        """Test default augmentation config."""
        config = AugmentationConfig()

        assert config.mosaic is True
        assert config.mixup is False
        assert config.rotation == 0.0
        assert config.hsv_h == 0.015
        assert config.hsv_s == 0.7
        assert config.hsv_v == 0.4
        assert config.translate == 0.1
        assert config.scale == 0.5
        assert config.flip_horizontal is True
        assert config.flip_vertical is False

    def test_custom_augmentation(self) -> None:
        """Test custom augmentation config."""
        config = AugmentationConfig(
            mosaic=False,
            mixup=True,
            rotation=15.0,
            flip_vertical=True,
        )

        assert config.mosaic is False
        assert config.mixup is True
        assert config.rotation == 15.0
        assert config.flip_vertical is True
