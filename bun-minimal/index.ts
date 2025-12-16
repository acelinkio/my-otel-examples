import index from './index.html';
import { setupLogging, getLogger } from './logger';
import { startServer, attachGracefulShutdown, routes } from './server';

await setupLogging();

const logger = getLogger();

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