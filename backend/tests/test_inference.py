"""Tests for inference functionality."""

import base64
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest
from httpx import AsyncClient

from yolo_api.exceptions import (
    InferenceError,
    ModelFileNotFoundError,
    ModelNotFoundError,
    ModelNotReadyError,
)
from yolo_api.inference import InferenceManager
from yolo_api.models import BoundingBox, Detection, InferenceResponse, ModelInfo


class TestInferenceManager:
    """Test InferenceManager class."""

    def test_init(self) -> None:
        """Test InferenceManager initialization."""
        manager = InferenceManager()

        assert manager.models == {}
        assert manager.model_info == {}

    @pytest.mark.asyncio
    async def test_load_model_not_found(self, tmp_path: Path) -> None:
        """Test loading non-existent model."""
        manager = InferenceManager()

        with patch("yolo_api.inference.settings") as mock_settings:
            mock_settings.training_dir = tmp_path
            with pytest.raises(ModelNotFoundError) as exc_info:
                manager.load_model("nonexistent_model")

            assert "nonexistent_model" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_load_model_file_not_found(self, tmp_path: Path) -> None:
        """Test loading model when model file doesn't exist."""
        manager = InferenceManager()
        model_dir = tmp_path / "test_model"
        model_dir.mkdir()

        with patch("yolo_api.inference.settings") as mock_settings:
            mock_settings.training_dir = tmp_path
            with pytest.raises(ModelFileNotFoundError):
                manager.load_model("test_model")

    @pytest.mark.asyncio
    async def test_load_model_success(self, tmp_path: Path) -> None:
        """Test successful model loading."""
        manager = InferenceManager()
        model_dir = tmp_path / "test_model"
        weights_dir = model_dir / "weights"
        weights_dir.mkdir(parents=True)

        # Create dummy model file
        model_path = weights_dir / "best.pt"
        model_path.touch()

        # Create data.yaml
        data_yaml = model_dir / "data.yaml"
        data_yaml.write_text("names: ['person', 'car', 'dog']")

        with patch("yolo_api.inference.settings") as mock_settings:
            mock_settings.training_dir = tmp_path
            with patch("ultralytics.YOLO") as mock_yolo:
                mock_model = Mock()
                mock_yolo.return_value = mock_model

                manager.load_model("test_model")

                assert "test_model" in manager.models
                assert "test_model" in manager.model_info
                assert manager.model_info["test_model"].classes == [
                    "person",
                    "car",
                    "dog",
                ]

    def test_unload_model(self) -> None:
        """Test model unloading."""
        manager = InferenceManager()

        # Add a mock model
        mock_model = Mock()
        manager.models["test_model"] = mock_model
        manager.model_info["test_model"] = ModelInfo(
            model_id="test_model",
            name="Test Model",
            yolo_version="v8",
            model_size="n",
            classes=["class1"],
            created_at="2024-01-01T00:00:00",  # type: ignore
        )

        manager.unload_model("test_model")

        assert "test_model" not in manager.models
        assert "test_model" not in manager.model_info

    def test_infer_model_not_loaded(self) -> None:
        """Test inference with model not loaded."""
        manager = InferenceManager()

        with pytest.raises(ModelNotFoundError):
            manager.infer("nonexistent_model", "base64_image", 0.25, 0.45)

    @pytest.mark.asyncio
    async def test_infer_success(self) -> None:
        """Test successful inference."""
        manager = InferenceManager()

        # Create mock model
        mock_model = Mock()
        mock_result = Mock()

        # Mock detection box
        mock_box = Mock()
        mock_box.cls = [0]  # class_id
        mock_box.conf = [0.95]  # confidence
        mock_box.xyxy = [Mock()]
        mock_box.xyxy[0].cpu.return_value.numpy.return_value = [10, 20, 100, 200]

        mock_result.boxes = [mock_box]
        mock_model.predict.return_value = [mock_result]

        manager.models["test_model"] = mock_model
        manager.model_info["test_model"] = ModelInfo(
            model_id="test_model",
            name="Test Model",
            yolo_version="v8",
            model_size="n",
            classes=["person", "car"],
            created_at="2024-01-01T00:00:00",  # type: ignore
        )

        # Create a simple test image (1x1 red pixel)
        from PIL import Image

        img = Image.new("RGB", (1, 1), color="red")
        from io import BytesIO

        buffer = BytesIO()
        img.save(buffer, format="PNG")
        img_base64 = base64.b64encode(buffer.getvalue()).decode()

        result = manager.infer("test_model", img_base64, 0.25, 0.45)

        assert isinstance(result, InferenceResponse)
        assert len(result.detections) == 1
        assert result.detections[0].class_id == 0
        assert result.detections[0].class_name == "person"
        assert result.detections[0].confidence == 0.95
        assert result.inference_time > 0

    def test_list_models_empty(self, tmp_path: Path) -> None:
        """Test listing models when no models exist."""
        manager = InferenceManager()

        with patch("yolo_api.inference.settings") as mock_settings:
            mock_settings.training_dir = tmp_path
            models = manager.list_models()

            assert models == []

    def test_list_models_with_models(self, tmp_path: Path) -> None:
        """Test listing available models."""
        manager = InferenceManager()

        # Create mock model directory
        model_dir = tmp_path / "model1"
        weights_dir = model_dir / "weights"
        weights_dir.mkdir(parents=True)

        model_path = weights_dir / "best.pt"
        model_path.touch()

        data_yaml = model_dir / "data.yaml"
        data_yaml.write_text("names: ['cat', 'dog']")

        with patch("yolo_api.inference.settings") as mock_settings:
            mock_settings.training_dir = tmp_path
            models = manager.list_models()

            assert len(models) == 1
            assert models[0].model_id == "model1"
            assert models[0].classes == ["cat", "dog"]


