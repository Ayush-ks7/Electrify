class AIModelError(Exception):
    """Base error for the Electrify AI/ML component."""

class ModelLoadError(AIModelError):
    """Raised when the serialized model cannot be loaded."""

class InputValidationError(AIModelError):
    """Raised when inference inputs violate the contract."""
