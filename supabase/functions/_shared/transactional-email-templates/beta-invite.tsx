/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface BetaInviteProps {
  firstName?: string
  betaKey?: string
}

const BetaInviteEmail = ({ firstName, betaKey }: BetaInviteProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're Personal Invite Into TradersWorld</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={kicker}>TRADERS WORLD · PRIVATE BETA</Text>
        <Heading style={h1}>You're 1 of 48.</Heading>

        <Text style={text}>Hey {firstName || 'there'},</Text>
        <Text style={text}>
          My name is Nilaja, and I've spent the last 5 years inside trading communities
          watching the same thing happen over and over.
        </Text>
        <Text style={strong}>Traders show up alone. They struggle alone. They quit alone.</Text>
        <Text style={text}>
          Not because they don't have the strategy. Not because the market is against them.
          But because there's nobody in their corner. No structure. No accountability. No one
          who actually trades what they trade, understands what they're going through, and
          shows up for them consistently.
        </Text>
        <Text style={text}>I watched traders ask the same questions on social media every single day:</Text>
        <Section style={quote}>
          <Text style={quoteText}>"Looking for a trader friend."</Text>
          <Text style={quoteText}>"I need an accountability partner."</Text>
          <Text style={quoteText}>"Trading is so lonely."</Text>
          <Text style={quoteText}>"Where are the traders at?"</Text>
        </Section>
        <Text style={strong}>So I built the answer.</Text>
        <Text style={text}>
          Traders World is a platform that algorithmically matches traders with accountability
          partners based on their markets, strategies, experience level, goals, and even their
          struggles. Not randomly. Not by Discord server. By compatibility — the same way the
          best partnerships actually form.
        </Text>
        <Text style={text}>
          It has a feed, forums, messaging, a trading journal your partner can see, streak
          tracking, and eventually a verified mentor marketplace. Built for Forex and Futures
          traders first — and built for the long game.
        </Text>
        <Text style={text}>
          We are about <strong>90% done</strong>. And that's exactly why I need you.
        </Text>
        <Text style={text}>
          You are one of 48 people I'm trusting with this before it goes public. I don't need
          you to be nice. I don't need you to protect my feelings. I need you to use it like a
          real user and tell me everything that's wrong, confusing, slow, missing, or just
          doesn't feel right.
        </Text>
        <Text style={strong}>Specifically I want to know:</Text>
        <ul style={list}>
          <li style={li}>Does the onboarding make sense? Does it ask the right questions?</li>
          <li style={li}>Does the feed feel like a place you'd actually post?</li>
          <li style={li}>Does the trading log capture what matters to you?</li>
          <li style={li}>What's missing that you wish was there?</li>
          <li style={li}>What's there that you don't understand or would never use?</li>
          <li style={li}>Does it feel like an app worth downloading?</li>
        </ul>
        <Text style={text}>
          Be raw. Be uncut. Tell me what's broken. Tell me what's missing. Tell me what would
          make you open this app every single day.
        </Text>
        <Text style={text}>
          The trading industry has courses. It has signals. It has Discord servers that die in
          two weeks. It does not have this — a platform built around the one thing that
          actually changes trading outcomes: <strong>real human accountability from someone who trades exactly like you.</strong>
        </Text>

        {betaKey ? (
          <Section style={keyBox}>
            <Text style={keyLabel}>YOUR BETA ACCESS KEY</Text>
            <Text style={keyValue}>{betaKey}</Text>
            <Text style={keyHint}>Enter this on the landing page to unlock sign up.</Text>
          </Section>
        ) : null}

        <Section style={{ textAlign: 'center', margin: '28px 0 8px' }}>
          <Button style={button} href="https://tradersworld.app">Open Traders World</Button>
        </Section>
        <Text style={center}>https://tradersworld.app</Text>

        <Text style={text}>Thank you for being early. This means more than you know.</Text>
        <Text style={signature}>Nilaja</Text>
        <Text style={signatureSub}>Founder, Traders World LLC · @TradersWorldApp</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BetaInviteEmail,
  subject: "You're Personal Invite Into TradersWorld",
  displayName: 'Beta invite',
  previewData: { firstName: 'Alex', betaKey: 'TRADERSWORLD-BETA-2026' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Arial, sans-serif' }
const container = { maxWidth: '600px', margin: '0 auto', padding: '32px 28px' }
const kicker = { fontSize: '11px', letterSpacing: '0.14em', color: '#16a34a', fontWeight: 700 as const, margin: '0 0 8px' }
const h1 = { fontSize: '26px', fontWeight: 'bold' as const, color: '#0b0f14', margin: '0 0 24px', lineHeight: 1.25 }
const text = { fontSize: '15px', color: '#334155', lineHeight: 1.65, margin: '0 0 14px' }
const strong = { ...{ fontSize: '15px', color: '#0b0f14', lineHeight: 1.65, margin: '0 0 14px' }, fontWeight: 700 as const }
const quote = { borderLeft: '3px solid #16a34a', backgroundColor: '#f1f5f9', padding: '12px 16px', borderRadius: '6px', margin: '0 0 16px' }
const quoteText = { fontSize: '14px', color: '#0b0f14', margin: '0 0 4px', lineHeight: 1.5 }
const list = { paddingLeft: '20px', margin: '0 0 16px', color: '#334155' }
const li = { fontSize: '15px', lineHeight: 1.6, marginBottom: '6px' }
const keyBox = { backgroundColor: '#0b0f14', borderRadius: '10px', padding: '18px 20px', margin: '20px 0' }
const keyLabel = { fontSize: '11px', letterSpacing: '0.12em', color: '#94a3b8', margin: '0 0 6px', fontWeight: 600 as const }
const keyValue = { fontFamily: '"SF Mono", Menlo, Consolas, monospace', fontSize: '17px', color: '#22c55e', fontWeight: 700 as const, letterSpacing: '0.04em', margin: '0 0 8px' }
const keyHint = { fontSize: '12px', color: '#94a3b8', margin: 0 }
const button = { backgroundColor: '#16a34a', color: '#ffffff', fontSize: '15px', fontWeight: 700 as const, borderRadius: '10px', padding: '14px 28px', textDecoration: 'none' }
const center = { textAlign: 'center' as const, fontSize: '12px', color: '#94a3b8', margin: '0 0 22px' }
const signature = { fontSize: '15px', color: '#0b0f14', fontWeight: 700 as const, margin: '20px 0 2px' }
const signatureSub = { fontSize: '13px', color: '#64748b', margin: 0 }