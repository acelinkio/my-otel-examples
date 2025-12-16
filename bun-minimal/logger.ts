import { configure, getLogger, getConsoleSink } from "@logtape/logtape";
import { getOpenTelemetrySink } from "@logtape/otel";

export async function setupLogging() {
  await configure({
    sinks: {
      console: getConsoleSink(),
      otel: getOpenTelemetrySink(),
    },
    loggers: [
      { category: [], sinks: ["console", "otel"], lowestLevel: "debug" },
    ],
  });
}

export { getLogger };
