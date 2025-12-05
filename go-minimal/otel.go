package main

import (
	"context"
	"log/slog"
	"os"
	"strings"

	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp"
	logotel "go.opentelemetry.io/otel/log"
	logotelglobal"go.opentelemetry.io/otel/log/global"
	logsdk "go.opentelemetry.io/otel/sdk/log"
	logsdknoop "go.opentelemetry.io/otel/log/noop"
)

// InitOtelLogging creates the OTLP log exporter and returns a shutdown function.
// It chooses gRPC or HTTP exporter based on OTEL_EXPORTER_OTLP_PROTOCOL and skips
// setup if OTEL_EXPORTER_OTLP_ENDPOINT is not set.
func InitOtelLogging(ctx context.Context) (func(context.Context) error, error) {
	var le logsdk.Exporter
	var err error

	endpoint := strings.TrimSpace(os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT"))
	slog.Info("Configuring OTEL")
	switch {
	case endpoint == "":
		slog.Info("OTEL_EXPORTER_OTLP_ENDPOINT not set")
		slog.Info("Using NoOp exporters")
		le = nil
	case strings.ToLower(strings.TrimSpace(os.Getenv("OTEL_EXPORTER_OTLP_PROTOCOL"))) == "grpc":
		slog.Info("Using OTLP gRPC exporters")
		le, err = otlploggrpc.New(ctx)
	default:
		slog.Info("Using OTLP HTTP exporters")
		le, err = otlploghttp.New(ctx)
	}
	if err != nil {
		return nil, err
	}

	// default to noop providers
	var lp logotel.LoggerProvider = logsdknoop.NewLoggerProvider()

	// use provider with configured exporter
	if le != nil {
		lp = logsdk.NewLoggerProvider(
			logsdk.WithProcessor(logsdk.NewBatchProcessor(le)),
		)
	}
	logotelglobal.SetLoggerProvider(lp)

	log_shutdown := func(ctx context.Context) error {
		slog.Info("Shutting down OTEL")
		if logsdkProvider, ok := lp.(*logsdk.LoggerProvider); ok && logsdkProvider != nil {
			return logsdkProvider.Shutdown(ctx)
		}
		return nil
	}

	return log_shutdown, nil
}
