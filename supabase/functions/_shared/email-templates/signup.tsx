/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  token: string
  confirmationUrl?: string
}

export const SignupEmail = ({
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to TradersWorld — confirm your email to get started</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={brand}>TradersWorld</Text>
          <Heading style={h1}>Welcome aboard 🚀</Heading>
          <Text style={lede}>
            Thanks for joining{' '}
            <Link href={siteUrl} style={brandLink}>TradersWorld</Link>
            . You're seconds away from finding the trading partner who actually shows up.
          </Text>
          <Text style={text}>
            Tap the button below to confirm <strong style={emailStrong}>{recipient}</strong> and
            unlock your account.
          </Text>

          {/* Bullet-proof button (table layout for Gmail/Outlook) */}
          <table cellPadding={0} cellSpacing={0} role="presentation" style={btnWrap}>
            <tbody>
              <tr>
                <td align="center" style={btnCell}>
                  <Link href={confirmationUrl} style={button}>
                    Confirm email & get access
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>

          <Text style={small}>
            Button not working? Paste this link into your browser:
          </Text>
          <Text style={linkBox}>
            <Link href={confirmationUrl} style={rawLink}>{confirmationUrl}</Link>
          </Text>

          <Text style={footer}>
            This link expires shortly. If you didn't sign up for TradersWorld, you can safely
            ignore this email.
          </Text>
        </Section>

        <Text style={tagline}>Real partners. Real accountability. No bots.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

// ============ Shared brand styles ============
const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  margin: 0,
  padding: '32px 16px',
}
const container = { maxWidth: '560px', margin: '0 auto' }
const card = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '40px 32px',
  border: '1px solid #e2e8f0',
}
const brand = {
  fontSize: '13px',
  fontWeight: 700 as const,
  color: '#0891a6',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  margin: '0 0 24px',
}
const h1 = {
  fontSize: '28px',
  fontWeight: 800 as const,
  color: '#0f172a',
  lineHeight: '1.2',
  margin: '0 0 18px',
}
const lede = {
  fontSize: '16px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#475569',
  lineHeight: '1.6',
  margin: '0 0 28px',
}
const emailStrong = { color: '#0f172a', fontWeight: 600 as const }
const brandLink = { color: '#0891a6', textDecoration: 'none', fontWeight: 600 as const }

const btnWrap = { width: '100%', borderCollapse: 'collapse' as const, margin: '0 0 28px' }
const btnCell = { padding: 0 }
const button = {
  display: 'inline-block',
  backgroundColor: '#0b1220',
  color: '#ffffff',
  padding: '16px 32px',
  borderRadius: '12px',
  fontSize: '15px',
  fontWeight: 700 as const,
  textDecoration: 'none',
  letterSpacing: '0.2px',
  border: '1px solid #0b1220',
}

const small = { fontSize: '13px', color: '#64748b', margin: '0 0 8px' }
const linkBox = {
  fontSize: '12px',
  color: '#475569',
  wordBreak: 'break-all' as const,
  margin: '0 0 24px',
  padding: '12px',
  backgroundColor: '#f1f5f9',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
}
const rawLink = { color: '#0891a6', textDecoration: 'underline' }
const footer = {
  fontSize: '12px',
  color: '#64748b',
  margin: '24px 0 0',
  lineHeight: '1.5',
}
const tagline = {
  fontSize: '12px',
  color: '#64748b',
  textAlign: 'center' as const,
  margin: '20px 0 0',
  letterSpacing: '0.3px',
}
