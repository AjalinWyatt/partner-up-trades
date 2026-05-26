import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const lastUpdated = "April 25, 2026";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">Last updated: {lastUpdated}</p>

        <div className="mt-8 space-y-6 text-[14px] leading-7 text-foreground/90">
          <section>
            <h2 className="text-lg font-bold">1. Information We Collect</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li><span className="font-semibold">Account info:</span> name, email, password (hashed), avatar.</li>
              <li><span className="font-semibold">Profile info:</span> bio, location (city/state/country), gender, hobbies, prompts.</li>
              <li><span className="font-semibold">Trading profile:</span> markets, instruments, sessions, strategies, experience, goals.</li>
              <li><span className="font-semibold">Content you create:</span> posts, comments, journal entries, messages, voice notes, stories.</li>
              <li><span className="font-semibold">Usage data:</span> in-app events (sign-ups, onboarding steps, Pulse activity) for product analytics.</li>
              <li><span className="font-semibold">Technical data:</span> device, browser, IP (collected by our infrastructure provider).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold">2. How We Use Information</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li>Provide and operate the Service (matching, messaging, Pulse, journals).</li>
              <li>Authenticate you and secure your account.</li>
              <li>Send transactional and authentication emails (e.g., verification, password reset).</li>
              <li>Improve product features through aggregated analytics.</li>
              <li>Enforce our Terms and prevent abuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold">3. Sharing</h2>
            <p>
              Public profile info (username, avatar, bio, posts you publish) is visible to other authenticated users.
              Direct messages and Pulse session content are only visible to participants. We do not sell your personal data.
              We share data with service providers (database, storage, email) strictly to operate the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">4. Storage & Security</h2>
            <p>
              Data is stored on Supabase infrastructure with row-level security and encryption in transit. No system
              is 100% secure; report any suspected breach to <a className="text-primary underline" href="mailto:support@tradersworld.app">support@tradersworld.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">5. Your Rights</h2>
            <p>You can:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Access and update your profile from <span className="font-semibold">Profile → Edit</span>.</li>
              <li>Export your trading log via <span className="font-semibold">Trading Log → Export</span>.</li>
              <li>Delete your account at any time from <span className="font-semibold">Profile → Settings → Delete Account</span>. This permanently removes your profile, posts, messages, and journal entries.</li>
              <li>Request a copy of your data by emailing <a className="text-primary underline" href="mailto:support@tradersworld.app">support@tradersworld.app</a>.</li>
            </ul>
            <p className="mt-2">
              EU/UK users have rights under GDPR; California users have rights under CCPA. We honor verified requests
              within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">6. Cookies</h2>
            <p>
              We use essential cookies and local storage to keep you signed in and remember preferences (theme, partner cap).
              We do not use third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">7. Children</h2>
            <p>
              TradersWorld is not directed to anyone under 18 and we do not knowingly collect data from minors.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">8. Changes</h2>
            <p>
              We may update this policy. Material changes will be communicated via in-app notice or email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">9. Contact</h2>
            <p>
              <a className="text-primary underline" href="mailto:support@tradersworld.app">support@tradersworld.app</a>
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-4 text-[12px] text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </div>
      </div>
    </div>
  );
}
