export const MAIL_PORT = Symbol("MAIL_PORT");

export interface MailPort {
  sendVerification(input: { to: string; link: string }): Promise<void>;
  sendPasswordRecovery(input: { to: string; link: string }): Promise<void>;
}
