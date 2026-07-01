import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { AppConfigService } from '../../config/config.module';

export interface SendMailInput {
  to: string;
  subject: string;
  body: string;
}

/**
 * Outbound email. Uses an SMTP transport when configured (any provider — SES,
 * Postmark, Mailgun, …); otherwise logs messages to the console so flows like
 * password reset and license delivery stay fully testable without an ESP.
 * Swapping to a different transport (e.g. a Resend HTTP client) is a change to
 * this one class.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transport: Transporter | null = null;

  constructor(private readonly config: AppConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get('SMTP_HOST'));
  }

  private getTransport(): Transporter {
    if (!this.transport) {
      const user = this.config.get('SMTP_USER');
      const pass = this.config.get('SMTP_PASS');
      this.transport = createTransport({
        host: this.config.get('SMTP_HOST'),
        port: this.config.get('SMTP_PORT'),
        secure: this.config.get('SMTP_SECURE'),
        auth: user && pass ? { user, pass } : undefined,
      });
    }
    return this.transport;
  }

  async send({ to, subject, body }: SendMailInput): Promise<void> {
    if (!this.isConfigured()) {
      // No SMTP configured — log instead of sending (dev / not-yet-wired).
      this.logger.log(`✉  [DEV MAIL] to=${to} subject="${subject}"\n${body}`);
      return;
    }
    try {
      await this.getTransport().sendMail({
        from: this.config.get('MAIL_FROM'),
        to,
        subject,
        text: body,
      });
      this.logger.debug(`Sent mail to ${to} ("${subject}")`);
    } catch (err) {
      // Mail failures must not break the primary operation (e.g. signup).
      this.logger.error(`Failed to send mail to ${to}: ${String(err)}`);
    }
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Reset your LeadArrow password',
      body: `We received a request to reset your password.\n\nReset it here (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
    });
  }

  async sendLicenseKey(to: string, code: string): Promise<void> {
    await this.send({
      to,
      subject: 'Your LeadArrow access key',
      body: `Welcome to LeadArrow.\n\nYour access key: ${code}\n\nUse it to create your account.`,
    });
  }
}
