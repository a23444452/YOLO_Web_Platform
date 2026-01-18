"""Inference management for YOLO models."""

import base64
import time
from datetime import datetime
from io import BytesIO
from typing import Any

import cv2
import numpy as np
import yaml
from PIL import Image

from .config import settings
from .exceptions import (
    InferenceError,
    InvalidImageError,
    ModelFileNotFoundError,
    ModelNotFoundError,
    ModelNotReadyError,
)
from .logging_config import logger
from .models import BoundingBox, Detection, InferenceResponse, ModelInfo


class InferenceManager:
    """Manages YOLO model inference."""

    def __init__(self) -> None:
        """Initialize inference manager."""
        self.models: dict[str, Any] = {}  # model_id -> loaded YOLO model
        self.model_info: dict[str, ModelInfo] = {}  # model_id -> model metadata

    def load_model(self, model_id: str) -> None:
        """Load a trained YOLO model into memory.

        Args:
            model_id: Training job ID (used as model identifier)

        Raises:
            ModelNotFoundError: If model directory doesn't exist
            ModelFileNotFoundError: If model file not found
            ModelNotReadyError: If model failed to load
        """
        # Check if already loaded
        if model_id in self.models:
            logger.info("model_already_loaded", model_id=model_id)
            return

        # Check if it's an uploaded model or trained model
        uploaded_dir = settings.training_dir / "uploaded_models" / model_id
        model_dir = settings.training_dir / model_id

        is_uploaded = uploaded_dir.exists()

        if is_uploaded:
            # Handle uploaded model
            import json

            # Find model file (.pt or .onnx)
            pt_path = uploaded_dir / "model.pt"
            onnx_path = uploaded_dir / "model.onnx"
            model_path = pt_path if pt_path.exists() else onnx_path if onnx_path.exists() else None

            if not model_path:
                raise ModelFileNotFoundError(model_id, "model.pt or model.onnx")

            # Read metadata
            metadata_path = uploaded_dir / "metadata.json"
            model_name = f"Uploaded {model_id}"
            if metadata_path.exists():
                try:
                    with open(metadata_path) as f:
                        metadata = json.load(f)
                        model_name = metadata.get("name", model_name)
                except Exception:
                    pass

            class_names = []  # Unknown for uploaded models

        else:
            # Handle trained model
            if not model_dir.exists():
                raise ModelNotFoundError(model_id)

            # Find best.pt model file (in training/weights/ subdirectory)
            model_path = model_dir / "training" / "weights" / "best.pt"
            if not model_path.exists():
                raise ModelFileNotFoundError(model_id, str(model_path))

            # Load model metadata from data.yaml (in dataset/ subdirectory)
            data_yaml_path = model_dir / "dataset" / "data.yaml"
            if not data_yaml_path.exists():
                raise ModelFileNotFoundError(model_id, str(data_yaml_path))

            with open(data_yaml_path) as f:
                data_config = yaml.safe_load(f)

            class_names = data_config.get("names", [])

            # Read project name from training config
            import json
            model_name = f"Model {model_id}"
            config_path = model_dir / "training_config.json"
            if config_path.exists():
                try:
                    with open(config_path) as f:
                        config_data = json.load(f)
                        model_name = config_data.get("name", model_name)
                except Exception:
                    pass

        # Load YOLO model
        try:
            from ultralytics import YOLO  # type: ignore[attr-defined]

            model = YOLO(str(model_path))
            self.models[model_id] = model

            # Store model info
            self.model_info[model_id] = ModelInfo(
                model_id=model_id,
                name=model_name,
                yolo_version="v8",  # Default, should be read from metadata
                model_size="n" if not is_uploaded else "custom",
                classes=class_names,
                created_at=datetime.fromtimestamp(model_path.stat().st_mtime),
                metrics=None,
            )

            logger.info(
                "model_loaded",
                model_id=model_id,
                model_path=str(model_path),
                num_classes=len(class_names),
                is_uploaded=is_uploaded,
            )

        except Exception as e:
            logger.error(
                "model_load_failed",
                model_id=model_id,
                error=str(e),
                exc_info=True,
            )
            raise ModelNotReadyError(model_id, "failed") from e

    def unload_model(self, model_id: str) -> None:
        """Unload a model from memory.

        Args:
            model_id: Model identifier
        """
        if model_id in self.models:
            del self.models[model_id]
            del self.model_info[model_id]
            logger.info("model_unloaded", model_id=model_id)

    def infer(
        self,
        model_id: str,
        image_b64: str,
        confidence: float = 0.25,
        iou: float = 0.45,
    ) -> InferenceResponse:
        """Run inference on an image with security validations.

        Args:
            model_id: Model identifier
            image_b64: Base64 encoded image
            confidence: Confidence threshold
            iou: IOU threshold for NMS

        Returns:
            InferenceResponse with detections

        Raises:
            ModelNotFoundError: If model not loaded
            InvalidImageError: If image is invalid or too large
            InferenceError: If inference fails
        """
        # Ensure model is loaded
        if model_id not in self.models:
            raise ModelNotFoundError(model_id)

        model = self.models[model_id]
        model_metadata = self.model_info[model_id]

        # Security limits
        MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
        MAX_IMAGE_DIMENSION = 4096  # 4K pixels
        MIN_IMAGE_DIMENSION = 32  # Minimum reasonable size

        try:
            # Decode base64 image with validation
            try:
                image_bytes = base64.b64decode(image_b64, validate=True)
            except Exception as e:
                raise InvalidImageError(
                    f"Invalid base64 encoding: {str(e)[:100]}"
                ) from e

            # Check decoded size
            if len(image_bytes) > MAX_IMAGE_SIZE:
                size_mb = len(image_bytes) / 1024 / 1024
                raise InvalidImageError(
                    f"Image too large: {size_mb:.1f}MB (max 10MB)"
                )

            # Validate image format
            try:
                image = Image.open(BytesIO(image_bytes))
                image.verify()  # Verify it's a valid image
                # Reopen after verify (verify() invalidates the image)
                image = Image.open(BytesIO(image_bytes))
            except (OSError, Image.UnidentifiedImageError) as e:
                raise InvalidImageError(
                    f"Invalid or unsupported image format: {str(e)[:100]}"
                ) from e

            # Validate image dimensions
            width, height = image.size
            if width < MIN_IMAGE_DIMENSION or height < MIN_IMAGE_DIMENSION:
                raise InvalidImageError(
                    f"Image too small: {width}x{height} "
                    f"(min {MIN_IMAGE_DIMENSION}x{MIN_IMAGE_DIMENSION})"
                )

            if width > MAX_IMAGE_DIMENSION or height > MAX_IMAGE_DIMENSION:
                raise InvalidImageError(
                    f"Image too large: {width}x{height} "
                    f"(max {MAX_IMAGE_DIMENSION}x{MAX_IMAGE_DIMENSION})"
                )

            # Convert to numpy array
            image_np = np.array(image)

            # Convert RGB to BGR for OpenCV
            if len(image_np.shape) == 3 and image_np.shape[2] == 3:
                image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)

            original_size = (width, height)

            # Run inference
            start_time = time.time()
            results = model.predict(
                image_np,
                conf=confidence,
                iou=iou,
                verbose=False,
            )
            inference_time = (time.time() - start_time) * 1000  # Convert to ms

            # Parse results
            detections: list[Detection] = []
            if len(results) > 0:
                result = results[0]
                boxes = result.boxes

                for i in range(len(boxes)):
                    box = boxes[i]
                    class_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    xyxy = box.xyxy[0].cpu().numpy()

                    class_name = (
                        model_metadata.classes[class_id]
                        if class_id < len(model_metadata.classes)
                        else f"class_{class_id}"
                    )

                    detection = Detection(
                        class_id=class_id,
                        class_name=class_name,
                        confidence=conf,
                        bbox=BoundingBox(
                            x1=float(xyxy[0]),
                            y1=float(xyxy[1]),
                            x2=float(xyxy[2]),
                            y2=float(xyxy[3]),
                        ),
                    )
                    detections.append(detection)

            logger.info(
                "inference_completed",
                model_id=model_id,
                num_detections=len(detections),
                inference_time_ms=round(inference_time, 2),
                image_size=f"{original_size[0]}x{original_size[1]}",
            )

            return InferenceResponse(
                detections=detections,
                inference_time=inference_time,
                image_size=original_size,
            )

        except InvalidImageError:
            # Re-raise image validation errors without wrapping
            raise
        except Exception as e:
            logger.error(
                "inference_failed",
                model_id=model_id,
                error=str(e),
                exc_info=True,
            )
            raise InferenceError(str(e)) from e

    def list_models(self) -> list[ModelInfo]:
        """List all available models.

        Returns:
            List of ModelInfo objects (only the latest trained model + uploaded models)
        """
        available_models: list[ModelInfo] = []

        # Scan training directory for the LATEST completed model only
        if settings.training_dir.exists():
            latest_model: tuple[ModelInfo, float] | None = None  # (model_info, timestamp)

            for model_dir in settings.training_dir.iterdir():
                if not model_dir.is_dir():
                    continue

                model_id = model_dir.name
                model_path = model_dir / "training" / "weights" / "best.pt"

                if model_path.exists():
                    # Get modification timestamp
                    mtime = model_path.stat().st_mtime

                    # Load basic info without loading the full model
                    data_yaml_path = model_dir / "dataset" / "data.yaml"
                    class_names: list[str] = []

                    if data_yaml_path.exists():
                        try:
                            with open(data_yaml_path) as f:
                                data_config = yaml.safe_load(f)
                                class_names = data_config.get("names", [])
                        except Exception:
                            pass

                    # Read project name, YOLO version, and model size from training config
                    import json
                    project_name = f"Model {model_id}"
                    yolo_version = "v8"  # default
                    model_size = "n"     # default
                    config_path = model_dir / "training_config.json"
                    if config_path.exists():
                        try:
                            with open(config_path) as f:
                                config_data = json.load(f)
                                project_name = config_data.get("name", project_name)
                                yolo_version = config_data.get("yolo_version", yolo_version)
                                model_size = config_data.get("model_size", model_size)
                        except Exception:
                            pass

                    model_info = ModelInfo(
                        model_id=model_id,
                        name=project_name,
                        yolo_version=yolo_version,
                        model_size=model_size,
                        classes=class_names,
                        created_at=datetime.fromtimestamp(mtime),
                        metrics=None,
                    )

                    # Keep track of the latest model
                    if latest_model is None or mtime > latest_model[1]:
                        latest_model = (model_info, mtime)

            # Add only the latest trained model
            if latest_model is not None:
                available_models.append(latest_model[0])

        # Scan uploaded_models directory
        uploaded_dir = settings.training_dir / "uploaded_models"
        if uploaded_dir.exists():
            import json
            for model_dir in uploaded_dir.iterdir():
                if not model_dir.is_dir():
                    continue

                model_id = model_dir.name

                # Check for .pt or .onnx file
                pt_path = model_dir / "model.pt"
                onnx_path = model_dir / "model.onnx"
                model_path = pt_path if pt_path.exists() else onnx_path if onnx_path.exists() else None

                if model_path:
                    # Read metadata
                    metadata_path = model_dir / "metadata.json"
                    model_name = f"Uploaded {model_id}"
                    if metadata_path.exists():
                        try:
                            with open(metadata_path) as f:
                                metadata = json.load(f)
                                model_name = metadata.get("name", model_name)
                        except Exception:
                            pass

                    model_info = ModelInfo(
                        model_id=model_id,
                        name=f"📁 {model_name}",  # Prefix to indicate uploaded model
                        yolo_version="v8",
                        model_size="custom",
                        classes=[],  # Unknown classes for uploaded models
                        created_at=datetime.fromtimestamp(model_path.stat().st_mtime),
                        metrics=None,
                    )
                    available_models.append(model_info)

        logger.info("listed_models", total=len(available_models))
        return available_models


# Global inference manager instance
inference_manager = InferenceManager()
