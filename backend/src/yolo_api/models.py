"""Pydantic models for API requests and responses."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ClassDefinition(BaseModel):
    """Class definition for YOLO dataset."""

    id: int
    name: str
    color: str


class DatasetInfo(BaseModel):
    """Dataset information."""

    id: str
    name: str
    total_images: int
    train_images: int
    val_images: int
    classes: list[ClassDefinition]


class AugmentationConfig(BaseModel):
    """Data augmentation configuration."""

    mosaic: bool = True
    mixup: bool = False
    rotation: float = Field(0.0, ge=0, le=45)
    hsv_h: float = Field(0.015, ge=0, le=1)
    hsv_s: float = Field(0.7, ge=0, le=1)
    hsv_v: float = Field(0.4, ge=0, le=1)
    translate: float = Field(0.1, ge=0, le=1)
    scale: float = Field(0.5, ge=0, le=1)
    flip_horizontal: bool = True
    flip_vertical: bool = False


class TrainingConfig(BaseModel):
    """Training configuration."""

    name: str
    yolo_version: Literal["v5", "v8", "v11"] = "v8"
    model_size: Literal["n", "s", "m", "l", "x"] = "n"
    dataset_id: str
    epochs: int = Field(100, ge=1, le=1000)
    batch_size: int = Field(16, ge=1, le=128)
    image_size: int = Field(640, ge=320, le=1280)
    device: Literal["cpu", "cuda", "mps", "auto"] = "auto"
    workers: int = Field(4, ge=0, le=16)
    optimizer: Literal["Adam", "SGD", "AdamW"] = "Adam"
    learning_rate: float = Field(0.01, gt=0, le=1)
    momentum: float = Field(0.937, ge=0, le=1)
    weight_decay: float = Field(0.0005, ge=0, le=0.01)
    patience: int = Field(50, ge=5, le=100)
    cos_lr: bool = Field(False, description="Use cosine learning rate scheduler")
    rect: bool = Field(False, description="Rectangular training for non-square images")
    cache: bool = Field(False, description="Cache images to RAM for faster training")
    augmentation: AugmentationConfig


class TrainingMetrics(BaseModel):
    """Training metrics for one epoch."""

    epoch: int
    train_loss: float
    val_loss: float
    map50: float
    map50_95: float
    precision: float
    recall: float
    learning_rate: float


class TrainingStatus(BaseModel):
    """Training job status."""

    job_id: str
    status: Literal["pending", "running", "completed", "failed", "stopped"]
    progress: float = Field(0.0, ge=0, le=100)
    current_epoch: int = 0
    total_epochs: int
    metrics: list[TrainingMetrics] = []
    logs: list[str] = []
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error: str | None = None


class StartTrainingRequest(BaseModel):
    """Request to start training."""

    config: TrainingConfig
    dataset_zip: str  # Base64 encoded ZIP file


class StartTrainingResponse(BaseModel):
    """Response for training start."""

    job_id: str
    message: str


class WSMessage(BaseModel):
    """WebSocket message."""

    type: Literal["status", "metrics", "log", "error"]
    job_id: str
    data: dict[str, Any] | str | None = None


# ============================================================================
# Inference Models
# ============================================================================


class BoundingBox(BaseModel):
    """Bounding box for detected object."""

    x1: float = Field(..., description="Top-left x coordinate")
    y1: float = Field(..., description="Top-left y coordinate")
    x2: float = Field(..., description="Bottom-right x coordinate")
    y2: float = Field(..., description="Bottom-right y coordinate")


class Detection(BaseModel):
    """Single object detection result."""

    class_id: int = Field(..., description="Detected class ID")
    class_name: str = Field(..., description="Detected class name")
    confidence: float = Field(..., ge=0, le=1, description="Detection confidence score")
    bbox: BoundingBox = Field(..., description="Bounding box coordinates")


class InferenceRequest(BaseModel):
    """Request for inference."""

    model_id: str = Field(..., description="ID of trained model to use")
    image: str = Field(..., description="Base64 encoded image")
    confidence: float = Field(0.25, ge=0.01, le=0.99, description="Confidence threshold")
    iou: float = Field(0.45, ge=0.1, le=0.9, description="IOU threshold for NMS")


class InferenceResponse(BaseModel):
    """Response for inference."""

    detections: list[Detection] = Field(..., description="List of detected objects")
    inference_time: float = Field(..., description="Inference time in milliseconds")
    image_size: tuple[int, int] = Field(..., description="Original image size (width, height)")


class ModelInfo(BaseModel):
    """Information about a trained model."""

    model_id: str = Field(..., description="Unique model identifier (job_id)")
    name: str = Field(..., description="Model name")
    yolo_version: Literal["v5", "v8", "v11"] = Field(..., description="YOLO version")
    model_size: Literal["n", "s", "m", "l", "x"] = Field(..., description="Model size")
    classes: list[str] = Field(..., description="Class names the model can detect")
    created_at: datetime = Field(..., description="Model creation timestamp")
    metrics: TrainingMetrics | None = Field(None, description="Final training metrics")


class ListModelsResponse(BaseModel):
    """Response for listing available models."""

    models: list[ModelInfo] = Field(..., description="List of available models")
    total: int = Field(..., description="Total number of models")
