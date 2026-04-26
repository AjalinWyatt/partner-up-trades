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
  siteName,
  siteUrl,
  recipient,
  token,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email to finish signing up for TradersWorld</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>TradersWorld</Text>
        <Heading style={h1}>Welcome aboard 🚀</Heading>
        <Text style={text}>
          You just signed up for{' '}
          <Link href={siteUrl} style={link}>
            <strong>TradersWorld</strong>
          </Link>
          — your trading accountability partner is waiting.
        </Text>
        <Text style={text}>
          Click the button below to verify your email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ):
        </Text>
        <Link href={confirmationUrl} style={button}>
          Verify email & continue
        </Link>
        <Text style={text}>
          Or paste this link into your browser:
          <br />
          <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
        </Text>
        <Text style={footer}>
          This link expires shortly. If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { fontSize: '18px', fontWeight: 'bold' as const, color: 'hsl(214, 76%, 50%)', margin: '0 0 24px', letterSpacing: '-0.5px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0a0a0f', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#666666', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: 'hsl(214, 76%, 50%)', textDecoration: 'underline' }
const button = { display: 'inline-block', backgroundColor: 'hsl(214, 76%, 50%)', color: '#ffffff', padding: '14px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold' as const, textDecoration: 'none', margin: '0 0 24px' }
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
