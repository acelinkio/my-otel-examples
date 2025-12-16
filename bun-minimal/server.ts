import figlet from 'figlet';

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
  const body = figlet.textSync('Bun123!');
  return new Response(body);
}

export const routes = {
  "/q": qHandler,
};
