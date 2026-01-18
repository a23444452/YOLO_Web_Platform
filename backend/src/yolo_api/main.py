"""FastAPI main application."""

import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import structlog
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import ValidationError
from starlette.background import BackgroundTask

from .config import settings
from .dependencies import TrainingManagerDep
from .exceptions import (
    InferenceError,
    ModelFileNotFoundError,
    ModelNotFoundError,
    ModelNotReadyError,
    TrainingNotFoundError,
    TrainingStopError,
    YOLOAPIException,
)
from .inference import inference_manager
from .logging_config import logger
from .models import (
    InferenceRequest,
    InferenceResponse,
    ListModelsResponse,
    StartTrainingRequest,
    StartTrainingResponse,
    TrainingStatus,
    WSMessage,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan."""
    # Startup
    logger.info(
        "server_starting",
        host=settings.api_host,
        port=settings.api_port,
        training_dir=str(settings.training_dir),
        environment="development" if settings.api_debug else "production",
        log_format=settings.log_format,
        log_level=settings.log_level,
    )
    yield
    # Shutdown
    logger.info("server_shutdown")


app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
    lifespan=lifespan,
    debug=settings.api_debug,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)


# Request tracking middleware
@app.middleware("http")
async def request_tracking_middleware(
    request: Request, call_next: Any
) -> JSONResponse | FileResponse | Any:
    """Add request ID and track request/response timing."""
    # Generate request ID
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    # Add request ID to structlog context
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)

    # Log request start
    start_time = time.time()
    logger.info(
        "request_started",
        method=request.method,
        path=request.url.path,
        client=request.client.host if request.client else None,
    )

    # Process request
    response = await call_next(request)

    # Log request completion
    duration = time.time() - start_time
    logger.info(
        "request_completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=round(duration * 1000, 2),
    )

    # Add request ID to response headers
    response.headers["X-Request-ID"] = request_id

    return response


# Exception handlers
@app.exception_handler(YOLOAPIException)
async def yolo_exception_handler(
    request: Request, exc: YOLOAPIException
) -> JSONResponse:
    """Handle custom YOLO API exceptions.

    Returns a consistent JSON error response with:
    - error: Exception class name
    - message: Human-readable error message
    - status_code: HTTP status code
    - path: Request path where error occurred
    """
    logger.warning(
        "api_exception",
        exception_type=exc.__class__.__name__,
        message=exc.message,
        status_code=exc.status_code,
        path=str(request.url.path),
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
            "status_code": exc.status_code,
            "path": str(request.url.path),
        },
    )


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle FastAPI request validation errors.

    Returns a detailed JSON error response with:
    - error: "ValidationError"
    - message: Summary of validation errors
    - details: List of specific validation errors
    - path: Request path where error occurred
    """
    logger.warning(
        "validation_error",
        error_count=len(exc.errors()),
        errors=exc.errors(),
        path=str(request.url.path),
    )
    return JSONResponse(
        status_code=422,
        content={
            "error": "ValidationError",
            "message": "Request validation failed",
            "details": exc.errors(),
            "path": str(request.url.path),
        },
    )


@app.exception_handler(ValidationError)
async def validation_exception_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    """Handle Pydantic validation errors from models.

    Returns a detailed JSON error response with:
    - error: "ValidationError"
    - message: Summary of validation errors
    - details: List of specific validation errors
    - path: Request path where error occurred
    """
    return JSONResponse(
        status_code=422,
        content={
            "error": "ValidationError",
            "message": "Data validation failed",
            "details": exc.errors(),
            "path": str(request.url.path),
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request, exc: HTTPException
) -> JSONResponse:
    """Handle FastAPI HTTP exceptions.

    Returns a consistent JSON error response for standard HTTP exceptions.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTPException",
            "message": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url.path),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Handle unexpected exceptions.

    Catches all unhandled exceptions and returns a generic 500 error.
    In production, avoid exposing internal error details.
    """
    logger.error(
        "unexpected_exception",
        exception_type=exc.__class__.__name__,
        exception_message=str(exc),
        path=str(request.url.path),
        exc_info=settings.api_debug,  # Include stack trace in debug mode
    )
    error_detail = str(exc) if settings.api_debug else "Internal server error"
    return JSONResponse(
        status_code=500,
        content={
            "error": exc.__class__.__name__,
            "message": error_detail,
            "status_code": 500,
            "path": str(request.url.path),
        },
    )


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {
        "message": settings.api_title,
        "version": settings.api_version,
        "status": "running",
    }


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/api/training/start", response_model=StartTrainingResponse)
async def start_training(
    request: StartTrainingRequest,
    manager: TrainingManagerDep,
) -> StartTrainingResponse:
    """Start a new training job.

    Raises:
        YOLOAPIException: If training fails to start
    """
    job_id = await manager.start_training(request.config, request.dataset_zip)
    return StartTrainingResponse(
        job_id=job_id,
        message=f"Training job {job_id} started successfully",
    )


@app.get("/api/training/status/{job_id}", response_model=TrainingStatus)
async def get_training_status(
    job_id: str,
    manager: TrainingManagerDep,
) -> TrainingStatus:
    """Get training job status.

    Raises:
        TrainingNotFoundError: If training job doesn't exist
    """
    status = manager.get_status(job_id)
    if not status:
        raise TrainingNotFoundError(job_id)
    return status


@app.post("/api/training/stop/{job_id}")
async def stop_training(
    job_id: str,
    manager: TrainingManagerDep,
) -> dict[str, str]:
    """Stop a training job.

    Raises:
        TrainingStopError: If training cannot be stopped
    """
    success = manager.stop_training(job_id)
    if not success:
        raise TrainingStopError(job_id, "Job not found or already stopped")
    return {"message": f"Training job {job_id} stopped"}


@app.delete("/api/training/{job_id}")
async def delete_training(
    job_id: str,
    manager: TrainingManagerDep,
) -> dict[str, str]:
    """Delete a training job and clean up."""
    manager.cleanup_job(job_id)
    return {"message": f"Training job {job_id} deleted"}


@app.get("/api/training/{job_id}/download")
async def download_model(
    job_id: str,
    manager: TrainingManagerDep,
) -> FileResponse:
    """Download trained model file (.pt).

    Raises:
        TrainingNotFoundError: If training job doesn't exist
        ModelNotReadyError: If training is not completed
        ModelFileNotFoundError: If model file doesn't exist
    """
    status = manager.get_status(job_id)
    if not status:
        raise TrainingNotFoundError(job_id)

    if status.status != "completed":
        raise ModelNotReadyError(job_id, status.status)

    # Get model path
    job_dir = manager.work_dir / job_id
    model_path = job_dir / "training" / "weights" / "best.pt"

    if not model_path.exists():
        raise ModelFileNotFoundError(job_id, str(model_path))

    return FileResponse(
        path=model_path,
        filename=f"yolo_{job_id}_best.pt",
        media_type="application/octet-stream",
    )


@app.get("/api/training/{job_id}/download-all")
async def download_training_package(
    job_id: str,
    manager: TrainingManagerDep,
) -> FileResponse:
    """Download complete training package as ZIP.

    包含：
    - weights/ (best.pt, last.pt, best.onnx)
    - 訓練圖表 (results.png, confusion_matrix.png 等)
    - 訓練配置 (args.yaml)
    - 訓練數據 (results.csv)

    Raises:
        TrainingNotFoundError: If training job doesn't exist
        ModelNotReadyError: If training is not completed
    """
    import zipfile
    import tempfile
    from pathlib import Path

    status = manager.get_status(job_id)
    if not status:
        raise TrainingNotFoundError(job_id)

    if status.status != "completed":
        raise ModelNotReadyError(job_id, status.status)

    # Get training directory
    job_dir = manager.work_dir / job_id
    training_dir = job_dir / "training"

    if not training_dir.exists():
        raise ModelFileNotFoundError(job_id, str(training_dir))

    # Create temporary ZIP file
    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
    temp_zip.close()

    try:
        with zipfile.ZipFile(temp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add all files from training directory
            for file_path in training_dir.rglob('*'):
                if file_path.is_file():
                    # 保持相對路徑結構
                    arcname = file_path.relative_to(training_dir)
                    zipf.write(file_path, arcname)

        logger.info("training_package_created", job_id=job_id, zip_size=Path(temp_zip.name).stat().st_size)

        return FileResponse(
            path=temp_zip.name,
            filename=f"yolo_training_{job_id}.zip",
            media_type="application/zip",
            background=BackgroundTask(lambda: Path(temp_zip.name).unlink(missing_ok=True))
        )
    except Exception as e:
        # Clean up on error
        Path(temp_zip.name).unlink(missing_ok=True)
        logger.error("training_package_failed", job_id=job_id, error=str(e))
        raise


@app.get("/api/training/{job_id}/results")
async def get_training_results(
    job_id: str,
    manager: TrainingManagerDep,
) -> dict[str, Any]:
    """Get training results including charts and metrics.

    Raises:
        TrainingNotFoundError: If training job doesn't exist
    """
    status = manager.get_status(job_id)
    if not status:
        raise TrainingNotFoundError(job_id)

    job_dir = manager.work_dir / job_id
    training_dir = job_dir / "training"

    # Check if results exist
    results_png = training_dir / "results.png"
    confusion_matrix = training_dir / "confusion_matrix.png"

    results: dict[str, Any] = {
        "job_id": job_id,
        "status": status.status,
        "metrics": [m.model_dump() for m in status.metrics],
        "files": {
            "results_chart": results_png.exists(),
            "confusion_matrix": confusion_matrix.exists(),
            "best_model": (training_dir / "weights" / "best.pt").exists(),
            "last_model": (training_dir / "weights" / "last.pt").exists(),
        },
    }

    return results


@app.get("/api/training/list")
async def list_training_jobs(
    manager: TrainingManagerDep,
) -> dict[str, Any]:
    """List all training jobs."""
    jobs = []
    for job_id, status in manager.jobs.items():
        jobs.append(
            {
                "job_id": job_id,
                "status": status.status,
                "progress": status.progress,
                "current_epoch": status.current_epoch,
                "total_epochs": status.total_epochs,
                "started_at": status.started_at.isoformat()
                if status.started_at
                else None,
                "completed_at": status.completed_at.isoformat()
                if status.completed_at
                else None,
            }
        )

    return {"jobs": jobs, "total": len(jobs)}


# ============================================================================
# Inference Endpoints
# ============================================================================


@app.get("/api/inference/models", response_model=ListModelsResponse)
async def list_available_models() -> ListModelsResponse:
    """List all available trained models for inference.

    Returns:
        ListModelsResponse with list of available models
    """
    models = inference_manager.list_models()
    logger.info("list_inference_models", total=len(models))
    return ListModelsResponse(models=models, total=len(models))


@app.post("/api/inference/load/{model_id}")
async def load_model(model_id: str) -> dict[str, str]:
    """Load a trained model into memory for inference.

    Args:
        model_id: Training job ID (used as model identifier)

    Returns:
        Success message

    Raises:
        ModelNotFoundError: If model doesn't exist
        ModelFileNotFoundError: If model file not found
        ModelNotReadyError: If model failed to load
    """
    inference_manager.load_model(model_id)
    logger.info("model_loaded_api", model_id=model_id)
    return {"message": f"Model '{model_id}' loaded successfully"}


@app.post("/api/inference/unload/{model_id}")
async def unload_model(model_id: str) -> dict[str, str]:
    """Unload a model from memory.

    Args:
        model_id: Model identifier

    Returns:
        Success message
    """
    inference_manager.unload_model(model_id)
    logger.info("model_unloaded_api", model_id=model_id)
    return {"message": f"Model '{model_id}' unloaded successfully"}


@app.post("/api/inference/predict", response_model=InferenceResponse)
async def run_inference(request: InferenceRequest) -> InferenceResponse:
    """Run inference on an image.

    Args:
        request: InferenceRequest with model_id, image, confidence, and iou

    Returns:
        InferenceResponse with detections and inference time

    Raises:
        ModelNotFoundError: If model not loaded
        InvalidImageError: If image is invalid
        InferenceError: If inference fails
    """
    try:
        # Auto-load model if not already loaded
        if request.model_id not in inference_manager.models:
            logger.info("auto_loading_model", model_id=request.model_id)
            inference_manager.load_model(request.model_id)

        result = inference_manager.infer(
            model_id=request.model_id,
            image_b64=request.image,
            confidence=request.confidence,
            iou=request.iou,
        )

        logger.info(
            "inference_api_success",
            model_id=request.model_id,
            detections=len(result.detections),
            inference_time_ms=round(result.inference_time, 2),
        )

        return result

    except (ModelNotFoundError, ModelFileNotFoundError, ModelNotReadyError):
        raise
    except Exception as e:
        logger.error("inference_api_error", error=str(e), exc_info=True)
        raise InferenceError(str(e)) from e


# ============================================================================
# WebSocket Endpoints
# ============================================================================


@app.websocket("/ws/training/{job_id}")
async def training_websocket(websocket: WebSocket, job_id: str) -> None:
    """WebSocket endpoint for real-time training updates."""
    from .dependencies import get_training_manager

    manager = get_training_manager()

    await websocket.accept()

    # Check if job exists
    status = manager.get_status(job_id)
    if not status:
        await websocket.close(code=1008, reason="Training job not found")
        return

    try:
        # Register callback for updates
        async def send_update(message: dict[str, Any]) -> None:
            ws_message = WSMessage(
                type=message.get("type", "log"),
                job_id=job_id,
                data=message.get("data"),
            )
            await websocket.send_json(ws_message.model_dump())

        manager.register_callback(job_id, send_update)

        # Send initial status (use mode='json' to serialize datetime)
        await send_update({"type": "status", "data": status.model_dump(mode="json")})

        # Keep connection alive and handle client messages
        while True:
            try:
                # Receive message from client (ping/pong or commands)
                data = await websocket.receive_text()

                # Echo back or handle commands
                if data == "ping":
                    await websocket.send_text("pong")
                elif data == "status":
                    current_status = manager.get_status(job_id)
                    if current_status:
                        await send_update(
                            {
                                "type": "status",
                                "data": current_status.model_dump(mode="json"),
                            }
                        )

            except WebSocketDisconnect:
                break

    except Exception as e:
        logger.error("websocket_error", error=str(e), job_id=job_id)
    finally:
        # Cleanup callback when connection closes
        if job_id in manager.callbacks:
            manager.callbacks[job_id] = [
                cb for cb in manager.callbacks[job_id] if cb != send_update
            ]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "yolo_api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
