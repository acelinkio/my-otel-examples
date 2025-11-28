import os
from urllib.parse import urlparse
from opentelemetry.exporter.otlp.proto.http._log_exporter import (
    OTLPLogExporter as HttpLogExporter,
)
from opentelemetry.exporter.otlp.proto.http.metric_exporter import (
    OTLPMetricExporter as HttpMetricExporter,
)
from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
    OTLPSpanExporter as HttpSpanExporter,
)

import sys
import time
import threading
import traceback
from typing import Optional, Type, Any
import socket
import logging

proto_env = os.getenv("OTEL_EXPORTER_OTLP_PROTOCOL", "").lower().strip()
endpoint_env = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "").strip()
print(f"Using OTEL_EXPORTER_OTLP_PROTOCOL={proto_env} and OTEL_EXPORTER_OTLP_ENDPOINT={endpoint_env}")

# parse OTEL_EXPORTER VARIABLES
if proto_env in ("grpc",):
    want_grpc = True
elif proto_env.startswith("http") or proto_env in ("http/protobuf", "http/json", "http"):
    want_grpc = False
else:
    # fall back to endpoint scheme if available
    scheme = urlparse(endpoint_env).scheme.lower() if endpoint_env else None
    want_grpc = scheme not in ("http", "https")

# use appropriate exporter
if not want_grpc:
  LogExporterClass = HttpLogExporter
  MetricsExporterClass = HttpMetricExporter
  TracesExporterClass = HttpSpanExporter
else:
    # lazy-import gRPC exporter; if that fails, fall back to HTTP
    try:
        from opentelemetry.exporter.otlp.proto.grpc._log_exporter import (
            OTLPLogExporter as GrpcLogExporter,
        )
        from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import (
          OTLPMetricExporter as GrpcMetricExporter,
        )
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
          OTLPSpanExporter as GrpcSpanExporter,
        )
        LogExporterClass = GrpcLogExporter
        MetricsExporterClass = GrpcMetricExporter
        TracesExporterClass = GrpcSpanExporter
    except Exception as exc:
        print(
            "gRPC OTLP exporter unavailable; falling back to HTTP exporter. "
            "Install system libstdc++ (e.g. apt install libstdc++6) to enable gRPC. "
            f"Import error: {exc}",
            file=sys.stderr,
        )
        LogExporterClass = HttpLogExporter
        MetricsExporterClass = HttpMetricExporter
        TracesExporterClass = HttpSpanExporter

# --- Modular design: use module-level classes, remove resolver -----------------

# compact mapping chosen at import time; tests can monkeypatch the three module vars.
EXPORTER_CLASSES = {
    "logs": LogExporterClass,
    "traces": TracesExporterClass,
    "metrics": MetricsExporterClass,
}

def make_safe_exporter(signal: str, *args, exporter_cls: Optional[Type[Any]] = None, **kwargs) -> "SafeOTLPExporter":
    """Create a SafeOTLPExporter for the named signal using the module-level defaults."""
    if exporter_cls is None:
        try:
            exporter_cls = EXPORTER_CLASSES[signal]
        except KeyError:
            raise ValueError(f"Unknown signal '{signal}' (expected one of {list(EXPORTER_CLASSES.keys())})")
    return SafeOTLPExporter(*args, exporter_cls=exporter_cls, **kwargs)

class SafeOTLPExporter:
    """
    Generic wrapper around an OTLP exporter instance that implements exponential
    backoff on export failures and avoids using logging for internal messages.

    NOTE: simplified: this wrapper no longer accepts a 'signal' string.  Pass an
    exporter class explicitly, or use the convenience factory functions below
    which use DEFAULT_EXPORTER_CLASS.
    """

    def __init__(
        self,
        *args,
        exporter_cls: Optional[Type[Any]] = None,
        exporter_factory: Optional[callable] = None,
        endpoint: Optional[str] = None,
        initial_backoff: float = 1.0,
        max_backoff: float = 300.0,
        **kwargs,
    ):
        # require an exporter class or factory
        if exporter_factory is None and exporter_cls is None:
            raise ValueError(
                "exporter_cls or exporter_factory is required. Use make_safe_log_exporter / "
                "make_safe_trace_exporter / make_safe_metric_exporter or pass one explicitly."
            )

        # build a factory if only exporter_cls/args provided
        if exporter_factory is None:
            def _factory():
                return exporter_cls(*args, **kwargs)
            exporter_factory = _factory

        self._factory = exporter_factory
        # instantiate the exporter via factory
        try:
            self._inner = self._factory()
        except Exception as exc:
            # don't raise here; allow wrapper to exist and handle retries
            self._inner = None
            print("initial exporter instantiation failed; will retry on export()", file=sys.stderr)
            traceback.print_exception(type(exc), exc, exc.__traceback__, file=sys.stderr)

        self._lock = threading.Lock()
        self._reported = False
        self._backoff_initial = float(initial_backoff)
        self._backoff = float(initial_backoff)
        self._max_backoff = float(max_backoff)
        self._next_try = 0.0

    def _report_once(self, message: str, exc: Optional[BaseException] = None):
        if self._reported:
            return
        self._reported = True
        print(message, file=sys.stderr)
        if exc is not None:
            traceback.print_exception(type(exc), exc, exc.__traceback__, file=sys.stderr)

    def _report_retry(self, wait_seconds: float):
        print(f"OTLP exporter will retry in {wait_seconds:.1f}s", file=sys.stderr)

    def export(self, records) -> Optional[Any]:
        now = time.time()
        with self._lock:
            if now < self._next_try:
                # within backoff window, skip
                return None

        # If we previously failed and we have a factory, try to recreate the inner exporter now
        if getattr(self, "_factory", None) is not None and self._inner is None:
            try:
                new_inner = self._factory()
            except Exception as exc:
                # failed to recreate; schedule next backoff and return
                with self._lock:
                    self._report_once("OTLP exporter recreation failed; staying in backoff.", exc)
                    self._report_retry(self._backoff)
                    self._next_try = time.time() + self._backoff
                    self._backoff = min(self._backoff * 2.0, self._max_backoff)
                return None
            else:
                # successfully recreated exporter; clear reported flag and reset backoff
                with self._lock:
                    self._inner = new_inner
                    self._reported = False
                    self._backoff = self._backoff_initial
                    self._next_try = 0.0

        # normal export attempt
        try:
            return getattr(self._inner, "export")(records)
        except Exception as exc:
            with self._lock:
                self._report_once("OTLP export failed; entering backoff. Disabling immediate exports.", exc)
                self._report_retry(self._backoff)
                self._next_try = time.time() + self._backoff
                self._backoff = min(self._backoff * 2.0, self._max_backoff)
            return None

    def shutdown(self):
        try:
            return getattr(self._inner, "shutdown", lambda: None)()
        except Exception as exc:
            self._report_once("Exception while shutting down OTLP exporter", exc)

    def force_flush(self, timeout_millis: int = 30000):
        try:
            return getattr(self._inner, "force_flush", lambda *a, **k: True)(timeout_millis)
        except Exception as exc:
            self._report_once("Exception during force_flush", exc)
            return False

