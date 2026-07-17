/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Bullets, Intro, LegalShell, Mail, Numbers, Section, SubSection } from '../../components/legal';

export const metadata: Metadata = { title: 'Privacy Policy — LeadArrow' };

export default function PrivacyPage() {
  return (
    <LegalShell title="LeadArrow Privacy Policy" effective="July 16, 2026" updated="July 16, 2026">
      <Intro>
        <p>
          This Privacy Policy explains how Eliot Samurin, an individual operating as a sole
          proprietor under the LeadArrow brand (<strong>"LeadArrow," "we," "us,"</strong> or{' '}
          <strong>"our"</strong>), collects, uses, discloses, and protects personal information
          through getleadarrow.com and LeadArrow's applications, browser extensions, integrations,
          lead-routing tools, alerts, analytics, support, and related services (collectively, the{' '}
          <strong>"Service"</strong>).
        </p>
        <p>
          This Policy applies to LeadArrow customers, prospective customers, website visitors,
          account owners, administrators, sales representatives, and other authorized users. It also
          explains how we process personal information about consumer leads on behalf of our
          business customers.
        </p>
        <p>
          The Service is intended for business use in the United States and is not intended for
          children or personal, family, or household use.
        </p>
      </Intro>

      <Section heading="1. LeadArrow's Role">
        <p>LeadArrow processes personal information in two principal roles:</p>
        <Numbers>
          <li>
            <strong>As a business or controller.</strong> We determine how and why we process
            information about website visitors, prospective customers, account owners, authorized
            users, billing contacts, and people who communicate directly with LeadArrow.
          </li>
          <li>
            <strong>As a service provider or processor for customers.</strong> Our business
            customers determine how and why their lead, CRM, and representative data is processed. We
            process that information on their instructions to provide lead ingestion, routing,
            alerts, integrations, and related services.
          </li>
        </Numbers>
        <p>
          If your information was submitted to LeadArrow by one of our customers, that customer is
          generally responsible for its privacy practices and for responding to your privacy
          request. You may contact the customer directly. We will reasonably assist the customer
          where required by law and technically feasible.
        </p>
        <p>
          LeadArrow currently sends SMS only to customer users and sales representatives who
          voluntarily enroll in operational LeadArrow Alerts. LeadArrow does not currently use the
          Service to send a customer's marketing or sales texts to consumer leads.
        </p>
      </Section>

      <Section heading="2. Personal Information We Collect">
        <p>The information we collect depends on how you interact with the Service.</p>

        <SubSection heading="2.1 Account and Profile Information">
          <p>We may collect:</p>
          <Bullets>
            <li>name;</li>
            <li>business email address;</li>
            <li>mobile or business telephone number;</li>
            <li>company or organization name;</li>
            <li>job title and role;</li>
            <li>account username or identifier;</li>
            <li>password hash and authentication information;</li>
            <li>account permissions;</li>
            <li>notification preferences;</li>
            <li>time zone;</li>
            <li>subscription, plan, and account status; and</li>
            <li>information provided during onboarding.</li>
          </Bullets>
        </SubSection>

        <SubSection heading="2.2 Customer and Representative Information">
          <p>
            We may collect information about a customer's owners, administrators, managers, setters,
            closers, sales representatives, employees, and contractors, including their contact
            information, account role, lead assignments, routing status, availability, notification
            selections, and Service activity.
          </p>
        </SubSection>

        <SubSection heading="2.3 Lead and CRM Information">
          <p>
            When a customer connects a CRM or another lead source, we may process information
            selected or made available by the customer, such as:
          </p>
          <Bullets>
            <li>lead name;</li>
            <li>telephone number;</li>
            <li>email address;</li>
            <li>general location or time zone;</li>
            <li>lead source and campaign;</li>
            <li>form-submission data;</li>
            <li>CRM record identifiers;</li>
            <li>assigned representative;</li>
            <li>lead status and disposition;</li>
            <li>appointment or booking information;</li>
            <li>routing history;</li>
            <li>response and activity timestamps;</li>
            <li>call metadata; and</li>
            <li>other CRM fields or notes that the customer chooses to make available.</li>
          </Bullets>
          <p>
            Customers control what data they submit and are responsible for ensuring that they have
            the necessary rights, notices, and consents.
          </p>
        </SubSection>

        <SubSection heading="2.4 SMS Alert and Consent Information">
          <p>For representatives who enroll in LeadArrow Alerts, we may process:</p>
          <Bullets>
            <li>mobile telephone number;</li>
            <li>SMS enrollment and opt-out status;</li>
            <li>date, time, source, and method of consent;</li>
            <li>the disclosure presented when consent was obtained;</li>
            <li>delivery, failure, and carrier-status information;</li>
            <li>STOP, START, HELP, and similar keyword events;</li>
            <li>notification type and routing event; and</li>
            <li>related compliance and suppression records.</li>
          </Bullets>
          <p>
            LeadArrow's application is not designed to store full SMS conversations. Our messaging
            provider processes the content needed to deliver operational alerts and automated
            responses and may retain message records under its own terms and policies. LeadArrow may
            retain templates, notification types, routing statistics, delivery statistics, and
            compliance records.
          </p>
        </SubSection>

        <SubSection heading="2.5 Call and Routing Information">
          <p>
            We may process call and routing statistics, including originating and destination
            telephone numbers, call time, duration, connection status, routing attempt, assigned
            representative, acceptance or pass status, and disposition.
          </p>
          <p>
            LeadArrow does not store call audio recordings or call transcripts. A connected CRM or
            telephony provider may record or transcribe calls independently at the customer's
            direction. Those providers' practices are governed by their own terms and privacy
            policies, and the customer is responsible for obtaining any legally required recording
            consent.
          </p>
        </SubSection>

        <SubSection heading="2.6 Integration Information">
          <p>When a customer connects a third-party service, we may process:</p>
          <Bullets>
            <li>integration account identifiers;</li>
            <li>API keys, OAuth tokens, webhook secrets, and similar credentials;</li>
            <li>connected account and workspace information;</li>
            <li>synchronization status;</li>
            <li>data mappings;</li>
            <li>webhook events; and</li>
            <li>error and diagnostic information.</li>
          </Bullets>
          <p>
            We use integration credentials to provide and secure the requested connection. Customers
            should grant only the permissions reasonably necessary for the integration.
          </p>
        </SubSection>

        <SubSection heading="2.7 Browser Extension and Application Information">
          <p>
            Our browser extension and applications may process information necessary to display
            alerts, connect to supported CRM pages, enable representative actions, maintain sessions,
            and provide requested features. Depending on the permissions granted, this may include
            supported page URLs, page context needed for an integration, extension interactions,
            notification activity, device information, and diagnostic events.
          </p>
          <p>
            LeadArrow does not use the browser extension to sell general browsing histories or track
            activity across unrelated websites for advertising.
          </p>
        </SubSection>

        <SubSection heading="2.8 Technical and Usage Information">
          <p>We and our service providers may automatically collect:</p>
          <Bullets>
            <li>IP address;</li>
            <li>browser type and version;</li>
            <li>device type and operating system;</li>
            <li>approximate location inferred from IP address;</li>
            <li>language and time zone;</li>
            <li>referring and exit pages;</li>
            <li>pages and features used;</li>
            <li>login and activity timestamps;</li>
            <li>session, cookie, and device identifiers;</li>
            <li>crash and error reports;</li>
            <li>performance and diagnostic information; and</li>
            <li>security and fraud-prevention events.</li>
          </Bullets>
        </SubSection>

        <SubSection heading="2.9 Billing and Transaction Information">
          <p>
            We may collect billing name, billing contact information, subscription plan, invoices,
            payment status, transaction identifiers, limited payment-method details such as card
            brand and last four digits, and tax-related information.
          </p>
          <p>
            Payment processing is handled by Stripe or another disclosed payment processor. LeadArrow
            does not receive or store complete payment-card numbers or card security codes.
          </p>
        </SubSection>

        <SubSection heading="2.10 Communications and Support">
          <p>
            We collect information you provide when requesting support, scheduling a demonstration,
            responding to a survey, reporting a problem, communicating with us, or otherwise
            submitting information directly. This may include the communication, attachments,
            screenshots, diagnostic information, and contact details.
          </p>
        </SubSection>

        <SubSection heading="2.11 Sensitive Information">
          <p>
            The Service is not designed for Social Security numbers, complete payment-card
            information, government identification numbers, protected health information, biometric
            identifiers, highly sensitive financial-account credentials, information about children,
            or other unnecessary sensitive information. Customers and users must not submit this
            information to the Service.
          </p>
        </SubSection>
      </Section>

      <Section heading="3. Sources of Personal Information">
        <p>We collect personal information:</p>
        <Bullets>
          <li>directly from you;</li>
          <li>from your employer or the organization that invites you to the Service;</li>
          <li>from LeadArrow customers;</li>
          <li>from connected CRMs, forms, webhooks, lead sources, and integrations;</li>
          <li>automatically from your browser, device, extension, and use of the Service;</li>
          <li>
            from communications providers, carriers, payment processors, hosting providers, security
            services, and other vendors; and
          </li>
          <li>from referrals, demonstrations, and other lawful business-development sources.</li>
        </Bullets>
        <p>
          LeadArrow does not purchase consumer telephone lists for marketing through the Service.
        </p>
      </Section>

      <Section heading="4. How We Use Personal Information">
        <p>We may use personal information to:</p>
        <Bullets>
          <li>provide, operate, maintain, and improve the Service;</li>
          <li>create and administer accounts;</li>
          <li>authenticate users and manage permissions;</li>
          <li>receive, route, assign, and display lead information;</li>
          <li>send browser, push, email, telephone, and optional SMS alerts;</li>
          <li>connect and synchronize authorized integrations;</li>
          <li>process subscriptions, payments, invoices, and trials;</li>
          <li>provide customer service and technical support;</li>
          <li>personalize configurations and notification preferences;</li>
          <li>monitor performance, reliability, routing, delivery, and feature usage;</li>
          <li>create aggregated or de-identified statistics;</li>
          <li>
            detect, investigate, prevent, and respond to fraud, abuse, security incidents, spam, and
            unlawful activity;
          </li>
          <li>enforce our agreements and acceptable-use requirements;</li>
          <li>manage consent, opt-outs, suppression records, and communications compliance;</li>
          <li>comply with legal obligations and lawful requests;</li>
          <li>establish, exercise, or defend legal claims;</li>
          <li>communicate about the Service, security, billing, policy updates, and support; and</li>
          <li>
            market LeadArrow to business prospects where permitted by law and honor applicable
            opt-out requests.
          </li>
        </Bullets>
        <p>
          We do not use customer lead data for unrelated advertising or to train public,
          general-purpose artificial-intelligence models.
        </p>
      </Section>

      <Section heading="5. How We Disclose Personal Information">
        <p>
          We may disclose personal information as described below. The providers used at launch or
          during development may change as the Service evolves.
        </p>

        <SubSection heading="5.1 Service Providers">
          <p>
            We may disclose information to vendors that perform services for us, subject to
            appropriate contractual or operational restrictions. These may include:
          </p>
          <Bullets>
            <li>
              <strong>Vercel</strong> for website or application hosting;
            </li>
            <li>
              <strong>Render</strong> or another cloud provider for backend hosting;
            </li>
            <li>
              <strong>Neon</strong> for managed database infrastructure;
            </li>
            <li>
              <strong>Twilio</strong> for SMS, telephone, carrier connectivity, delivery, consent,
              and communications compliance;
            </li>
            <li>
              <strong>Resend</strong> for transactional email;
            </li>
            <li>
              <strong>Stripe</strong> for payment processing and subscription billing;
            </li>
            <li>
              <strong>Sentry</strong> for application performance and error monitoring;
            </li>
            <li>
              authentication, security, fraud-prevention, backup, support, and infrastructure
              providers; and
            </li>
            <li>professional advisers such as attorneys, accountants, insurers, and auditors.</li>
          </Bullets>
          <p>
            These providers may process information only as permitted by their agreements, their own
            legal obligations, and the purposes for which the information was disclosed.
          </p>
        </SubSection>

        <SubSection heading="5.2 Customer-Directed Integrations">
          <p>
            At a customer's direction, we may exchange information with connected services such as
            Close, GoHighLevel, HubSpot, Salesforce, Slack, and other systems selected by the
            customer. The customer controls which integrations it enables. Information sent to a
            connected service is also governed by that service's privacy policy and the customer's
            agreement with it.
          </p>
        </SubSection>

        <SubSection heading="5.3 Within the Customer Organization">
          <p>
            Account owners and administrators may access information about their authorized users,
            representatives, leads, routing activity, notification status, and Service usage.
            Customer organizations determine internal access rights and are responsible for
            appropriately configuring user permissions.
          </p>
        </SubSection>

        <SubSection heading="5.4 Legal, Safety, and Compliance Disclosures">
          <p>
            We may disclose information when we reasonably believe disclosure is necessary to:
          </p>
          <Bullets>
            <li>comply with law, regulation, subpoena, court order, or lawful government request;</li>
            <li>respond to legal process;</li>
            <li>establish, exercise, or defend legal rights;</li>
            <li>enforce our agreements;</li>
            <li>
              investigate or prevent fraud, abuse, spam, unlawful communications, or security
              incidents;
            </li>
            <li>
              protect recipients, users, LeadArrow, service providers, carriers, or the public; or
            </li>
            <li>
              satisfy carrier, messaging-provider, and communications-compliance requirements.
            </li>
          </Bullets>
        </SubSection>

        <SubSection heading="5.5 Business Transfers and Organizational Changes">
          <p>
            We may disclose or transfer information in connection with financing, formation of a
            LeadArrow legal entity, incorporation, merger, acquisition, reorganization, sale of
            assets, business transfer, bankruptcy, or similar transaction. A successor that receives
            personal information will be required to process it consistently with this Policy unless
            it provides legally required notice of a change.
          </p>
        </SubSection>

        <SubSection heading="5.6 With Your Direction or Consent">
          <p>
            We may disclose information for another purpose at your direction or with your consent.
          </p>
        </SubSection>
      </Section>

      <Section heading="6. No Sale or Behavioral Advertising">
        <p>
          LeadArrow does not sell personal information for money. LeadArrow does not share personal
          information for cross-context behavioral advertising and does not use customer lead data
          for targeted advertising on unrelated services.
        </p>
        <p>
          If our practices materially change, we will update this Policy and provide any choices
          required by applicable law before beginning the changed practice.
        </p>
      </Section>

      <Section heading="7. Cookies and Similar Technologies">
        <p>We may use cookies, local storage, pixels, and similar technologies to:</p>
        <Bullets>
          <li>keep users signed in;</li>
          <li>maintain security and prevent fraud;</li>
          <li>remember preferences;</li>
          <li>operate requested features;</li>
          <li>measure performance and reliability;</li>
          <li>diagnose errors; and</li>
          <li>understand how the Service is used.</li>
        </Bullets>
        <p>
          We do not currently use advertising cookies to track users across unrelated websites for
          targeted advertising. Browser settings may allow you to block or delete cookies, but
          blocking essential cookies may prevent parts of the Service from functioning.
        </p>
        <p>
          Because there is no universally accepted standard for ordinary browser{' '}
          <strong>"Do Not Track"</strong> signals, the Service may not respond to those signals.
          Where required, we will process legally recognized opt-out preference signals, such as
          Global Privacy Control, in a manner appropriate to the practices to which the signal
          applies.
        </p>
      </Section>

      <Section heading="8. SMS Privacy and Mobile Information">
        <p>
          This section applies to LeadArrow Alerts and is intended to be read together with the SMS
          terms in the{' '}
          <Link href="/terms" className="text-signal hover:underline">
            LeadArrow Terms of Service
          </Link>
          .
        </p>

        <SubSection heading="8.1 Voluntary SMS Consent">
          <p>
            Customer representatives may voluntarily enroll in operational LeadArrow Alerts through a
            separate, optional, unchecked consent control. Consent to receive SMS is not a condition
            of purchasing LeadArrow or using non-SMS features. Message frequency varies. Message and
            data rates may apply. Reply <strong>STOP</strong> to opt out or <strong>HELP</strong> for
            help. You may also contact <Mail address="eliotsamurin@gmail.com" />.
          </p>
        </SubSection>

        <SubSection heading="8.2 No Marketing Disclosure of Mobile Information">
          <p>
            <strong>
              LeadArrow does not sell, rent, or share mobile telephone numbers, SMS opt-in data, or
              text-messaging consent information with third parties or affiliates for their own
              marketing or promotional purposes.
            </strong>
          </p>
          <p>
            All categories of disclosure described in this Policy exclude text-messaging originator
            opt-in data and consent, except that this information may be disclosed to messaging
            providers, carriers, aggregators, compliance vendors, and other service providers solely
            as necessary to deliver messages, maintain consent and suppression records, prevent fraud
            or abuse, provide support, or comply with law. Those parties are not permitted to use the
            information for their own marketing.
          </p>
        </SubSection>

        <SubSection heading="8.3 Opt-Out Records">
          <p>
            We and our messaging provider may retain opt-in, opt-out, consent, and suppression
            records after account deletion when reasonably necessary to honor the request, prevent
            future unwanted messages, demonstrate compliance, and resolve disputes.
          </p>
        </SubSection>
      </Section>

      <Section heading="9. Data Retention">
        <p>
          We retain personal information only for as long as reasonably necessary for the purposes
          described in this Policy, including providing the Service, meeting contractual obligations,
          protecting security, resolving disputes, enforcing agreements, and complying with law.
        </p>
        <p>Our general retention approach is:</p>
        <Bullets>
          <li>
            <strong>Account and operational data:</strong> while the account is active and generally
            for up to 30 days after termination or a valid deletion request, subject to the
            exceptions below;
          </li>
          <li>
            <strong>Customer lead and routing data:</strong> as directed by the customer and
            generally for the account term plus a limited post-termination export and deletion
            period;
          </li>
          <li>
            <strong>SMS consent, opt-out, suppression, and related compliance records:</strong>{' '}
            generally for at least five years after the relevant consent, message, or opt-out event,
            or longer if reasonably necessary for a legal claim or compliance obligation;
          </li>
          <li>
            <strong>Billing, transaction, and tax records:</strong> generally for up to seven years;
          </li>
          <li>
            <strong>Security, access, and diagnostic logs:</strong> generally for up to two years,
            unless a longer period is needed to investigate an incident;
          </li>
          <li>
            <strong>Support and legal records:</strong> for as long as reasonably necessary to
            address the matter and establish or defend legal rights; and
          </li>
          <li>
            <strong>Backups:</strong> deleted information may remain in encrypted or
            access-restricted backups for up to 90 days before being overwritten, unless legal
            preservation is required.
          </li>
        </Bullets>
        <p>
          These periods are general targets, not guarantees that every record is retained for the
          entire period. We may delete information earlier when it is no longer necessary. We may
          retain aggregated or de-identified information that no longer reasonably identifies a
          person.
        </p>
        <p>
          Automated export and deletion features are still being developed. Until those controls are
          available, eligible requests may be handled manually through the contact information below.
        </p>
      </Section>

      <Section heading="10. Security">
        <p>
          We use reasonable administrative, technical, and organizational measures designed to
          protect personal information. Depending on the system and stage of deployment, these
          measures may include encryption in transit, encryption or provider-managed protection at
          rest, credential encryption, access controls, least-privilege practices, account
          authentication, logging, backups, monitoring, and incident-response procedures.
        </p>
        <p>
          No method of transmission, storage, or security is perfectly secure. We cannot guarantee
          that unauthorized parties will never defeat safeguards or that information will never be
          lost, altered, or improperly accessed. You are responsible for securing your account,
          devices, credentials, connected systems, and user permissions.
        </p>
        <p>
          If you believe your information or account has been compromised, contact us promptly at{' '}
          <Mail address="eliotsamurin@gmail.com" />.
        </p>
      </Section>

      <Section heading="11. Your Privacy Rights and Choices">
        <p>Depending on where you live and applicable law, you may have the right to:</p>
        <Bullets>
          <li>know whether we process your personal information;</li>
          <li>access or obtain a copy of personal information;</li>
          <li>correct inaccurate information;</li>
          <li>request deletion;</li>
          <li>request portability of certain information;</li>
          <li>restrict or object to certain processing;</li>
          <li>opt out of sale, targeted advertising, or certain profiling;</li>
          <li>withdraw consent where processing is based on consent;</li>
          <li>appeal a denied privacy request; and</li>
          <li>
            receive equal service without unlawful discrimination for exercising a privacy right.
          </li>
        </Bullets>
        <p>
          LeadArrow does not currently sell personal information or use it for cross-context
          behavioral advertising.
        </p>
        <p>
          To submit a request, email <Mail address="eliotsamurin@gmail.com" /> with the subject line{' '}
          <strong>"Privacy Request."</strong> Describe the request and identify the account or
          relationship involved. We may take reasonable steps to verify your identity and authority
          before acting. We will respond within the time required by applicable law.
        </p>
        <p>
          You may use an authorized agent where permitted by law. We may request proof of the agent's
          authority and may need to verify your identity directly.
        </p>
        <p>
          We may deny or limit a request where an exception applies, such as where information is
          needed to provide a requested service, maintain security, prevent fraud, honor an SMS
          opt-out, comply with law, protect another person's rights, or establish or defend legal
          claims. If applicable law provides an appeal right, you may appeal by replying to our
          decision or emailing the same address with <strong>"Privacy Appeal"</strong> in the subject
          line.
        </p>

        <SubSection heading="Customer-Controlled Data">
          <p>
            If your information was provided by a LeadArrow customer, submit your request to that
            customer first. LeadArrow generally cannot independently determine whether the customer's
            underlying lead record should be accessed, corrected, or deleted. We will assist the
            customer as reasonably required.
          </p>
        </SubSection>

        <SubSection heading="Communication Choices">
          <Bullets>
            <li>
              <strong>SMS:</strong> Reply STOP or contact us to withdraw consent from LeadArrow
              Alerts.
            </li>
            <li>
              <strong>Marketing email:</strong> Use the unsubscribe link or contact us. You may still
              receive non-marketing account, billing, security, and service communications.
            </li>
            <li>
              <strong>Cookies:</strong> Use browser controls to block or delete cookies, subject to
              functional limitations.
            </li>
            <li>
              <strong>Account notifications:</strong> Change available settings or contact the account
              administrator.
            </li>
          </Bullets>
        </SubSection>
      </Section>

      <Section heading="12. Children's Privacy">
        <p>
          The Service is intended only for adults engaged in business activity. We do not knowingly
          collect personal information from children under 18. Customers may not create accounts for
          children or knowingly submit children's information as Customer Data.
        </p>
        <p>
          If you believe a child has provided personal information, contact us at{' '}
          <Mail address="eliotsamurin@gmail.com" /> so we can investigate and take appropriate
          action.
        </p>
      </Section>

      <Section heading="13. United States Service and Data Processing">
        <p>
          The Service is intended for United States business customers. Personal information may be
          stored and processed in the United States and other locations where our service providers
          operate. Those locations may have data-protection rules different from the rules where you
          live.
        </p>
        <p>
          Customers must not use the Service in a jurisdiction where doing so would require LeadArrow
          to satisfy additional localization, registration, or international-transfer obligations
          unless LeadArrow has agreed in writing.
        </p>
      </Section>

      <Section heading="14. Third-Party Services and Links">
        <p>
          The Service may contain links to or integrations with services that LeadArrow does not
          control. This Policy does not govern an independent third party's privacy practices. Review
          that party's privacy policy before providing information or enabling an integration.
        </p>
      </Section>

      <Section heading="15. Changes to This Privacy Policy">
        <p>
          We may update this Policy to reflect changes in the Service, vendors, technology, law, or
          our practices. We will post the updated Policy and revise the Last Updated date. If a
          change materially affects how we use personal information, we will provide additional
          notice or obtain consent where required by law.
        </p>
      </Section>

      <Section heading="16. Contact Us">
        <p>
          For questions, concerns, privacy requests, SMS support, or complaints, contact:
        </p>
        <p>
          <strong>LeadArrow</strong>
          <br />
          Operated by Eliot Samurin, sole proprietor
          <br />
          Columbus, Ohio, United States
          <br />
          Email: <Mail address="eliotsamurin@gmail.com" />
          <br />
          Website:{' '}
          <a href="https://getleadarrow.com" className="text-signal hover:underline">
            https://getleadarrow.com
          </a>
        </p>
      </Section>
    </LegalShell>
  );
}
