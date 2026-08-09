/** Logger for Job.log + console. Redacts secrets so tokens never hit logs (§10). */

const SECRET_PATTERNS: RegExp[] = [
  /(bot\d+:[A-Za-z0-9_-]{10,})/g, // telegram bot token
  /(EAA[A-Za-z0-9]{20,})/g, // facebook/meta long tokens
  /([A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{20,})/g, // jwt-ish
];

export function redact(input: string): string {
  let out = input;
  for (const re of SECRET_PATTERNS) out = out.replace(re, "«redacted»");
  // redact common env-var value leaks: TOKEN=..., SECRET=...
  out = out.replace(/((?:TOKEN|SECRET|PASSWORD|ACCESS_TOKEN)\s*[=:]\s*)(\S+)/gi, "$1«redacted»");
  return out;
}

export interface JobLogger {
  lines: string[];
  log: (msg: string) => void;
  toString: () => string;
}

/** A logger that accumulates lines (for Job.log) while also printing to console. */
export function makeJobLogger(prefix = ""): JobLogger {
  const lines: string[] = [];
  return {
    lines,
    log(msg: string) {
      const clean = redact(msg);
      const stamped = prefix ? `[${prefix}] ${clean}` : clean;
      lines.push(stamped);
      // eslint-disable-next-line no-console
      console.log(stamped);
    },
    toString() {
      return lines.join("\n");
    },
  };
}

export function info(msg: string) {
  // eslint-disable-next-line no-console
  console.log(redact(msg));
}

export function error(msg: string) {
  // eslint-disable-next-line no-console
  console.error(redact(msg));
}
