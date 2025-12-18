import { configure, getLogger, getConsoleSink, withFilter, getLevelFilter, parseLogLevel } from "@logtape/logtape";
import { getOpenTelemetrySink } from "@logtape/otel";
import { logs } from '@opentelemetry/api-logs';

const loggerProvider = logs.getLoggerProvider();

export async function setupLogging() {
  await configure({
    sinks: {
      filteredConsole: (() => {
        const minLevelRaw = (process.env.STDOUT_LOG_LEVEL ?? "info").toLowerCase();
        //handles aliasing like 'warn' to 'warning'
        const aliasMap: Record<string, string> = { warn: "warning" };
        const minLevel = aliasMap[minLevelRaw] ?? minLevelRaw;
        return withFilter(
          getConsoleSink(),
          getLevelFilter(parseLogLevel(minLevel))
        );
      })(),
      filteredOtel: (() => {
        const minLevelRaw = (process.env.OTEL_LOG_LEVEL ?? "info").toLowerCase();
        //handles aliasing like 'warn' to 'warning'
        const aliasMap: Record<string, string> = { warn: "warning" };
        const minLevel = aliasMap[minLevelRaw] ?? minLevelRaw;
        return withFilter(
          getOpenTelemetrySink({ loggerProvider } ),
          getLevelFilter(parseLogLevel(minLevel))
        );
      })(),
    },
    loggers: [
      { category: [], sinks: ["filteredConsole", "filteredOtel"] },
    ],
  });
}

export { getLogger };
