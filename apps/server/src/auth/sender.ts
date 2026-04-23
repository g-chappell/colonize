// MagicLinkSender — abstraction over magic-link delivery. Today the
// production binding is `ConsoleMagicLinkSender` (writes the link to the
// server log) so the auth flow is end-to-end exercisable on a fresh deploy
// without any SMTP / Resend / SES dependency. The TASK-082 scope is the
// endpoints + cookie + table schema; real email delivery is a follow-up
// task that swaps in a provider-specific Sender via the buildApp option.

export interface MagicLinkPayload {
  email: string;
  token: string;
  link: string;
}

export interface MagicLinkSender {
  send(payload: MagicLinkPayload): Promise<void>;
}

export interface ConsoleSenderLogger {
  info(message: string, meta?: Record<string, unknown>): void;
}

export class ConsoleMagicLinkSender implements MagicLinkSender {
  constructor(private readonly logger: ConsoleSenderLogger) {}

  async send(payload: MagicLinkPayload): Promise<void> {
    this.logger.info(`magic-link issued for ${payload.email}`, {
      email: payload.email,
      link: payload.link,
    });
  }
}

// Test-only sender — records every call so suites can assert delivery.
export class RecordingMagicLinkSender implements MagicLinkSender {
  readonly sent: MagicLinkPayload[] = [];

  async send(payload: MagicLinkPayload): Promise<void> {
    this.sent.push(payload);
  }
}
