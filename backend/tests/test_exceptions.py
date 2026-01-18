"""Tests for custom exceptions."""

import pytest
from httpx import AsyncClient

from yolo_api.exceptions import (
    DatasetExtractionError,
    DatasetValidationError,
    ModelFileNotFoundError,
    ModelNotReadyError,
    ResourceLimitError,
    TrainingConfigError,
    TrainingNotFoundError,
    TrainingStopError,
    YOLOAPIException,
)


class TestYOLOAPIException:
    """Test base YOLOAPIException class."""

    def test_default_exception(self) -> None:
        """Test exception with default status code."""
        exc = YOLOAPIException("Test error")
        assert exc.message == "Test error"
        assert exc.status_code == 500
        assert str(exc) == "Test error"

    def test_custom_status_code(self) -> None:
        """Test exception with custom status code."""
        exc = YOLOAPIException("Test error", status_code=400)
        assert exc.message == "Test error"
        assert exc.status_code == 400


class TestTrainingNotFoundError:
    """Test TrainingNotFoundError exception."""

    def test_exception_message(self) -> None:
        """Test exception message formatting."""
        exc = TrainingNotFoundError("job123")
        assert exc.job_id == "job123"
        assert exc.status_code == 404
        assert "job123" in exc.message
        assert "not found" in exc.message.lower()


class TestModelNotReadyError:
    """Test ModelNotReadyError exception."""

    def test_exception_message(self) -> None:
        """Test exception message formatting."""
        exc = ModelNotReadyError("job123", "running")
        assert exc.job_id == "job123"
        assert exc.current_status == "running"
        assert exc.status_code == 400
        assert "job123" in exc.message
        assert "running" in exc.message
        assert "not completed" in exc.message.lower()


class TestModelFileNotFoundError:
    """Test ModelFileNotFoundError exception."""

    def test_exception_message(self) -> None:
        """Test exception message formatting."""
        exc = ModelFileNotFoundError("job123", "/path/to/model.pt")
        assert exc.job_id == "job123"
        assert exc.expected_path == "/path/to/model.pt"
        assert exc.status_code == 404
        assert "job123" in exc.message
        assert "/path/to/model.pt" in exc.message


class TestTrainingStopError:
    """Test TrainingStopError exception."""

    def test_exception_without_reason(self) -> None:
        """Test exception without reason."""
        exc = TrainingStopError("job123")
        assert exc.job_id == "job123"
        assert exc.reason is None
        assert exc.status_code == 400
        assert "job123" in exc.message

    def test_exception_with_reason(self) -> None:
        """Test exception with reason."""
        exc = TrainingStopError("job123", "Already completed")
        assert exc.job_id == "job123"
        assert exc.reason == "Already completed"
        assert exc.status_code == 400
        assert "job123" in exc.message
        assert "Already completed" in exc.message


class TestDatasetValidationError:
    """Test DatasetValidationError exception."""

    def test_exception_message(self) -> None:
        """Test exception message formatting."""
        exc = DatasetValidationError("Missing classes.txt")
        assert exc.status_code == 400
        assert "validation failed" in exc.message.lower()
        assert "Missing classes.txt" in exc.message


class TestDatasetExtractionError:
    """Test DatasetExtractionError exception."""

    def test_exception_message(self) -> None:
        """Test exception message formatting."""
        exc = DatasetExtractionError("Invalid ZIP format")
        assert exc.status_code == 400
        assert "failed to extract" in exc.message.lower()
        assert "Invalid ZIP format" in exc.message


class TestTrainingConfigError:
    """Test TrainingConfigError exception."""

    def test_exception_message(self) -> None:
        """Test exception message formatting."""
        exc = TrainingConfigError("Invalid epochs value")
        assert exc.status_code == 400
        assert "invalid" in exc.message.lower()
        assert "Invalid epochs value" in exc.message


class TestResourceLimitError:
    """Test ResourceLimitError exception."""

    def test_exception_message(self) -> None:
        """Test exception message formatting."""
        exc = ResourceLimitError("Maximum concurrent trainings reached")
        assert exc.status_code == 429
        assert "exceeded" in exc.message.lower()
        assert "Maximum concurrent trainings" in exc.message


class TestAPIExceptionHandling:
    """Test API exception handling through endpoints."""

    @pytest.mark.asyncio
    async def test_training_not_found_error(self, async_client: AsyncClient) -> None:
        """Test TrainingNotFoundError returns proper JSON response."""
        response = await async_client.get("/api/training/status/nonexistent_job")

        assert response.status_code == 404
        data = response.json()
        assert data["error"] == "TrainingNotFoundError"
        assert "nonexistent_job" in data["message"]
        assert data["status_code"] == 404
        assert data["path"] == "/api/training/status/nonexistent_job"

    @pytest.mark.asyncio
    async def test_model_not_ready_error(self, async_client: AsyncClient) -> None:
        """Test ModelNotReadyError when downloading incomplete training."""
        # This would require setting up a running training first
        # For now, we test the not found case
        response = await async_client.get("/api/training/nonexistent/download")

        assert response.status_code == 404
        data = response.json()
        assert data["error"] == "TrainingNotFoundError"

    @pytest.mark.asyncio
    async def test_training_stop_error(self, async_client: AsyncClient) -> None:
        """Test TrainingStopError when stopping non-existent job."""
        response = await async_client.post("/api/training/stop/nonexistent_job")

        assert response.status_code == 400
        data = response.json()
        assert data["error"] == "TrainingStopError"
        assert "nonexistent_job" in data["message"]
        assert data["status_code"] == 400

    @pytest.mark.asyncio
    async def test_validation_error_handling(self, async_client: AsyncClient) -> None:
        """Test Pydantic validation error handling."""
        # Send invalid training request (missing required augmentation field)
        invalid_request = {
            "config": {
                "name": "test",
                "yolo_version": "v8",
                "model_size": "n",
                "dataset_id": "test",
                "epochs": 10,
                # Missing augmentation field - required
            },
            "dataset_zip": "base64_data",
        }

        response = await async_client.post("/api/training/start", json=invalid_request)

        assert response.status_code == 422
        data = response.json()
        assert data["error"] == "ValidationError"
        assert "validation failed" in data["message"].lower()
        assert "details" in data
        assert isinstance(data["details"], list)
        assert len(data["details"]) > 0  # Should have at least one validation error
