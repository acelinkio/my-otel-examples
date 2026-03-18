package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	echootel "github.com/labstack/echo-opentelemetry"
	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

func SetupEcho(ctx context.Context, servicename string) error {
	e := echo.New()
	e.Use(echootel.NewMiddleware(servicename))
	e.Logger = slog.Default()

	// build ignore list from env or fall back to defaults
	var ignore []string
	if val, ok := os.LookupEnv("LOG_IGNORE_WEBPATHS"); !ok {
		slog.Info("env LOG_IGNORE_WEBPATHS not set, using defaults")
		ignore = []string{
			"/health",
			"/favicon.ico",
			"/ready",
		}
	} else {
		val = strings.TrimSpace(val)
		if val != "" {
			for _, p := range strings.Split(val, ",") {
				if p = strings.TrimSpace(p); p != "" {
					ignore = append(ignore, p)
				}
			}
		}
	}
	sort.Strings(ignore)
	stringignore := strings.Join(ignore, ",")
	slog.Info("web_request.log_ignore_paths", "paths", stringignore)

	contains := func(list []string, s string) bool {
		for _, v := range list {
			if v == s {
				return true
			}
		}
		return false
	}
	// using example from https://echo.labstack.com/docs/middleware/logger#examples
	// full configs https://github.com/labstack/echo/blob/master/middleware/request_logger.go
	e.Use(middleware.RequestLoggerWithConfig(middleware.RequestLoggerConfig{
		// declare a small set of paths to ignore
		Skipper: func(c *echo.Context) bool {
			p := c.Request().URL.Path
			return contains(ignore, p)
		},
		LogStatus:    true,
		LogURI:       true,
		LogHost:      true,
		LogMethod:    true,
		LogUserAgent: true,
		HandleError:  true, // forwards error to the global error handler, so it can decide appropriate status code
		LogValuesFunc: func(c *echo.Context, v middleware.RequestLoggerValues) error {
			requestCtx := c.Request().Context()
			attrs := []slog.Attr{
				slog.String("method", v.Method),
				slog.Int("status", v.Status),
				slog.String("host", v.Host),
				slog.String("uri", v.URI),
				slog.String("agent", v.UserAgent),
			}

			// default to Info log logLevel
			logLevel := slog.LevelInfo
			if v.Error == nil {
				slog.LogAttrs(requestCtx, logLevel, "web_request", attrs...)
			} else {
				errMsg := v.Error.Error()
				var internalMsg string
				if he, ok := errors.AsType[*echo.HTTPError](v.Error); ok {
					errMsg = he.Message
					if internalErr := errors.Unwrap(he); internalErr != nil {
						internalMsg = internalErr.Error()
					}
				}
				attrs = append(attrs, slog.String("error", errMsg))
				if internalMsg != "" {
					attrs = append(attrs, slog.String("internal", internalMsg))
				}
				if v.Status >= 500 {
					logLevel = slog.LevelError
				}
				slog.LogAttrs(requestCtx, logLevel, "web_request_error", attrs...)
			}
			return nil
		},
	}))

	e.Use(middleware.Recover())

	e.GET("/", hello)
	e.GET("/health", health)

	host := "[::]"
	port := "8025"

	sc := echo.StartConfig{
		Address:         host + ":" + port,
		GracefulTimeout: 5 * time.Second,
		HidePort:        true,
		HideBanner:      true,
	}
	slog.InfoContext(ctx, "web server",
		slog.String("state", "starting"),
		slog.String("host", host),
		slog.String("port", port),
	)
	err := sc.Start(ctx, e)
	slog.InfoContext(ctx, "web server",
		slog.String("state", "stopped"),
		slog.String("host", host),
		slog.String("port", port),
	)

	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("web server error: %w", err)
	}

	return nil
}

func hello(c *echo.Context) error {
	return c.String(http.StatusOK, "Hello, World!")
}

func health(c *echo.Context) error {
	return c.String(http.StatusOK, "I AM HEALTHY")
}
