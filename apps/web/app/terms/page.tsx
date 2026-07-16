import type { Metadata } from 'next';
import { LegalShell, Section } from '../../components/legal';

export const metadata: Metadata = { title: 'Terms of Service — LeadArrow' };

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="2026">
      <Section heading="Agreement">
        <p>
          By creating an account or using LeadArrow, you agree to these terms on behalf of your
          organization. If you don&apos;t agree, don&apos;t use the service.
        </p>
      </Section>
      <Section heading="The service">
        <p>
          LeadArrow ingests leads from your connected systems and alerts and routes them to your
          sales reps across phone, browser, and push, with analytics and related features. We may
          improve or change features over time.
        </p>
      </Section>
      <Section heading="Trials & billing">
        <p>
          New organizations may receive a free trial. After the trial, continued use requires a
          paid subscription. Fees are billed in advance and are non-refundable except where
          required by law. Final pricing depends on usage as described at signup.
        </p>
      </Section>
      <Section heading="Acceptable use">
        <p>
          You are responsible for having the legal right to contact the phone numbers you add and
          for complying with all applicable telemarketing, calling, and messaging laws (including
          TCPA and carrier requirements). Don&apos;t use the service unlawfully or to send content
          you&apos;re not authorized to send.
        </p>
      </Section>
      <Section heading="Third-party services">
        <p>
          The service integrates with third parties (telephony, payments, CRMs, messaging). Your
          use of those is subject to their terms; we&apos;re not responsible for their acts or
          outages.
        </p>
      </Section>
      <Section heading="Warranty & liability">
        <p>
          The service is provided &quot;as is,&quot; without warranties. To the extent permitted by
          law, our aggregate liability is limited to the fees you paid in the preceding three
          months.
        </p>
      </Section>
      <Section heading="Termination">
        <p>
          You may cancel at any time. We may suspend or terminate accounts that violate these
          terms. On termination, your right to use the service ends.
        </p>
      </Section>
      <Section heading="Contact">
        <p>Questions about these terms: legal@leadarrow.example (replace with your address).</p>
      </Section>
    </LegalShell>
  );
}
