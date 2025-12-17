import './otel';
import index from './index.html';
import { setupLogging, getLogger } from './logger';
import { startServer, attachGracefulShutdown, routes } from './server';
import { trace } from '@opentelemetry/api';

await setupLogging();

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

const server = startServer(index, routes);
attachGracefulShutdown(server);

// Create a test span to verify OTEL setup
const tracer = trace.getTracer('local-test-tracer');
tracer.startActiveSpan('test-span', span => {
  span.addEvent('test-event', { foo: 'bar' });
  setTimeout(() => {
    span.end();
  }, 200);
});