# bun-minimal

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.3. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.



```sh
# OTEL_EXPORTER_OTLP_PROTOCOL=grpc
# OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317

unset OTEL_EXPORTER_OTLP_PROTOCOL OTEL_EXPORTER_OTLP_ENDPOINT
OTEL_EXPORTER_OTLP_PROTOCOL=grpc OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317 bun dev

```

# notes

## good search for stuff
https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-logs.html

## official example
https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/examples/logs/index.ts
https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-logs-otlp-grpc.html

note some reason BatchRecordProcessor is not loading

## reference for Kyoo
https://github.com/zoriya/Kyoo/pull/1161/files


## otel doesn't work
https://github.com/oven-sh/bun/issues/3775#issuecomment-3473755225
https://github.com/oven-sh/bun/pull/24063

## bun example of functional
https://github.com/open-telemetry/opentelemetry-js/issues/5260
https://github.com/pichlermarc/repro-5260/tree/using-latest-version