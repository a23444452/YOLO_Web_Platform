"""Custom exceptions for YOLO API."""


class YOLOAPIException(Exception):  # noqa: N818
    """Base exception for YOLO API.

    All custom exceptions inherit from this base class,
    providing consistent error handling across the API.
    """

    def __init__(self, message: str, status_code: int = 500) -> None:
        """Initialize exception with message and HTTP status code.

        Args:
            message: Human-readable error message
            status_code: HTTP status code (default: 500)
        """
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class TrainingNotFoundError(YOLOAPIException):
    """Training job not found."""

    def __init__(self, job_id: str) -> None:
        """Initialize with job ID.

        Args:
            job_id: The training job ID that was not found
        """
        super().__init__(
            message=f"Training job '{job_id}' not found",
            status_code=404,
        )
        self.job_id = job_id


class ModelNotReadyError(YOLOAPIException):
    """Model not ready for download."""

    def __init__(self, job_id: str, current_status: str) -> None:
        """Initialize with job ID and current status.

        Args:
            job_id: The training job ID
            current_status: Current status of the training job
        """
        super().__init__(
            message=f"Training job '{job_id}' is '{current_status}', not completed. "
            f"Model download is only available for completed trainings.",
            status_code=400,
        )
        self.job_id = job_id
        self.current_status = current_status


class ModelFileNotFoundError(YOLOAPIException):
    """Trained model file not found."""

    def __init__(self, job_id: str, expected_path: str) -> None:
        """Initialize with job ID and expected path.

        Args:
            job_id: The training job ID
            expected_path: Expected path where model should exist
        """
        super().__init__(
            message=f"Model file not found for training job '{job_id}'. "
            f"Expected at: {expected_path}. Training may have failed.",
            status_code=404,
        )
        self.job_id = job_id
        self.expected_path = expected_path


class TrainingStopError(YOLOAPIException):
    """Cannot stop training job."""

    def __init__(self, job_id: str, reason: str | None = None) -> None:
        """Initialize with job ID and optional reason.

        Args:
            job_id: The training job ID
            reason: Optional reason why training cannot be stopped
        """
        message = f"Cannot stop training job '{job_id}'"
        if reason:
            message += f": {reason}"
        super().__init__(message=message, status_code=400)
        self.job_id = job_id
        self.reason = reason


class DatasetValidationError(YOLOAPIException):
    """Dataset validation failed."""

    def __init__(self, message: str) -> None:
        """Initialize with validation error message.

        Args:
            message: Description of the validation error
        """
        super().__init__(
            message=f"Dataset validation failed: {message}",
            status_code=400,
        )


class DatasetExtractionError(YOLOAPIException):
    """Dataset extraction failed."""

    def __init__(self, message: str) -> None:
        """Initialize with extraction error message.

        Args:
            message: Description of the extraction error
        """
        super().__init__(
            message=f"Failed to extract dataset: {message}",
            status_code=400,
        )


class TrainingConfigError(YOLOAPIException):
    """Training configuration is invalid."""

    def __init__(self, message: str) -> None:
        """Initialize with configuration error message.

        Args:
            message: Description of the configuration error
        """
        super().__init__(
            message=f"Invalid training configuration: {message}",
            status_code=400,
        )


class ResourceLimitError(YOLOAPIException):
    """Resource limit exceeded."""

    def __init__(self, message: str) -> None:
        """Initialize with resource limit error message.

        Args:
            message: Description of the resource limit error
        """
        super().__init__(
            message=f"Resource limit exceeded: {message}",
            status_code=429,
        )


# ============================================================================
# Inference Exceptions
# ============================================================================


class ModelNotFoundError(YOLOAPIException):
    """Trained model not found."""

    def __init__(self, model_id: str) -> None:
        """Initialize with model ID.

        Args:
            model_id: ID of the model that was not found
        """
        super().__init__(
            message=f"Model '{model_id}' not found or not loaded",
            status_code=404,
        )
        self.model_id = model_id


class InferenceError(YOLOAPIException):
    """Inference operation failed."""

    def __init__(self, message: str) -> None:
        """Initialize with error message.

        Args:
            message: Error message describing the failure
        """
        super().__init__(
            message=f"Inference failed: {message}",
            status_code=500,
        )


class InvalidImageError(YOLOAPIException):
    """Image data is invalid."""

    def __init__(self, message: str) -> None:
        """Initialize with error message.

        Args:
            message: Error message describing the issue
        """
        super().__init__(
            message=f"Invalid image: {message}",
            status_code=400,
        )
        self.details = message
