"""Application configuration using pydantic-settings."""

from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # API Configuration
    api_title: str = "YOLO Web Platform API"
    api_description: str = "FastAPI backend for YOLO training and inference"
    api_version: str = "0.8.0"
    api_host: str = Field(default="0.0.0.0", description="API server host")
    api_port: int = Field(default=8000, ge=1000, le=65535, description="API server port")
    api_reload: bool = Field(
        default=False, description="Enable auto-reload (development only)"
    )
    api_debug: bool = Field(default=False, description="Enable debug mode")

    # Training Configuration
    training_dir: Path = Field(
        default=Path("/tmp/yolo_training"),
        description="Directory for training jobs",
    )
    max_concurrent_trainings: int = Field(
        default=2, ge=1, le=10, description="Maximum concurrent training jobs"
    )
    default_device: Literal["cpu", "cuda", "mps"] = Field(
        default="cpu", description="Default device for training"
    )
    default_epochs: int = Field(
        default=100, ge=1, le=1000, description="Default training epochs"
    )
    default_batch_size: int = Field(
        default=16, ge=1, le=128, description="Default batch size"
    )
    default_image_size: int = Field(
        default=640, ge=320, le=1280, description="Default image size"
    )

    # CORS Configuration
    cors_origins: list[str] = Field(
        default=[
            "http://localhost:5173",  # Vite default
            "http://localhost:3000",  # React default
            "http://localhost:8080",  # Alternative
        ],
        description="Allowed CORS origins",
    )
    cors_allow_credentials: bool = Field(
        default=True, description="Allow credentials in CORS"
    )
    cors_allow_methods: list[str] = Field(
        default=["*"], description="Allowed HTTP methods"
    )
    cors_allow_headers: list[str] = Field(
        default=["*"], description="Allowed HTTP headers"
    )

    # Logging Configuration
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO", description="Logging level"
    )
    log_format: Literal["text", "json"] = Field(
        default="text", description="Log output format"
    )

    # Model Configuration
    model_cache_dir: Path = Field(
        default=Path.home() / ".cache" / "yolo",
        description="Directory for caching YOLO models",
    )

    # Security
    max_upload_size_mb: int = Field(
        default=100, ge=1, le=1000, description="Maximum upload size in MB"
    )

    # Performance
    worker_threads: int = Field(
        default=4, ge=1, le=16, description="Number of worker threads"
    )

    model_config = SettingsConfigDict(
        env_prefix="YOLO_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra fields from environment
    )

    def ensure_directories(self) -> None:
        """Ensure required directories exist."""
        self.training_dir.mkdir(parents=True, exist_ok=True)
        self.model_cache_dir.mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()

# Ensure directories on module import
settings.ensure_directories()