class TestInferenceAPI:
    """Test inference API endpoints."""

    @pytest.mark.asyncio
    async def test_list_models_endpoint(self, async_client: AsyncClient) -> None:
        """Test GET /api/inference/models endpoint."""
        response = await async_client.get("/api/inference/models")

        assert response.status_code == 200
        data = response.json()
        assert "models" in data
        assert "total" in data
        assert isinstance(data["models"], list)

    @pytest.mark.asyncio
    async def test_load_model_endpoint_not_found(
        self, async_client: AsyncClient
    ) -> None:
        """Test POST /api/inference/load/{model_id} with non-existent model."""
        response = await async_client.post("/api/inference/load/nonexistent")

        assert response.status_code == 404
        data = response.json()
        assert data["error"] == "ModelNotFoundError"

    @pytest.mark.asyncio
    async def test_unload_model_endpoint(self, async_client: AsyncClient) -> None:
        """Test POST /api/inference/unload/{model_id} endpoint."""
        response = await async_client.post("/api/inference/unload/some_model")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    @pytest.mark.asyncio
    async def test_predict_endpoint_model_not_found(
        self, async_client: AsyncClient
    ) -> None:
        """Test POST /api/inference/predict with non-existent model."""
        request_data = {
            "model_id": "nonexistent",
            "image": "fake_base64_image",
            "confidence": 0.25,
            "iou": 0.45,
        }

        response = await async_client.post("/api/inference/predict", json=request_data)

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_predict_endpoint_validation_error(
        self, async_client: AsyncClient
    ) -> None:
        """Test POST /api/inference/predict with invalid data."""
        request_data = {
            "model_id": "test",
            "image": "base64_image",
            "confidence": 1.5,  # Invalid: > 0.99
            "iou": 0.45,
        }

        response = await async_client.post("/api/inference/predict", json=request_data)

        assert response.status_code == 422
        data = response.json()
        assert data["error"] == "ValidationError"
