import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/config.module';
import { MailService } from '../common/mail/mail.service';
import { hasActiveAccess, trialDaysRemaining } from './subscription.util';

/**
 * Stripe subscription billing. The client is created lazily and every flow is
 * gated on configuration, so the app runs without billing until Stripe keys are
 * set. Payment success activates the org and surfaces their access key.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private client: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly mail: MailService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.get('STRIPE_SECRET_KEY') && this.config.get('STRIPE_PRICE_ID'));
  }

  private getClient(): Stripe {
    if (!this.config.get('STRIPE_SECRET_KEY')) {
      throw new ServiceUnavailableException('Billing is not configured');
    }
    this.client ??= new Stripe(this.config.get('STRIPE_SECRET_KEY')!);
    return this.client;
  }

  /** Create a Stripe Checkout Session for the subscription and return its URL. */
  async createCheckout(orgId: string, email: string): Promise<{ url: string }> {
    if (!this.isConfigured()) throw new ServiceUnavailableException('Billing is not configured');
    const client = this.getClient();
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });

    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await client.customers.create({ email, metadata: { orgId } });
      customerId = customer.id;
      await this.prisma.organization.update({ where: { id: orgId }, data: { stripeCustomerId: customerId } });
    }

    const appUrl = this.config.get('APP_URL');
    const session = await client.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: this.config.get('STRIPE_PRICE_ID')!, quantity: 1 }],
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing`,
      metadata: { orgId },
      subscription_data: { metadata: { orgId } },
    });

    if (!session.url) throw new ServiceUnavailableException('Could not start checkout');
    return { url: session.url };
  }

  async getStatus(orgId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: {
        subscriptionStatus: true,
        trialEndsAt: true,
        redeemedKey: { select: { code: true } },
      },
    });
    return {
      subscriptionStatus: org.subscriptionStatus,
      trialEndsAt: org.trialEndsAt?.toISOString() ?? null,
      trialDaysRemaining: trialDaysRemaining(org),
      hasAccess: hasActiveAccess(org),
      billingConfigured: this.isConfigured(),
      licenseKey: org.redeemedKey?.code ?? null,
    };
  }

  // ── Webhook ─────────────────────────────────────────────────────────────────

  constructEvent(rawBody: string, signature: string): Stripe.Event {
    const secret = this.config.get('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new ServiceUnavailableException('Webhook secret not configured');
    return this.getClient().webhooks.constructEvent(rawBody, signature, secret);
  }

  async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orgId = session.metadata?.orgId;
        if (!orgId) return;
        await this.prisma.organization.update({
          where: { id: orgId },
          data: {
            subscriptionStatus: 'active',
            stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
            stripeSubscriptionId:
              typeof session.subscription === 'string' ? session.subscription : undefined,
          },
        });
        await this.emailConfirmation(orgId);
        this.logger.log(`Subscription activated for org ${orgId}`);
        break;
      }
      case 'customer.subscription.deleted':
        await this.updateBySubscription(event.data.object.id, 'canceled');
        break;
      case 'invoice.payment_failed':
        if (typeof event.data.object.subscription === 'string') {
          await this.updateBySubscription(event.data.object.subscription, 'past_due');
        }
        break;
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  private async updateBySubscription(subscriptionId: string, status: 'canceled' | 'past_due') {
    await this.prisma.organization.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { subscriptionStatus: status },
    });
  }

  private async emailConfirmation(orgId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        redeemedKey: { select: { code: true } },
        users: { where: { role: 'admin' }, select: { email: true }, take: 1 },
      },
    });
    const email = org?.users[0]?.email;
    if (!email) return;
    const key = org?.redeemedKey?.code;
    await this.mail.send({
      to: email,
      subject: 'Your LeadArrow subscription is active',
      body: `Thanks for subscribing — ${org?.name} is now on a paid plan.${key ? `\n\nYour account access key: ${key}` : ''}`,
    });
  }
}
