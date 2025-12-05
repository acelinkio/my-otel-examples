package main

import (
	"context"
	"log/slog"
)

func main() {
	ctx := context.Background()
	app_name := "go-echo"

	logger, _, err := SetupLogger(ctx)
	if err != nil {
		slog.Error("logger init", "err", err)
	}
	defer logger.Sync()

	cleanup, err := SetupOtel(ctx, app_name)
	if err != nil {
		slog.Error("otel init", "err", err)
	}
	defer cleanup(ctx)

	err = SetupEcho(ctx, logger)
	if err != nil {
		slog.Error("echo init", "err", err)
	}
}
