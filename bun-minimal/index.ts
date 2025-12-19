import index from './index.html';
import { setupOtel } from './otel';
import { setupLogging } from './logger';
import { trace as traceapi } from '@opentelemetry/api';
import { getLogger } from "@logtape/logtape";
import { startServer, attachGracefulShutdown, routes } from './server';

await setupLogging();
setupOtel();

const logger = getLogger();

// Create some log entries to verify logging setup
logger.warn("acelink1", { event: "acelink1" });
logger.info("User login successful", {
  userId: 444,
  method: "oauth",
  loginTime: new Date()
});
logger.info("User {username} (ID: {userId}) logged in at {loginTime}", {
  userId: 123456,
  username: "johndoe",
  loginTime: new Date(),
});

// Create a test span to verify OTEL setup
const tracer = traceapi.getTracerProvider().getTracer('local-test-tracer');
tracer.startActiveSpan('test-span', span => {
  span.addEvent('test-event', { foo: 'bar' });
  setTimeout(() => {
    span.end();
  }, 200);
});


const server = startServer(index, routes);
attachGracefulShutdown(server);