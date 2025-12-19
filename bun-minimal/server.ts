import figlet from 'figlet';
import { metrics as metricapi } from '@opentelemetry/api';

export function startServer(indexHtml: any, extraRoutes: Record<string, any> = {}) {
  const routes = {
    "/": indexHtml,
    ...extraRoutes,
  };

  return Bun.serve({
    port: 8025,
    routes,
  });
}

export function attachGracefulShutdown(server: ReturnType<typeof Bun.serve>) {
  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, async () => {
      try {
        server?.stop();
        process.exit(0);
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    });
  });
}


export function qHandler() {
  const testmeter = metricapi.getMeterProvider().getMeter("local-test-meter");
  const counter = testmeter.createCounter('requests', { description: 'Request count' });
  const body = figlet.textSync('Bun123!');
  counter.add(1, { route: '/q' });
  return new Response(body);
}

export const routes = {
  "/q": qHandler,
};
