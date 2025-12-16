import figlet from 'figlet';
import index from './index.html';
import { configure, getLogger, getConsoleSink } from "@logtape/logtape";
import { getOpenTelemetrySink } from "@logtape/otel";

await configure({
  sinks: {
    console: getConsoleSink(),
    otel: getOpenTelemetrySink({
      serviceName: "my-service123",
    }),
  },
  loggers: [
    { category: [], sinks: ["console", "otel"], lowestLevel: "debug" },
  ],
});

const logger = getLogger();

let server: ReturnType<typeof Bun.serve> | undefined;

['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, async () => {
    try {
      server?.stop();        // stop Bun server
      process.exit(0);       // exit process
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
});

logger.info("User {username} (ID: {userId}) logged in at {loginTime}", {
  userId: 123456,
  username: "johndoe",
  loginTime: new Date(),
});

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

logger.info("acelink1", { event: "acelink1" });
logger.info("Listening on {url}", { url: server?.url });