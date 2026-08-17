import { Resend } from "resend";

import type { MailPort } from "./mail.port.js";

const STAGING_SENDER = "WishToday <onboarding@resend.dev>";

export class ResendMailAdapter implements MailPort {
  private readonly resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async sendVerification(input: { to: string; link: string }): Promise<void> {
    await this.send({
      to: input.to,
      subject: "Verify your WishToday email",
      text: `Open this link to verify your email: ${input.link}`,
    });
  }

  async sendPasswordRecovery(input: { to: string; link: string }): Promise<void> {
    await this.send({
      to: input.to,
      subject: "Reset your WishToday password",
      text: `Open this link to reset your password: ${input.link}`,
    });
  }

  private async send(input: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    const result = await this.resend.emails.send({
      from: STAGING_SENDER,
      ...input,
    });
    if (result.error) throw new Error("Mail provider rejected the request");
  }
}

export class DisabledMailAdapter implements MailPort {
  async sendVerification(): Promise<void> {
    throw new Error("Mail delivery is not configured");
  }

  async sendPasswordRecovery(): Promise<void> {
    throw new Error("Mail delivery is not configured");
  }
}
