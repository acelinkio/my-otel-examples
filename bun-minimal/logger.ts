import { configure, getLogger, getConsoleSink, withFilter, getLevelFilter } from "@logtape/logtape";
import { getOpenTelemetrySink } from "@logtape/otel";

export async function setupLogging() {
  await configure({
    sinks: {
      filteredConsole: (() => {
        const minLevel = "info";
        const levelFilter = getLevelFilter(minLevel);
        return withFilter(
          getConsoleSink(),
          record => levelFilter(record)
        );
      })(),
      otel: getOpenTelemetrySink(),
    },
    loggers: [
      { category: [], sinks: ["filteredConsole", "otel"], lowestLevel: "debug" },
    ],
  });
}

export { getLogger };
