"""Tests for FastAPI endpoints."""

from typing import Any

import pytest
from httpx import AsyncClient

from yolo_api.config import settings


class TestAPIEndpoints:
    """Test FastAPI endpoints."""

    @pytest.mark.asyncio
    async def test_root_endpoint(self, async_client: AsyncClient) -> None:
        """Test root endpoint returns basic info."""
        response = await async_client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == settings.api_title
        assert data["version"] == settings.api_version
        assert data["status"] == "running"

    @pytest.mark.asyncio
    async def test_health_endpoint(self, async_client: AsyncClient) -> None:
        """Test health check endpoint."""
        response = await async_client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_list_training_jobs_empty(self, async_client: AsyncClient) -> None:
        """Test listing training jobs when empty."""
        response = await async_client.get("/api/training/list")

        assert response.status_code == 200
        data = response.json()
        assert "jobs" in data
        assert "total" in data
        assert isinstance(data["jobs"], list)
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_get_nonexistent_training_status(
        self, async_client: AsyncClient
    ) -> None:
        """Test getting status of non-existent training job."""
        response = await async_client.get("/api/training/status/nonexistent_job")

        assert response.status_code == 404
        data = response.json()
        assert data["error"] == "TrainingNotFoundError"
        assert "not found" in data["message"].lower()
        assert data["status_code"] == 404

    @pytest.mark.asyncio
    async def test_stop_nonexistent_training(self, async_client: AsyncClient) -> None:
        """Test stopping non-existent training job."""
        response = await async_client.post("/api/training/stop/nonexistent_job")

        assert response.status_code == 400
        data = response.json()
        assert data["error"] == "TrainingStopError"
        assert data["status_code"] == 400

    @pytest.mark.asyncio
    async def test_delete_training_job(self, async_client: AsyncClient) -> None:
        """Test deleting a training job."""
        # This should not raise error even if job doesn't exist
        response = await async_client.delete("/api/training/nonexistent_job")

        assert response.status_code == 200
        data = response.json()
        assert "message" in data

    @pytest.mark.asyncio
    async def test_download_nonexistent_model(self, async_client: AsyncClient) -> None:
        """Test downloading model for non-existent job."""
        response = await async_client.get("/api/training/nonexistent_job/download")

        assert response.status_code == 404
        data = response.json()
        assert data["error"] == "TrainingNotFoundError"
        assert data["status_code"] == 404

    @pytest.mark.asyncio
    async def test_get_nonexistent_results(self, async_client: AsyncClient) -> None:
        """Test getting results for non-existent job."""
        response = await async_client.get("/api/training/nonexistent_job/results")

        assert response.status_code == 404
        data = response.json()
        assert data["error"] == "TrainingNotFoundError"
        assert data["status_code"] == 404
