import {
  BatchSpanProcessor,
  WebTracerProvider,
} from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter as OLTPTraceExporterHTTPjson } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OLTPTraceExporterHTTPprotobuf } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPTraceExporter as OLTPTraceExporterGRPC } from '@opentelemetry/exporter-trace-otlp-grpc';

class SimpleNoopTracerProvider {
  register(): void {}
}

function getEnv(name: string): string | undefined {
  if (typeof process !== 'undefined' && (process as any).env) {
    return (process as any).env[name];
  }
  const g = globalThis as any;
  return g && g[name] ? g[name] : undefined;
}

const protocol = (getEnv('OTEL_EXPORTER_OTLP_PROTOCOL') || '').toLowerCase();

if (! getEnv('OTEL_EXPORTER_OTLP_ENDPOINT')) {
  const noop = new SimpleNoopTracerProvider();
  noop.register();
} else {
  let exporter: any;

  if (protocol === 'grpc') {
    exporter = new OLTPTraceExporterGRPC();
  } else if (protocol === 'http/json' || protocol === 'http_json' || protocol === 'httpjson') {
    exporter = new OLTPTraceExporterHTTPjson();
  } else {
    exporter = new OLTPTraceExporterHTTPprotobuf();
  }

  const provider = new WebTracerProvider({
    spanProcessors: [
      new BatchSpanProcessor(exporter, {
        maxQueueSize: 100,
        maxExportBatchSize: 10,
        scheduledDelayMillis: 500,
        exportTimeoutMillis: 30000,
      }),
    ],
  });

  provider.register();
}