import figlet from 'figlet';
import index from './index.html';

import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';

const loggerExporter = new OTLPLogExporter();
const loggerProvider = new LoggerProvider({
  processors: [new BatchLogRecordProcessor(loggerExporter)]
});

let server: ReturnType<typeof Bun.serve> | undefined;

['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, async () => {
    try {
      await loggerProvider.shutdown();
      server?.stop();        // stop Bun server
      process.exit(0);       // exit process
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
});

// logging
const logger = loggerProvider.getLogger('example-logger');
logger.emit({ body: 'example-log' });

server = Bun.serve({
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