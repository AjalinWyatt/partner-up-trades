import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  const lastUpdated = "April 25, 2026";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Terms of Service</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">Last updated: {lastUpdated}</p>

        <div className="mt-8 space-y-6 text-[14px] leading-7 text-foreground/90">
          <section>
            <h2 className="text-lg font-bold">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using TradersWorld ("the Service"), you agree to be bound by these Terms.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">2. Eligibility</h2>
            <p>
              You must be at least 18 years old to use TradersWorld. By using the Service, you represent that you
              meet this requirement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">3. No Financial Advice</h2>
            <p>
              TradersWorld is an accountability and peer-connection platform for traders. Nothing on the Service
              constitutes financial, investment, tax, or legal advice. Content shared by users (including charts,
              ideas, journal entries, voice notes, and Pulse sessions) is personal opinion and is not a recommendation
              to buy or sell any instrument. You are solely responsible for your trading decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">4. Accounts & Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and for all activity
              under your account. Notify us immediately of any unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">5. User Content</h2>
            <p>
              You retain ownership of content you post, but grant TradersWorld a non-exclusive, worldwide, royalty-free
              license to host, display, and distribute that content within the Service. You are responsible for the
              content you post and represent that you have the rights to share it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">6. Acceptable Use</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>No harassment, hate speech, threats, or impersonation.</li>
              <li>No spam, scams, signal-selling, or solicitation of payment from other users.</li>
              <li>No fabricated trading results or misleading performance claims.</li>
              <li>No illegal content or content that infringes third-party rights.</li>
            </ul>
            <p className="mt-2">
              Violations may result in content removal, suspension, or termination.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">7. Pulse Sessions & Messaging</h2>
            <p>
              Pulse and direct messages are peer-to-peer interactions. TradersWorld does not actively monitor private
              communication. You may report abuse via the in-app block and report tools.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">8. Subscription & Payments</h2>
            <p>
              Pro and other paid tiers are billed in advance and are non-refundable except where required by law.
              You can cancel any time; access continues until the end of the billing period.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">9. Termination</h2>
            <p>
              We may suspend or terminate your access at any time for violations of these Terms. You may delete your
              account at any time from <span className="font-semibold">Profile → Settings → Delete Account</span>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">10. Disclaimers & Limitation of Liability</h2>
            <p>
              The Service is provided "as is" without warranty of any kind. To the maximum extent permitted by law,
              TradersWorld is not liable for any indirect, incidental, or consequential damages, including trading
              losses arising from use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">11. Changes</h2>
            <p>
              We may update these Terms from time to time. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">12. Contact</h2>
            <p>
              Questions? Email <a className="text-primary underline" href="mailto:support@tradersworld.app">support@tradersworld.app</a>.
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-4 text-[12px] text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </div>
      </div>
    </div>
  );
}
