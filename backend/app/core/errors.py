class ServiceError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def invalid_input(message: str) -> ServiceError:
    return ServiceError(422, "INVALID_INPUT", message)
