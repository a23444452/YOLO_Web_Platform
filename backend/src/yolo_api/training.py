"""YOLO training manager."""

import asyncio
import base64
import shutil
import uuid
from collections.abc import Awaitable, Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml
from ultralytics import YOLO  # type: ignore[attr-defined]

from .config import settings
from .models import TrainingConfig, TrainingMetrics, TrainingStatus


class TrainingManager:
    """Manages YOLO training jobs."""

    def __init__(
        self,
        work_dir: Path | None = None,
        max_workers: int | None = None,
    ) -> None:
        self.work_dir = work_dir or settings.training_dir
        self.work_dir.mkdir(parents=True, exist_ok=True)
        self.jobs: dict[str, TrainingStatus] = {}
        self.callbacks: dict[str, list[Callable[[dict[str, Any]], Awaitable[None]]]] = {}
        self._pending_messages: dict[str, list[dict[str, Any]]] = {}
        self.executor = ThreadPoolExecutor(
            max_workers=max_workers or settings.max_concurrent_trainings
        )

    def register_callback(
        self, job_id: str, callback: Callable[[dict[str, Any]], Awaitable[None]]
    ) -> None:
        """Register a callback for training updates."""
        if job_id not in self.callbacks:
            self.callbacks[job_id] = []
        self.callbacks[job_id].append(callback)

    async def _notify(self, job_id: str, message: dict[str, Any]) -> None:
        """Notify all callbacks for a job with proper error logging."""
        if job_id in self.callbacks:
            for callback in self.callbacks[job_id]:
                try:
                    await callback(message)
                except Exception as e:
                    # Use structured logging instead of print
                    from .logging_config import logger

                    logger.error(
                        "callback_notification_failed",
                        job_id=job_id,
                        message_type=message.get("type"),
                        callback=callback.__name__ if hasattr(callback, "__name__") else str(callback),
                        error=str(e),
                        exc_info=True,
                    )

    def _extract_dataset(self, dataset_zip_b64: str, job_dir: Path) -> Path:
        """Extract dataset ZIP to job directory with security checks.

        Args:
            dataset_zip_b64: Base64 encoded ZIP file
            job_dir: Job directory path

        Returns:
            Path to extracted dataset directory

        Raises:
            DatasetValidationError: If ZIP file fails security checks
            DatasetExtractionError: If extraction fails
        """
        import zipfile
        from io import BytesIO

        from .exceptions import DatasetExtractionError, DatasetValidationError

        # Security limits
        MAX_EXTRACTED_SIZE = 500 * 1024 * 1024  # 500MB
        MAX_FILES = 10000
        MAX_FILENAME_LENGTH = 255

        try:
            # Decode base64
            zip_data = base64.b64decode(dataset_zip_b64)
        except Exception as e:
            raise DatasetExtractionError(f"Invalid base64 encoding: {e}") from e

        # Extract ZIP
        dataset_dir = job_dir / "dataset"
        dataset_dir.mkdir(parents=True, exist_ok=True)

        try:
            with zipfile.ZipFile(BytesIO(zip_data)) as zf:
                # Security check 1: File count
                file_count = len(zf.namelist())
                if file_count > MAX_FILES:
                    raise DatasetValidationError(
                        f"Too many files in ZIP: {file_count} (max {MAX_FILES})"
                    )

                # Security check 2: Total extracted size
                total_size = sum(info.file_size for info in zf.infolist())
                if total_size > MAX_EXTRACTED_SIZE:
                    size_mb = total_size / 1024 / 1024
                    max_mb = MAX_EXTRACTED_SIZE / 1024 / 1024
                    raise DatasetValidationError(
                        f"Extracted size too large: {size_mb:.1f}MB (max {max_mb:.0f}MB)"
                    )

                # Security check 3: Path traversal and filename validation
                for name in zf.namelist():
                    # Check for path traversal
                    if name.startswith("/") or ".." in name:
                        raise DatasetValidationError(
                            f"Invalid path in ZIP (path traversal attempt): {name}"
                        )

                    # Check for absolute paths
                    if Path(name).is_absolute():
                        raise DatasetValidationError(
                            f"Absolute path not allowed in ZIP: {name}"
                        )

                    # Check filename length
                    if len(Path(name).name) > MAX_FILENAME_LENGTH:
                        raise DatasetValidationError(
                            f"Filename too long: {Path(name).name[:50]}... "
                            f"(max {MAX_FILENAME_LENGTH} chars)"
                        )

                # Extract all files (now validated)
                zf.extractall(dataset_dir)

        except zipfile.BadZipFile as e:
            raise DatasetExtractionError(f"Invalid or corrupted ZIP file: {e}") from e
        except (DatasetValidationError, DatasetExtractionError):
            # Re-raise our custom exceptions
            raise
        except Exception as e:
            raise DatasetExtractionError(f"Failed to extract dataset: {e}") from e

        return dataset_dir

    def _create_data_yaml(self, dataset_dir: Path, config: TrainingConfig) -> Path:
        """Create data.yaml for YOLO training."""
        # Read classes.txt if exists
        classes_file = dataset_dir / "classes.txt"
        if classes_file.exists():
            classes = [
                line.strip()
                for line in classes_file.read_text().strip().split("\n")
                if line.strip()
            ]
        else:
            # If no classes.txt found, raise error
            raise ValueError("classes.txt not found in dataset ZIP")

        data_yaml = {
            "path": str(dataset_dir.absolute()),
            "train": "images/train",
            "val": "images/val",
            "nc": len(classes),
            "names": classes,
        }

        yaml_path = dataset_dir / "data.yaml"
        with open(yaml_path, "w") as f:
            yaml.dump(data_yaml, f)

        return yaml_path

    async def start_training(self, config: TrainingConfig, dataset_zip_b64: str) -> str:
        """Start a new training job."""
        job_id = str(uuid.uuid4())
        job_dir = self.work_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        # Initialize job status
        self.jobs[job_id] = TrainingStatus(
            job_id=job_id,
            status="pending",
            progress=0.0,
            total_epochs=config.epochs,
            started_at=datetime.now(),
        )

        # Start training in background
        asyncio.create_task(
            self._run_training(job_id, config, dataset_zip_b64, job_dir)
        )

        return job_id

    def _setup_callbacks(self, job_id: str, config: TrainingConfig) -> dict[str, Any]:
        """Setup custom callbacks for YOLO training."""
        callbacks: dict[str, Any] = {}

        def on_train_epoch_end(trainer: Any) -> None:
            """Called at the end of each training epoch."""
            try:
                epoch = trainer.epoch + 1
                total_epochs = trainer.epochs

                # Extract metrics from trainer
                metrics_dict = trainer.metrics if hasattr(trainer, "metrics") else {}

                # Create metrics object
                metrics = TrainingMetrics(
                    epoch=epoch,
                    train_loss=float(metrics_dict.get("train/box_loss", 0.0)),
                    val_loss=float(metrics_dict.get("val/box_loss", 0.0)),
                    map50=float(metrics_dict.get("metrics/mAP50(B)", 0.0)),
                    map50_95=float(metrics_dict.get("metrics/mAP50-95(B)", 0.0)),
                    precision=float(metrics_dict.get("metrics/precision(B)", 0.0)),
                    recall=float(metrics_dict.get("metrics/recall(B)", 0.0)),
                    learning_rate=float(
                        trainer.lr.get("lr0", config.learning_rate)
                        if hasattr(trainer, "lr")
                        else config.learning_rate
                    ),
                )

                # Update job status
                self.jobs[job_id].current_epoch = epoch
                self.jobs[job_id].progress = (epoch / total_epochs) * 100
                self.jobs[job_id].metrics.append(metrics)

                # Notify via callback (needs to be sync in thread)
                message = {
                    "type": "metrics",
                    "data": {
                        "epoch": epoch,
                        "total_epochs": total_epochs,
                        "progress": self.jobs[job_id].progress,
                        "metrics": metrics.model_dump(),
                    },
                }

                # Store message for async notification
                if job_id not in self._pending_messages:
                    self._pending_messages[job_id] = []
                self._pending_messages[job_id].append(message)

            except Exception as e:
                print(f"Callback error: {e}")

        def on_train_start(trainer: Any) -> None:
            """Called when training starts."""
            message = {
                "type": "log",
                "data": f"Training started: {trainer.epochs} epochs",
            }
            if job_id not in self._pending_messages:
                self._pending_messages[job_id] = []
            self._pending_messages[job_id].append(message)

        callbacks["on_train_epoch_end"] = on_train_epoch_end
        callbacks["on_train_start"] = on_train_start

        return callbacks

    def _train_sync(
        self,
        job_id: str,
        config: TrainingConfig,
        dataset_zip_b64: str,
        job_dir: Path,
    ) -> None:
        """Synchronous training function (runs in thread pool)."""
        try:
            # Extract dataset
            dataset_dir = self._extract_dataset(dataset_zip_b64, job_dir)

            # Create data.yaml
            data_yaml = self._create_data_yaml(dataset_dir, config)

            # Select model
            # Remove 'v' prefix from version (e.g., 'v8' -> '8', 'v11' -> '11')
            version = config.yolo_version.lstrip("v")
            model_name = f"yolo{version}{config.model_size}.pt"

            # Get model path from weights directory
            from pathlib import Path
            weights_dir = Path(__file__).parent.parent.parent / "weights"
            model_path = weights_dir / model_name

            # Initialize YOLO model
            if model_path.exists():
                model = YOLO(str(model_path))
            else:
                # Fallback to model name (will download if not found)
                model = YOLO(model_name)

            # Setup callbacks
            custom_callbacks = self._setup_callbacks(job_id, config)
            for event, callback in custom_callbacks.items():
                model.add_callback(event, callback)

            # Train with ultralytics
            model.train(
                data=str(data_yaml),
                epochs=config.epochs,
                batch=config.batch_size,
                imgsz=config.image_size,
                device=config.device,
                workers=config.workers,
                optimizer=config.optimizer,
                lr0=config.learning_rate,
                momentum=config.momentum,
                weight_decay=config.weight_decay,
                patience=config.patience,
                # Augmentation
                mosaic=1.0 if config.augmentation.mosaic else 0.0,
                mixup=0.1 if config.augmentation.mixup else 0.0,
                degrees=config.augmentation.rotation,
                hsv_h=config.augmentation.hsv_h,
                hsv_s=config.augmentation.hsv_s,
                hsv_v=config.augmentation.hsv_v,
                translate=config.augmentation.translate,
                scale=config.augmentation.scale,
                fliplr=0.5 if config.augmentation.flip_horizontal else 0.0,
                flipud=0.5 if config.augmentation.flip_vertical else 0.0,
                # Output
                project=str(job_dir),
                name="training",
                exist_ok=True,
                verbose=True,
            )

            # Training completed
            self.jobs[job_id].status = "completed"
            self.jobs[job_id].progress = 100.0
            self.jobs[job_id].completed_at = datetime.now()

        except Exception as e:
            self.jobs[job_id].status = "failed"
            self.jobs[job_id].error = str(e)
            raise

    async def _process_pending_messages(self, job_id: str) -> None:
        """Process pending messages from training thread."""
        while True:
            await asyncio.sleep(1)  # Check every second

            if job_id not in self.jobs:
                break

            status = self.jobs[job_id].status

            # Send pending messages
            if hasattr(self, "_pending_messages") and job_id in self._pending_messages:
                messages = self._pending_messages[job_id].copy()
                self._pending_messages[job_id].clear()

                for message in messages:
                    await self._notify(job_id, message)

            # Stop if training finished
            if status in ["completed", "failed", "stopped"]:
                # Send final status
                await self._notify(
                    job_id,
                    {
                        "type": "status",
                        "data": {
                            "status": status,
                            "progress": self.jobs[job_id].progress,
                        },
                    },
                )
                break

    async def _run_training(
        self,
        job_id: str,
        config: TrainingConfig,
        dataset_zip_b64: str,
        job_dir: Path,
    ) -> None:
        """Run YOLO training (async wrapper)."""
        try:
            # Update status
            self.jobs[job_id].status = "running"
            await self._notify(
                job_id, {"type": "status", "data": {"status": "running"}}
            )

            await self._notify(job_id, {"type": "log", "data": "Extracting dataset..."})

            # Start message processor
            processor_task = asyncio.create_task(self._process_pending_messages(job_id))

            # Run training in thread pool
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self.executor,
                self._train_sync,
                job_id,
                config,
                dataset_zip_b64,
                job_dir,
            )

            # Wait for message processor to finish
            await processor_task

        except Exception as e:
            self.jobs[job_id].status = "failed"
            self.jobs[job_id].error = str(e)
            await self._notify(job_id, {"type": "error", "data": {"error": str(e)}})

    def get_status(self, job_id: str) -> TrainingStatus | None:
        """Get training job status."""
        return self.jobs.get(job_id)

    def stop_training(self, job_id: str) -> bool:
        """Stop a training job."""
        if job_id in self.jobs and self.jobs[job_id].status == "running":
            self.jobs[job_id].status = "stopped"
            # Note: Actual stopping of ultralytics training requires more work
            return True
        return False

    def cleanup_job(self, job_id: str) -> None:
        """Clean up job directory."""
        job_dir = self.work_dir / job_id
        if job_dir.exists():
            shutil.rmtree(job_dir)
        if job_id in self.jobs:
            del self.jobs[job_id]
        if job_id in self.callbacks:
            del self.callbacks[job_id]


# Global training manager instance
training_manager = TrainingManager()
