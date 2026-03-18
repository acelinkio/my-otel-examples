package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
)

func run(ctx context.Context) error {
	app_name := "go-echo"

	SetupLogger(ctx)

	cleanup, err := SetupOtel(ctx, app_name)
	if err != nil {
		slog.Error("otel init", "err", err)
	}
	defer cleanup()

	err = SetupEcho(ctx, app_name)
	if err != nil {
		slog.Error("echo init", "err", err)
	}
	return nil
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := run(ctx); err != nil {
		slog.ErrorContext(ctx, "Application failed", slog.Any("err", err))
		os.Exit(1)
	}
}
