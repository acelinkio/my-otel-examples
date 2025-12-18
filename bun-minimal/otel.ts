import { OTLPTraceExporter as OLTPTraceExporterHTTPjson } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OLTPTraceExporterHTTPprotobuf } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPTraceExporter as OLTPTraceExporterGRPC } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter as OLTPMetricsExporterHTTPjson } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPMetricExporter as OLTPMetricsExporterHTTPprotobuf } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPMetricExporter as OLTPMetricsExporterGRPC } from '@opentelemetry/exporter-metrics-otlp-grpc';

import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { metrics } from '@opentelemetry/api';
// web uses a different api
//import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

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
export let meter: any;

if (! getEnv('OTEL_EXPORTER_OTLP_ENDPOINT')) {
  const tenoop = new SimpleNoopTracerProvider();
  tenoop.register();
  meter = metrics.getMeter('local-test-meter');
} else {
  let te: any;
  let me: any;

  if (protocol === 'grpc') {
    te = new OLTPTraceExporterGRPC();
    me = new OLTPMetricsExporterGRPC();
  } else if (protocol === 'http/json' || protocol === 'http_json' || protocol === 'httpjson') {
    te = new OLTPTraceExporterHTTPjson();
    me = new OLTPMetricsExporterHTTPjson();
  } else {
    te = new OLTPTraceExporterHTTPprotobuf();
    me = new OLTPMetricsExporterHTTPprotobuf();}

  const tp = new NodeTracerProvider({
    spanProcessors: [
      new BatchSpanProcessor(te, {
        maxQueueSize: 100,
        maxExportBatchSize: 10,
        scheduledDelayMillis: 500,
        exportTimeoutMillis: 30000,
      }),
    ],
  });

  const mp = new MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter: me,
        exportIntervalMillis: 5000,
      }),
    ],
  });
  meter = mp.getMeter('local-test-meter');
  tp.register();
}