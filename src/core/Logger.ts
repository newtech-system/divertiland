// Logger simples com prefixo por módulo. Guarda as últimas mensagens para a ferramenta de dev.

type Level = 'debug' | 'info' | 'warn' | 'error';

const history: { level: Level; scope: string; msg: string; t: number }[] = [];
const MAX_HISTORY = 200;

function push(level: Level, scope: string, args: unknown[]) {
  const msg = args.map((a) => (typeof a === 'string' ? a : safeStringify(a))).join(' ');
  history.push({ level, scope, msg, t: Date.now() });
  if (history.length > MAX_HISTORY) history.shift();
}

function safeStringify(v: unknown): string {
  try {
    if (v instanceof Error) return `${v.name}: ${v.message}`;
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function createLogger(scope: string) {
  const prefix = `[${scope}]`;
  return {
    debug: (...a: unknown[]) => {
      push('debug', scope, a);
      if (import.meta.env?.DEV) console.debug(prefix, ...a);
    },
    info: (...a: unknown[]) => {
      push('info', scope, a);
      console.info(prefix, ...a);
    },
    warn: (...a: unknown[]) => {
      push('warn', scope, a);
      console.warn(prefix, ...a);
    },
    error: (...a: unknown[]) => {
      push('error', scope, a);
      console.error(prefix, ...a);
    },
  };
}

export function getLogHistory() {
  return history.slice();
}
