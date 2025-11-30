import logging
import logging.config
import os

def configure_logging():
    level = os.getenv("LOG_LEVEL", "INFO").upper()

    LOGGING = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "standard": {
                "format": "%(asctime)s %(levelname)s %(name)s %(message)s"
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "standard",
                "stream": "ext://sys.stdout"
            }
        },
        "root": {
            "handlers": ["console"],
            "level": level
        },
        "loggers": {
            # let uvicorn loggers propagate to root so LoggingInstrumentor (attached to root)
            # can see and forward their records to OpenTelemetry
            "uvicorn": {"level": level, "propagate": True},
            "uvicorn.error": {"level": level, "propagate": True},
            "uvicorn.access": {"level": level, "propagate": True},
        },
    }

    logging.config.dictConfig(LOGGING)