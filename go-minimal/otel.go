package main

import (
    "context"

    "go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
    "go.opentelemetry.io/otel/log"
    sdklog "go.opentelemetry.io/otel/sdk/log"
)

// InitOtelLogging creates the OTLP log exporter and returns an otel API LoggerProvider
// along with a shutdown function.
func InitOtelLogging(ctx context.Context) (log.LoggerProvider, func(context.Context) error, error) {
    exp, err := otlploggrpc.New(ctx)
    if err != nil {
        return nil, nil, err
    }

    provider := sdklog.NewLoggerProvider(
        sdklog.WithProcessor(sdklog.NewBatchProcessor(exp)),
    )

    shutdown := func(ctx context.Context) error {
        return provider.Shutdown(ctx)
    }

    return provider, shutdown, nil
}