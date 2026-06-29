import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/config.module';

/**
 * Pushover emergency-notification channel. Optional: no-ops (with a warning)
 * until PUSHOVER_APP_TOKEN is configured. Used to alert a rep on a lead even
 * when their phone is silent / in Do Not Disturb.
 */
@Injectable()
export class PushoverService {
  private readonly logger = new Logger(PushoverService.name);

  constructor(private readonly config: AppConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get('PUSHOVER_APP_TOKEN'));
  }

  async notify(userKey: string, title: string, message: string): Promise<void> {
    const token = this.config.get('PUSHOVER_APP_TOKEN');
    if (!token) {
      this.logger.debug('Pushover not configured; skipping notification');
      return;
    }
    try {
      const res = await fetch('https://api.pushover.net/1/messages.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token, user: userKey, title, message, priority: '1' }),
      });
      if (!res.ok) {
        this.logger.warn(`Pushover responded ${res.status} for user ${userKey.slice(0, 6)}…`);
      }
    } catch (err) {
      this.logger.warn(`Pushover notification failed: ${String(err)}`);
    }
  }
}
