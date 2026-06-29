import { Body, Controller, HttpCode, HttpStatus, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { SlackService } from './slack.service';

/**
 * Public Slack Events API endpoint. Verifies the Slack signature (when a signing
 * secret is configured), answers the url_verification handshake, and dispatches
 * message events. Authenticated by signature, not a bearer token.
 */
@Controller('slack')
export class SlackController {
  constructor(private readonly slack: SlackService) {}

  @Post('events')
  @HttpCode(HttpStatus.OK)
  async events(@Req() req: RawBodyRequest<Request>, @Body() body: Record<string, unknown>) {
    const rawBody = req.rawBody?.toString('utf8') ?? '';
    const valid = this.slack.verifySignature(
      rawBody,
      req.header('X-Slack-Signature'),
      req.header('X-Slack-Request-Timestamp'),
    );
    if (!valid) throw new UnauthorizedException('Invalid Slack signature');

    const result = await this.slack.handleEvent(body);
    // url_verification expects the challenge echoed back at the top level.
    return result.challenge !== undefined ? { challenge: result.challenge } : { ok: true };
  }
}
