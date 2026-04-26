
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Unschedule any previous version of this job
DO $$
BEGIN
  PERFORM cron.unschedule('daily-notifications-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Schedule daily-notifications to run every hour, reusing the existing
-- email_queue_service_role_key vault secret (same service-role key).
SELECT cron.schedule(
  'daily-notifications-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xkhleosrspxxdhtgwaqg.supabase.co/functions/v1/daily-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'email_queue_service_role_key'
        LIMIT 1
      )
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
