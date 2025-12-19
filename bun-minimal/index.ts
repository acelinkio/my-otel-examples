import './otel';
import index from './index.html';
import { setupLogging } from './logger';
import { startServer, attachGracefulShutdown, routes } from './server';
import { trace as traceapi } from '@opentelemetry/api';
import { getLogger } from "@logtape/logtape";

setupLogging();

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