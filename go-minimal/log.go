package main

import (
    "context"
    "os"

    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"

    "go.opentelemetry.io/contrib/bridges/otelzap"
    otellog "go.opentelemetry.io/otel/log"
)

// InitLogger sets up the zap logger wired to OpenTelemetry. It accepts a
// otel API LoggerProvider produced elsewhere (e.g. InitOtelLogging).
func InitLogger(ctx context.Context, provider otellog.LoggerProvider) (*zap.Logger, func(context.Context) error, error) {
    core := zapcore.NewTee(
        zapcore.NewCore(zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig()), zapcore.AddSync(os.Stdout), zapcore.InfoLevel),
        otelzap.NewCore("my/pkg/name", otelzap.WithLoggerProvider(provider)),
    )

    logger := zap.New(core)

    shutdown := func(ctx context.Context) error {
        // provider shutdown is handled by InitOtelLogging's returned shutdown.
        return nil
    }

    return logger, shutdown, nil
}