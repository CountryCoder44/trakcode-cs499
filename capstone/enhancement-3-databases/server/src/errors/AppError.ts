/**
 * Typed error hierarchy for domain failures that need a specific HTTP status,
 * replacing the previous pattern of throwing a plain `Error` and having each
 * controller's own handler guess the right status from
 * `err.message.includes('some substring')`. That pattern was fragile (a
 * reworded error message silently changed the HTTP status a client saw) and
 * duplicated across ten controller files. Every subclass here is mapped to a
 * response once, centrally, in `middleware/errorHandler.ts` — a service just
 * throws the specific error that describes what actually went wrong, and the
 * HTTP shape follows automatically.
 *
 * Only failures that legitimately need a non-500 status get a subclass here.
 * Anything else (a real bug, an unexpected exception) is deliberately left as
 * a plain `Error` and falls through to the generic 500 in `errorHandler.ts`
 * — wrapping every possible failure in a typed class would hide genuine bugs
 * behind a reassuring-looking type instead of surfacing them.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.details = details;
    // Restores `instanceof AppError` checks in transpiled output — see
    // https://github.com/microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** The Anthropic API key isn't configured — an AI-backed feature can't run at all. */
export class AiUnavailableError extends AppError {
  constructor(message = 'AI_API_KEY is not configured — this feature is unavailable') {
    super(message, 503);
  }
}

/**
 * AI problem generation exhausted its retry budget without producing a
 * validated problem (see `problemGeneration.service.ts`). Real, if rare —
 * generation and real sandbox validation both have to succeed.
 */
export class GenerationExhaustedError extends AppError {
  constructor(message: string) {
    super(message, 503);
  }
}

/** The execution-sandbox microservice is unreachable or misconfigured. */
export class SandboxUnavailableError extends AppError {
  constructor(message: string) {
    super(message, 503);
  }
}

/** A referenced record does not exist, or does not belong to this caller. */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

/** The caller needs a linked GitHub account before this action can proceed. */
export class GithubNotLinkedError extends AppError {
  constructor(message = 'Link a GitHub account before pushing to your portfolio') {
    super(message, 400);
  }
}

/** The GitHub API itself returned a non-2xx response. */
export class GithubApiError extends AppError {
  constructor(message: string) {
    super(message, 502);
  }
}
