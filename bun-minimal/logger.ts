import { configure, getLogger, getConsoleSink, withFilter, getLevelFilter, parseLogLevel } from "@logtape/logtape";
import { getOpenTelemetrySink } from "@logtape/otel";

export async function setupLogging() {
  await configure({
    sinks: {
      filteredConsole: (() => {
        const minLevelRaw = (process.env.STDOUT_LOG_LEVEL ?? "info").toLowerCase();
        //handles aliasing like 'warn' to 'warning'
        const aliasMap: Record<string, string> = { warn: "warning" };
        const minLevel = aliasMap[minLevelRaw] ?? minLevelRaw;
        const levelFilter = getLevelFilter(parseLogLevel(minLevel));
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
