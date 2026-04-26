/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your TradersWorld password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={brand}>TradersWorld</Text>
          <Heading style={h1}>Reset your password</Heading>
          <Text style={lede}>We got a request to reset your password. Tap the button below to choose a new one.</Text>
          <table cellPadding={0} cellSpacing={0} role="presentation" style={btnWrap}><tbody><tr><td align="center" style={btnCell}>
            <Link href={confirmationUrl} style={button}>Reset password</Link>
          </td></tr></tbody></table>
          <Text style={small}>Button not working? Paste this into your browser:</Text>
          <Text style={linkBox}><Link href={confirmationUrl} style={rawLink}>{confirmationUrl}</Link></Text>
          <Text style={footer}>If you didn't request this, ignore this email — your password won't change.</Text>
        </Section>
        <Text style={tagline}>Real partners. Real accountability. No bots.</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif", margin: 0, padding: '32px 16px' }
const container = { maxWidth: '560px', margin: '0 auto' }
const card = { backgroundColor: '#0b1220', borderRadius: '16px', padding: '40px 32px', border: '1px solid #1a2332' }
const brand = { fontSize: '13px', fontWeight: 700 as const, color: '#00E5E5', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: '0 0 24px' }
const h1 = { fontSize: '28px', fontWeight: 800 as const, color: '#ffffff', lineHeight: '1.2', margin: '0 0 18px' }
const lede = { fontSize: '16px', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 28px' }
const btnWrap = { width: '100%', borderCollapse: 'collapse' as const, margin: '0 0 28px' }
const btnCell = { padding: 0 }
const button = { display: 'inline-block', backgroundColor: '#00E5E5', color: '#0b1220', padding: '16px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: 700 as const, textDecoration: 'none', letterSpacing: '0.2px', border: '1px solid #00E5E5' }
const small = { fontSize: '13px', color: '#94a3b8', margin: '0 0 8px' }
const linkBox = { fontSize: '12px', color: '#64748b', wordBreak: 'break-all' as const, margin: '0 0 24px', padding: '12px', backgroundColor: '#0a0f1c', borderRadius: '8px', border: '1px solid #1a2332' }
const rawLink = { color: '#00E5E5', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#64748b', margin: '24px 0 0', lineHeight: '1.5' }
const tagline = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: '20px 0 0', letterSpacing: '0.3px' }
