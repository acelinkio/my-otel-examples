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
import { logs as logapi } from '@opentelemetry/api-logs';
import { metrics as metricapi, trace as traceapi } from '@opentelemetry/api';
import { getLogger } from "@logtape/logtape";


const logger = getLogger();

// used to get env vars in both node and browser-like environments
function getEnv(name: string): string | undefined {
  if (typeof process !== 'undefined' && (process as any).env) {
    return (process as any).env[name];
  }
  const g = globalThis as any;
  return g && g[name] ? g[name] : undefined;
}

export function setupOtel() {
  logger.info("Configuring OTEL");
  const protocol = (getEnv('OTEL_EXPORTER_OTLP_PROTOCOL') || '').toLowerCase();

  let le: any;
  let me: any;
  let te: any;

  switch (true) {
    case !getEnv('OTEL_EXPORTER_OTLP_ENDPOINT'):
      logger.info("Using OLTP type: {type}", {
        type: "noop",
      });
      le = null;
      me = null;
      te = null;
      break;
    case protocol === 'grpc':
      logger.info("Using OLTP type: {type}", {
        type: "grpc",
      });
      le = new OLTPLogExporterGRPC();
      me = new OLTPMetricsExporterGRPC();
      te = new OLTPTraceExporterGRPC();
      break;
    case protocol === 'http/json':
    case protocol === 'http_json':
    case protocol === 'httpjson':
      logger.info("Using OLTP type: {type}", {
        type: "http/json",
      });
      le = new OLTPLogExporterHTTPjson();
      me = new OLTPMetricsExporterHTTPjson();
      te = new OLTPTraceExporterHTTPjson();
      break;
    default:
      logger.info("Using OLTP type: {type}", {
        type: "http/protobuf",
      });
      le = new OLTPLogExporterHTTPprotobuf();
      me = new OLTPMetricsExporterHTTPprotobuf();
      te = new OLTPTraceExporterHTTPprotobuf();
      break;
  }

  let lp = new LoggerProvider()
  let mp = new MeterProvider();
  let tp = new NodeTracerProvider();

  if (le) {
    lp = new LoggerProvider({
      processors: [new BatchLogRecordProcessor(le)]
    });
  }

  if (me) {
    mp = new MeterProvider({
      readers: [
        new PeriodicExportingMetricReader({
          exporter: me,
          exportIntervalMillis: 5000,
        }),
      ],
    });
  }

  if (te) {
    tp = new NodeTracerProvider({
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

  logapi.setGlobalLoggerProvider(lp);
  metricapi.setGlobalMeterProvider(mp);
  traceapi.setGlobalTracerProvider(tp);
}