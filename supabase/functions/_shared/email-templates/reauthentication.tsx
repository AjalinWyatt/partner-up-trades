/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your TradersWorld verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={brand}>TradersWorld</Text>
          <Heading style={h1}>Your verification code</Heading>
          <Text style={lede}>Enter this code in TradersWorld to confirm it's you.</Text>
          <Text style={code}>{token}</Text>
          <Text style={footer}>This code expires in a few minutes. If you didn't request it, ignore this email.</Text>
        </Section>
        <Text style={tagline}>Real partners. Real accountability. No bots.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif", margin: 0, padding: '32px 16px' }
const container = { maxWidth: '560px', margin: '0 auto' }
const card = { backgroundColor: '#0b1220', borderRadius: '16px', padding: '40px 32px', border: '1px solid #1a2332', textAlign: 'center' as const }
const brand = { fontSize: '13px', fontWeight: 700 as const, color: '#00E5E5', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: '0 0 24px' }
const h1 = { fontSize: '28px', fontWeight: 800 as const, color: '#ffffff', lineHeight: '1.2', margin: '0 0 12px' }
const lede = { fontSize: '15px', color: '#cbd5e1', lineHeight: '1.6', margin: '0 0 24px' }
const code = { fontSize: '40px', fontWeight: 800 as const, color: '#00E5E5', letterSpacing: '8px', backgroundColor: '#0a0f1c', borderRadius: '12px', padding: '20px', margin: '0 0 24px', border: '1px solid #1a2332', fontFamily: 'monospace' }
const footer = { fontSize: '12px', color: '#64748b', margin: '24px 0 0', lineHeight: '1.5' }
const tagline = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const, margin: '20px 0 0', letterSpacing: '0.3px' }
