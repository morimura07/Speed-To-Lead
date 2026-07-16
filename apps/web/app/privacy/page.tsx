import type { Metadata } from 'next';
import { LegalShell, Section } from '../../components/legal';

export const metadata: Metadata = { title: 'Privacy Policy — LeadArrow' };

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="2026">
      <Section heading="Overview">
        <p>
          LeadArrow (&quot;we&quot;) provides a speed-to-lead alerting and routing platform for
          sales teams. This policy explains what data we process and why. It applies to the
          LeadArrow application and website.
        </p>
        <p>
          LeadArrow is operated by <strong>Eliot Samurin</strong> as a sole proprietor. You can
          reach us using the contact details at the end of this policy.
        </p>
      </Section>
      <Section heading="Information we process">
        <p>
          <strong>Account data:</strong> company name, your name, email, phone number, and
          authentication credentials.
        </p>
        <p>
          <strong>Operational data:</strong> sales reps you add (names, phone numbers,
          availability), leads received from your connected CRMs/Slack, call and alert records,
          and analytics derived from them.
        </p>
        <p>
          <strong>Billing data:</strong> subscription status and identifiers from our payment
          processor. We do not store card numbers.
        </p>
      </Section>
      <Section heading="How we use it">
        <p>
          To deliver the service — ingesting leads, routing and alerting reps, placing calls and
          messages, producing analytics, and managing your subscription — and to secure and
          support the platform.
        </p>
      </Section>
      <Section heading="Third-party processors">
        <p>
          We share data as needed with subprocessors that power the service, including
          telephony/SMS (Twilio), payments (Stripe), messaging (Slack), your connected CRMs
          (Close, HubSpot, GoHighLevel, Salesforce), email delivery, cloud hosting, database, and
          error monitoring providers. Each processes data only to provide their function.
        </p>
      </Section>
      <Section heading="Calls & SMS consent">
        <p>
          By adding a rep&apos;s phone number and enabling notifications, you confirm you have the
          right to contact that number by call and SMS. Recipients can opt out of SMS at any time
          by replying <strong>STOP</strong>, or get help by replying <strong>HELP</strong>; we
          honor opt-outs and suppress further messages. Message frequency varies, and message and
          data rates may apply.
        </p>
        <p>
          <strong>
            We do not sell or share mobile phone numbers or SMS consent information with third
            parties for marketing or promotional purposes.
          </strong>{' '}
          Phone numbers are used solely to deliver the alerting and routing service you configure,
          and are shared only with the service providers (such as our telephony provider) needed to
          send those messages on your behalf.
        </p>
      </Section>
      <Section heading="Data retention & your rights">
        <p>
          We retain data for as long as your account is active and as required for legal and
          operational purposes. You may request access, correction, export, or deletion of your
          data by contacting us; deleting your organization removes its associated data.
        </p>
      </Section>
      <Section heading="Contact">
        <p>Questions about this policy: privacy@getleadarrow.com.</p>
      </Section>
    </LegalShell>
  );
}
