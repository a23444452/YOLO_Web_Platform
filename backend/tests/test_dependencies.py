"""Tests for dependency injection."""

from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient

from yolo_api.dependencies import get_training_manager
from yolo_api.main import app
from yolo_api.models import TrainingStatus
from yolo_api.training import TrainingManager


class TestDependencyInjection:
    """Test dependency injection functionality."""

    @pytest.mark.asyncio
    async def test_get_training_manager_dependency(self) -> None:
        """Test that get_training_manager returns a TrainingManager instance."""
        manager = get_training_manager()

        assert manager is not None
        assert isinstance(manager, TrainingManager)
        assert hasattr(manager, "start_training")
        assert hasattr(manager, "get_status")
        assert hasattr(manager, "stop_training")

    @pytest.mark.asyncio
    async def test_dependency_override(self, async_client: AsyncClient) -> None:
        """Test that dependencies can be overridden for testing."""
        # Create a mock training manager
        mock_manager = MagicMock(spec=TrainingManager)
        mock_status = TrainingStatus(
            job_id="test_job",
            status="running",
            progress=50.0,
            current_epoch=5,
            total_epochs=10,
        )
        mock_manager.get_status.return_value = mock_status

        # Override dependency
        app.dependency_overrides[get_training_manager] = lambda: mock_manager

        try:
            # Test endpoint uses mocked dependency
            response = await async_client.get("/api/training/status/test_job")

            assert response.status_code == 200
            data = response.json()
            assert data["job_id"] == "test_job"
            assert data["status"] == "running"
            assert data["progress"] == 50.0

            # Verify mock was called
            mock_manager.get_status.assert_called_once_with("test_job")

        finally:
            # Clean up override
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_multiple_endpoints_use_same_dependency(
        self, async_client: AsyncClient
    ) -> None:
        """Test that multiple endpoints can use the same dependency."""
        # All these endpoints should use the same TrainingManager instance
        # This is a smoke test to ensure dependency injection works across endpoints

        # List endpoint
        response1 = await async_client.get("/api/training/list")
        assert response1.status_code == 200

        # Status endpoint (will 404 but that's OK, it means DI works)
        response2 = await async_client.get("/api/training/status/nonexistent")
        assert response2.status_code == 404

    @pytest.mark.asyncio
    async def test_dependency_override_with_none_status(
        self, async_client: AsyncClient
    ) -> None:
        """Test dependency override when status is None."""
        mock_manager = MagicMock(spec=TrainingManager)
        mock_manager.get_status.return_value = None

        app.dependency_overrides[get_training_manager] = lambda: mock_manager

        try:
            response = await async_client.get("/api/training/status/missing_job")

            assert response.status_code == 404
            data = response.json()
            assert data["error"] == "TrainingNotFoundError"
            assert "missing_job" in data["message"]

            mock_manager.get_status.assert_called_once_with("missing_job")

        finally:
            app.dependency_overrides.clear()


class TestDependencyBenefits:
    """Demonstrate benefits of dependency injection for testing."""

    @pytest.mark.asyncio
    async def test_isolated_testing(self, async_client: AsyncClient) -> None:
        """Show how DI enables isolated testing without global state."""
        # Create isolated mock for this test
        isolated_manager = MagicMock(spec=TrainingManager)
        isolated_manager.jobs = {}  # Empty jobs dict

        app.dependency_overrides[get_training_manager] = lambda: isolated_manager

        try:
            response = await async_client.get("/api/training/list")

            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 0
            assert data["jobs"] == []

        finally:
            app.dependency_overrides.clear()

    @pytest.mark.asyncio
    async def test_predictable_behavior(self, async_client: AsyncClient) -> None:
        """Show how DI makes tests predictable and repeatable."""
        # Create manager with known state
        predictable_manager = MagicMock(spec=TrainingManager)
        known_status = TrainingStatus(
            job_id="predictable_job",
            status="completed",
            progress=100.0,
            current_epoch=10,
            total_epochs=10,
        )
        predictable_manager.get_status.return_value = known_status

        app.dependency_overrides[get_training_manager] = lambda: predictable_manager

        try:
            # Test is predictable - always returns same result
            for _ in range(3):
                response = await async_client.get(
                    "/api/training/status/predictable_job"
                )
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "completed"
                assert data["progress"] == 100.0

        finally:
            app.dependency_overrides.clear()
