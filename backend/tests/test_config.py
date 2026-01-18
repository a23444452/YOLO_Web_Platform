"""Tests for configuration."""

import os
from pathlib import Path

import pytest

from yolo_api.config import Settings


class TestSettings:
    """Test Settings class."""

    def test_default_settings(self) -> None:
        """Test default settings values."""
        settings = Settings()

        # API configuration
        assert settings.api_title == "YOLO Web Platform API"
        assert settings.api_version == "0.8.0"
        assert settings.api_host == "0.0.0.0"
        assert settings.api_port == 8000
        assert settings.api_reload is False
        assert settings.api_debug is False

        # Training configuration
        assert settings.max_concurrent_trainings == 2
        assert settings.default_device == "cpu"
        assert settings.default_epochs == 100
        assert settings.default_batch_size == 16
        assert settings.default_image_size == 640

        # CORS configuration
        assert isinstance(settings.cors_origins, list)
        assert len(settings.cors_origins) > 0
        assert settings.cors_allow_credentials is True

        # Logging configuration
        assert settings.log_level == "INFO"
        assert settings.log_format == "text"

    def test_environment_override(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test environment variable override."""
        # Set environment variables
        monkeypatch.setenv("YOLO_API_PORT", "9000")
        monkeypatch.setenv("YOLO_API_DEBUG", "true")
        monkeypatch.setenv("YOLO_MAX_CONCURRENT_TRAININGS", "5")
        monkeypatch.setenv("YOLO_LOG_LEVEL", "DEBUG")

        # Create new settings instance
        settings = Settings()

        assert settings.api_port == 9000
        assert settings.api_debug is True
        assert settings.max_concurrent_trainings == 5
        assert settings.log_level == "DEBUG"

    def test_validation(self) -> None:
        """Test settings validation."""
        # Test valid port range
        settings = Settings(api_port=8080)
        assert settings.api_port == 8080

        # Test invalid port (too low)
        with pytest.raises(Exception):  # Pydantic ValidationError
            Settings(api_port=100)

        # Test invalid port (too high)
        with pytest.raises(Exception):
            Settings(api_port=70000)

        # Test valid concurrent trainings
        settings = Settings(max_concurrent_trainings=5)
        assert settings.max_concurrent_trainings == 5

        # Test invalid concurrent trainings (too low)
        with pytest.raises(Exception):
            Settings(max_concurrent_trainings=0)

        # Test invalid concurrent trainings (too high)
        with pytest.raises(Exception):
            Settings(max_concurrent_trainings=20)

    def test_path_fields(self, tmp_path: Path) -> None:
        """Test path field handling."""
        training_dir = tmp_path / "training"
        model_cache = tmp_path / "cache"

        settings = Settings(
            training_dir=training_dir,
            model_cache_dir=model_cache,
        )

        assert settings.training_dir == training_dir
        assert settings.model_cache_dir == model_cache

    def test_ensure_directories(self, tmp_path: Path) -> None:
        """Test directory creation."""
        training_dir = tmp_path / "training"
        model_cache = tmp_path / "cache"

        # Directories don't exist yet
        assert not training_dir.exists()
        assert not model_cache.exists()

        settings = Settings(
            training_dir=training_dir,
            model_cache_dir=model_cache,
        )

        # Call ensure_directories
        settings.ensure_directories()

        # Directories should now exist
        assert training_dir.exists()
        assert model_cache.exists()

    def test_device_literal(self) -> None:
        """Test device literal type validation."""
        # Valid devices
        settings = Settings(default_device="cpu")
        assert settings.default_device == "cpu"

        settings = Settings(default_device="cuda")
        assert settings.default_device == "cuda"

        settings = Settings(default_device="mps")
        assert settings.default_device == "mps"

        # Invalid device
        with pytest.raises(Exception):
            Settings(default_device="invalid")  # type: ignore[arg-type]

    def test_log_level_literal(self) -> None:
        """Test log level literal type validation."""
        # Valid log levels
        for level in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
            settings = Settings(log_level=level)  # type: ignore[arg-type]
            assert settings.log_level == level

        # Invalid log level
        with pytest.raises(Exception):
            Settings(log_level="INVALID")  # type: ignore[arg-type]

    def test_cors_origins_list(self) -> None:
        """Test CORS origins as list."""
        origins = ["http://localhost:3000", "http://example.com"]
        settings = Settings(cors_origins=origins)

        assert settings.cors_origins == origins
        assert isinstance(settings.cors_origins, list)

    def test_env_prefix(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test environment variable prefix."""
        # Should only recognize YOLO_ prefixed variables
        monkeypatch.setenv("YOLO_API_PORT", "9000")
        monkeypatch.setenv("API_PORT", "8888")  # Without prefix

        settings = Settings()

        # Should use YOLO_API_PORT, not API_PORT
        assert settings.api_port == 9000

    def test_case_insensitive(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test case-insensitive environment variables."""
        # Both should work
        monkeypatch.setenv("yolo_api_port", "9000")
        settings = Settings()
        assert settings.api_port == 9000

        monkeypatch.setenv("YOLO_API_PORT", "9001")
        settings = Settings()
        assert settings.api_port == 9001

    def test_extra_fields_ignored(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test that extra environment variables are ignored."""
        monkeypatch.setenv("YOLO_UNKNOWN_FIELD", "some_value")

        # Should not raise error
        settings = Settings()
        assert not hasattr(settings, "unknown_field")
