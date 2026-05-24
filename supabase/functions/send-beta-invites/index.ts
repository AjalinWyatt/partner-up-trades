// Admin-only: sends the beta-invite template to every waitlist row with
// wants_beta = true. Uses idempotencyKey per email so reruns won't duplicate.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { template as betaInviteTemplate } from '../_shared/transactional-email-templates/beta-invite.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const BETA_KEY = Deno.env.get('BETA_ACCESS_KEY') || ''

  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: userData } = await userClient.auth.getUser()
  const callerId = userData?.user?.id
  if (!callerId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: callerId, _role: 'admin' })
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let body: any = {}
  try { body = await req.json() } catch {}
  const dryRun: boolean = !!body.dryRun
  const testEmail: string | undefined = body.testEmail
  const preview: boolean = !!body.preview

  if (preview) {
    try {
      const html = await renderAsync(
        React.createElement(betaInviteTemplate.component, {
          firstName: 'Nilaja',
          betaKey: BETA_KEY || 'TW-BETA-2026',
        }),
      )
      return new Response(JSON.stringify({ html }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  let recipients: { email: string; name: string | null }[] = []
  if (testEmail) {
    recipients = [{ email: testEmail, name: body.testName ?? null }]
  } else {
    const { data, error } = await admin
      .from('waitlist')
      .select('email, name')
      .eq('wants_beta', true)
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const seen = new Set<string>()
    for (const row of data || []) {
      const e = (row.email || '').trim().toLowerCase()
      if (!e || seen.has(e)) continue
      seen.add(e)
      recipients.push({ email: e, name: row.name })
    }
  }

  if (dryRun) {
    return new Response(JSON.stringify({ count: recipients.length, recipients }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  let failed = 0
  const errors: { email: string; error: string }[] = []

  for (const r of recipients) {
    const firstName = (r.name || '').trim().split(/\s+/)[0] || null
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
        body: JSON.stringify({
          templateName: 'beta-invite',
          recipientEmail: r.email,
          idempotencyKey: `beta-invite-v1-${r.email}`,
          templateData: { firstName, betaKey: BETA_KEY },
        }),
      })
      if (!res.ok) {
        failed++
        const t = await res.text()
        errors.push({ email: r.email, error: t.slice(0, 200) })
      } else {
        sent++
      }
    } catch (e) {
      failed++
      errors.push({ email: r.email, error: String(e) })
    }
  }

  return new Response(JSON.stringify({ total: recipients.length, sent, failed, errors }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})