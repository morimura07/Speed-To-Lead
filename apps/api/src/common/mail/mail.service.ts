import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/config.module';

export interface SendMailInput {
  to: string;
  subject: string;
  body: string;
}

/**
 * Outbound email abstraction. In development (and until a real provider is wired
 * in a later phase) this logs messages so flows like password reset and license
 * delivery are fully testable without an SMTP/ESP account. Swapping in a real
 * transport (Resend/SES/Postmark) is a single-class change.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: AppConfigService) {}

  async send({ to, subject, body }: SendMailInput): Promise<void> {
    // Real transport goes here in a later phase; for now, log in dev.
    if (!this.config.isProduction) {
      this.logger.log(`✉  [DEV MAIL] to=${to} subject="${subject}"\n${body}`);
    } else {
      this.logger.warn(`Email transport not configured; dropping mail to ${to} ("${subject}")`);
    }
    return Promise.resolve();
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
