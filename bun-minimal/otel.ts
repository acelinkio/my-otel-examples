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

// used to get env vars in both node and browser-like environments
function getEnv(name: string): string | undefined {
  if (typeof process !== 'undefined' && (process as any).env) {
    return (process as any).env[name];
  }
  const g = globalThis as any;
  return g && g[name] ? g[name] : undefined;
}

const protocol = (getEnv('OTEL_EXPORTER_OTLP_PROTOCOL') || '').toLowerCase();

if (! getEnv('OTEL_EXPORTER_OTLP_ENDPOINT')) {
  const tenoop = new SimpleNoopTracerProvider();
  tenoop.register();
} else {
  let te: any;

  if (protocol === 'grpc') {
    te = new OLTPTraceExporterGRPC();
  } else if (protocol === 'http/json' || protocol === 'http_json' || protocol === 'httpjson') {
    te = new OLTPTraceExporterHTTPjson();
  } else {
    te = new OLTPTraceExporterHTTPprotobuf();
  }

  const tp = new WebTracerProvider({
    spanProcessors: [
      new BatchSpanProcessor(te, {
        maxQueueSize: 100,
        maxExportBatchSize: 10,
        scheduledDelayMillis: 500,
        exportTimeoutMillis: 30000,
      }),
    ],
  });

  tp.register();
}