# --- end SafeOTLPExporter -----------------------------------------------------

# --- reachability probe + prober with exponential backoff --------------------
ATTACHED_EXPORTERS: dict[str, "SafeOTLPExporter"] = {}

def _is_endpoint_reachable(url: str, timeout: float = 0.5) -> bool:
    p = urlparse(url)
    host = p.hostname or "localhost"
    # default ports: 4318 for HTTP, 4317 for gRPC if not provided
    port = p.port or (4318 if p.scheme in ("http", "https") else 4317)
    try:
        with socket.create_connection((host, port), timeout):
            return True
    except Exception:
        return False

def start_otlp_prober_all(endpoint: str, signals: tuple[str, ...] = ("logs", "traces", "metrics"), initial_backoff: float = 1.0, max_backoff: float = 300.0):
    """
    Single background prober: check TCP reachability for `endpoint` and create
    a SafeOTLPExporter for each signal in `signals` once reachable.
    Exponential backoff on failures; logs attempts/retries.
    """
    logger = logging.getLogger("otlp.prober")

    def _probe():
        backoff = float(initial_backoff)
        attempt = 0
        logger.info("starting prober for %s -> signals=%s", endpoint, signals)
        while True:
            attempt += 1
            try:
                if _is_endpoint_reachable(endpoint, timeout=0.5):
                    logger.info("endpoint reachable; creating exporters for %s", signals)
                    for s in signals:
                        try:
                            wrapper = make_safe_exporter(s, endpoint=endpoint)
                            ATTACHED_EXPORTERS[s] = wrapper
                            logger.info("attached SafeOTLPExporter for %s", s)
                        except Exception as exc:
                            logger.exception("failed to create/attach exporter for %s: %s", s, exc)
                    break
                else:
                    logger.warning("endpoint %s not reachable (attempt %d); retrying in %.1fs", endpoint, attempt, backoff)
            except Exception as exc:
                logger.exception("probe error on attempt %d: %s", attempt, exc)

            time.sleep(backoff)
            backoff = min(backoff * 2.0, max_backoff)

    t = threading.Thread(target=_probe, daemon=True, name="otlp-prober-all")
    t.start()
    return t

def main():
    # configure structured logging for this test harness
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(levelname)s %(name)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stderr)],
    )
    logger = logging.getLogger("test")

    probers = []
    try:
        # Start one prober for the endpoint (creates exporters for all signals when reachable).
        if endpoint_env:
            probers.append(start_otlp_prober_all(endpoint_env, ("logs", "traces", "metrics"), initial_backoff=1.0, max_backoff=8.0))
        else:
            logger.info("OTEL_EXPORTER_OTLP_ENDPOINT is not set; not starting OTLP probers. Running main loop only.")

        # run a short loop so you can observe prober output in the console (or just exercise app logic)
        for i in range(30):
            logger.info("main loop iteration %d", i)
            time.sleep(0.5)

    finally:
        # attempt clean shutdown of any attached exporters
        for s, w in list(ATTACHED_EXPORTERS.items()):
            try:
                logger.info("shutting down exporter for %s", s)
                w.force_flush()
                w.shutdown()
            except Exception:
                logger.exception("error shutting down exporter for %s", s)


# thin convenience aliases (optional)
make_safe_log_exporter = lambda *a, exporter_cls=None, **kw: make_safe_exporter("logs", *a, exporter_cls=exporter_cls, **kw)
make_safe_trace_exporter = lambda *a, exporter_cls=None, **kw: make_safe_exporter("traces", *a, exporter_cls=exporter_cls, **kw)
make_safe_metric_exporter = lambda *a, exporter_cls=None, **kw: make_safe_exporter("metrics", *a, exporter_cls=exporter_cls, **kw)


if __name__ == "__main__":
    main()