package main

import (
	"context"
	"log/slog"
)

func main() {
	ctx := context.Background()

	SetupLogger(ctx)

	cleanup, err := SetupOtel(ctx)
	if err != nil {
		slog.Error("otel init", "err", err)
	}
	defer cleanup(ctx)

	slog.Info("my info log: dog barks")
	slog.Warn("my warning log: don't 123")
	slog.Error("my error log: hey0123")
}
