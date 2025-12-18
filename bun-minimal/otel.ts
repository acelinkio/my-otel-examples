import { OTLPLogExporter as OLTPLogExporterGRPC } from '@opentelemetry/exporter-logs-otlp-grpc';
import { OTLPLogExporter as OLTPLogExporterHTTPjson } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPLogExporter as OLTPLogExporterHTTPprotobuf } from '@opentelemetry/exporter-logs-otlp-proto';
import { OTLPMetricExporter as OLTPMetricsExporterGRPC } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPMetricExporter as OLTPMetricsExporterHTTPjson } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPMetricExporter as OLTPMetricsExporterHTTPprotobuf } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter as OLTPTraceExporterGRPC } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPTraceExporter as OLTPTraceExporterHTTPjson } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OLTPTraceExporterHTTPprotobuf } from '@opentelemetry/exporter-trace-otlp-proto';

import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
// web uses a different api
//import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor, NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { logs } from '@opentelemetry/api-logs';
import { metrics } from '@opentelemetry/api';

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
  logs.setGlobalLoggerProvider(new LoggerProvider());
  metrics.setGlobalMeterProvider(new MeterProvider());
} else {
  let le: any;
  let me: any;
  let te: any;

  if (protocol === 'grpc') {
    le = new OLTPLogExporterGRPC();
    me = new OLTPMetricsExporterGRPC();
    te = new OLTPTraceExporterGRPC();
  } else if (protocol === 'http/json' || protocol === 'http_json' || protocol === 'httpjson') {
    le = new OLTPLogExporterHTTPjson();
    me = new OLTPMetricsExporterHTTPjson();
    te = new OLTPTraceExporterHTTPjson();
  } else {
    le = new OLTPLogExporterHTTPprotobuf();
    me = new OLTPMetricsExporterHTTPprotobuf();}
    te = new OLTPTraceExporterHTTPprotobuf();

  const lp = new LoggerProvider({
    processors: [new BatchLogRecordProcessor(le)]
  });

  const mp = new MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter: me,
        exportIntervalMillis: 5000,
      }),
    ],
  });

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
  logs.setGlobalLoggerProvider(lp);
  metrics.setGlobalMeterProvider(mp);
  tp.register();
}