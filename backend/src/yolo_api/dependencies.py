"""Dependency injection for FastAPI endpoints."""

from typing import Annotated, Any

from fastapi import Depends

from .logging_config import logger
from .training import TrainingManager


# Training Manager Dependency
def get_training_manager() -> TrainingManager:
    """Get the training manager instance.

    This is a dependency injection function for FastAPI.
    It provides the TrainingManager instance to endpoints.

    Returns:
        TrainingManager instance

    Example:
        @app.get("/status/{job_id}")
        async def get_status(
            job_id: str,
            manager: Annotated[TrainingManager, Depends(get_training_manager)]
        ):
            return manager.get_status(job_id)
    """
    from .training import training_manager

    return training_manager


# Type alias for dependency injection
TrainingManagerDep = Annotated[TrainingManager, Depends(get_training_manager)]


# Logger Dependency (for endpoints that need structured logging)
def get_logger() -> Any:
    """Get the structured logger instance.

    Returns:
        Structured logger instance
    """
    return logger


# Type alias for logger dependency
LoggerDep = Annotated[Any, Depends(get_logger)]
