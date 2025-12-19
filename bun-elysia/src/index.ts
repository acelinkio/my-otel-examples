import { Elysia } from "elysia";
import { opentelemetry, record as elysiaRecord } from '@elysiajs/opentelemetry';
import { getLogger } from "@logtape/logtape";
import { setupOtel } from './otel';
import { setupLogging } from './logger';
import { elysiaLogger } from "@logtape/elysia";


await setupLogging();
setupOtel();
const logger = getLogger();

// https://elysiajs.com/patterns/opentelemetry

const app = new Elysia()
	.use(elysiaLogger(
		{
			skip: (ctx) => ctx.path === "/api/health",
		}
	))
  .use(opentelemetry())
  .get("/", () => {
    return elysiaRecord('testtrace', () => {
      return "hello123"
    })
  })
  .listen(3000);

logger.info("Elysia is running at {hostname}:{port}", {
  hostname: app.server?.hostname,
  port: app.server?.port,
});