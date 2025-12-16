import { configure, getLogger, getConsoleSink, withFilter, getLevelFilter, parseLogLevel } from "@logtape/logtape";
import { getOpenTelemetrySink } from "@logtape/otel"; // may want to write our own setup.  Uses simple instead of batch proocessing

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
      filteredOtel: (() => {
        const minLevelRaw = (process.env.OTEL_LOG_LEVEL ?? "info").toLowerCase();
        //handles aliasing like 'warn' to 'warning'
        const aliasMap: Record<string, string> = { warn: "warning" };
        const minLevel = aliasMap[minLevelRaw] ?? minLevelRaw;
        const levelFilter = getLevelFilter(parseLogLevel(minLevel));
        return withFilter(
          getOpenTelemetrySink(),
          record => levelFilter(record)
        );
      })(),
    },
    loggers: [
      { category: [], sinks: ["filteredConsole", "filteredOtel"] },
    ],
  });
}

export { getLogger };
