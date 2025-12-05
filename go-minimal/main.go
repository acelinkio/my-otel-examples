package main

import (
	"context"
	"log/slog"
)

func main() {
	ctx := context.Background()

	logger, _, err := InitLogger(ctx)
	if err != nil {
		slog.Error("logger init", "err", err)
	}
	defer logger.Sync()

	cleanup, err := InitOtelLogging(ctx)
	if err != nil {
		slog.Error("otel init", "err", err)
	}
	defer cleanup(ctx)

	slog.Info("info: dog barks")
	slog.Warn("warning: don't 123")
	slog.Error("error: hey0123")
}
