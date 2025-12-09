import figlet from 'figlet';
import index from './index.html';

import {
  LoggerProvider,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';

const collectorOptions = {
  // url is optional and can be omitted - default is http://localhost:4317
  // Unix domain sockets are also supported: 'unix:///path/to/socket.sock'
  url: 'http://otel-collector.opentelemetry.svc.cluster.local:4317',
};

const loggerExporter = new OTLPLogExporter(collectorOptions);
const loggerProvider = new LoggerProvider({
  processors: [new SimpleLogRecordProcessor(loggerExporter)]
});

['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => loggerProvider.shutdown().catch(console.error));
});

// logging
const logger = loggerProvider.getLogger('example-logger');
logger.emit({ body: 'example-log' });

const server = Bun.serve({
  port: 8025,
  routes: {
    "/": index, 
    "/q": () => { 
      const body = figlet.textSync('Bun123!'); 
      return new Response(body); 
    } 
  }
});

console.log(`Listening on ${server.url}`);