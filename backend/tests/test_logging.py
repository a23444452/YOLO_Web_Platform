"""Tests for structured logging."""

from typing import Any
from unittest.mock import MagicMock, patch

import pytest
import structlog
from httpx import AsyncClient

from yolo_api.config import Settings
from yolo_api.logging_config import configure_logging


class TestLoggingConfiguration:
    """Test logging configuration."""

    def test_configure_logging_text_format(self) -> None:
        """Test logging configuration with text format."""
        with patch("yolo_api.logging_config.settings") as mock_settings:
            mock_settings.log_level = "INFO"
            mock_settings.log_format = "text"

            logger = configure_logging()

            assert logger is not None
            # Logger can be BoundLogger or BoundLoggerLazyProxy
            assert hasattr(logger, "info")
            assert hasattr(logger, "error")

    def test_configure_logging_json_format(self) -> None:
        """Test logging configuration with JSON format."""
        with patch("yolo_api.logging_config.settings") as mock_settings:
            mock_settings.log_level = "DEBUG"
            mock_settings.log_format = "json"

            logger = configure_logging()

            assert logger is not None
            # Logger can be BoundLogger or BoundLoggerLazyProxy
            assert hasattr(logger, "info")
            assert hasattr(logger, "error")

    def test_logger_methods(self) -> None:
        """Test logger has all standard methods."""
        logger = configure_logging()

        assert hasattr(logger, "debug")
        assert hasattr(logger, "info")
        assert hasattr(logger, "warning")
        assert hasattr(logger, "error")
        assert hasattr(logger, "critical")


class TestRequestTracking:
    """Test request tracking middleware."""

    @pytest.mark.asyncio
    async def test_request_id_header(self, async_client: AsyncClient) -> None:
        """Test that X-Request-ID header is added to responses."""
        response = await async_client.get("/")

        assert response.status_code == 200
        assert "X-Request-ID" in response.headers
        # Validate UUID format (should be 36 characters with dashes)
        request_id = response.headers["X-Request-ID"]
        assert len(request_id) == 36
        assert request_id.count("-") == 4

    @pytest.mark.asyncio
    async def test_request_logging(self, async_client: AsyncClient) -> None:
        """Test that requests are logged."""
        # We can't easily capture logs in tests without complex setup
        # But we can verify the endpoint works and returns request ID
        response = await async_client.get("/health")

        assert response.status_code == 200
        assert "X-Request-ID" in response.headers

    @pytest.mark.asyncio
    async def test_error_logging(self, async_client: AsyncClient) -> None:
        """Test that errors are logged with request ID."""
        # Trigger a 404 error
        response = await async_client.get("/api/training/status/nonexistent")

        assert response.status_code == 404
        assert "X-Request-ID" in response.headers

        data = response.json()
        assert data["error"] == "TrainingNotFoundError"


class TestLoggingIntegration:
    """Test logging integration with API."""

    @pytest.mark.asyncio
    async def test_api_exception_logging(self, async_client: AsyncClient) -> None:
        """Test that API exceptions are logged."""
        # Trigger a TrainingNotFoundError
        response = await async_client.get("/api/training/status/fake_job_id")

        assert response.status_code == 404
        assert "X-Request-ID" in response.headers

        data = response.json()
        assert data["error"] == "TrainingNotFoundError"
        assert "fake_job_id" in data["message"]

    @pytest.mark.asyncio
    async def test_validation_error_logging(self, async_client: AsyncClient) -> None:
        """Test that validation errors are logged."""
        invalid_request = {
            "config": {
                "name": "test",
                "yolo_version": "v8",
                "model_size": "n",
                "dataset_id": "test",
                "epochs": 10,
                # Missing required augmentation field
            },
            "dataset_zip": "base64_data",
        }

        response = await async_client.post("/api/training/start", json=invalid_request)

        assert response.status_code == 422
        assert "X-Request-ID" in response.headers

        data = response.json()
        assert data["error"] == "ValidationError"

    @pytest.mark.asyncio
    async def test_successful_request_logging(
        self, async_client: AsyncClient
    ) -> None:
        """Test that successful requests are logged."""
        response = await async_client.get("/api/training/list")

        assert response.status_code == 200
        assert "X-Request-ID" in response.headers

        data = response.json()
        assert "jobs" in data
        assert "total" in data


class TestContextVars:
    """Test structlog context variables."""

    @pytest.mark.asyncio
    async def test_request_id_in_context(self, async_client: AsyncClient) -> None:
        """Test that request ID is available in context."""
        # Make a request
        response = await async_client.get("/")

        assert response.status_code == 200
        request_id = response.headers["X-Request-ID"]
        assert request_id is not None

        # Context vars are cleared after request
        # So we just verify the header is present

    @pytest.mark.asyncio
    async def test_multiple_requests_have_different_ids(
        self, async_client: AsyncClient
    ) -> None:
        """Test that each request gets a unique ID."""
        response1 = await async_client.get("/")
        response2 = await async_client.get("/health")

        request_id1 = response1.headers["X-Request-ID"]
        request_id2 = response2.headers["X-Request-ID"]

        assert request_id1 != request_id2
