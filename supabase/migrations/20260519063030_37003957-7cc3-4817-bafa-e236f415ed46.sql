DO $$ BEGIN PERFORM cron.unschedule('weekly-partner-recap'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('partner-streak-atrisk-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'weekly-partner-recap',
  '0 17 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://xkhleosrspxxdhtgwaqg.supabase.co/functions/v1/weekly-partner-recap?mode=recap',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'email_queue_service_role_key' LIMIT 1
      )
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'partner-streak-atrisk-daily',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xkhleosrspxxdhtgwaqg.supabase.co/functions/v1/weekly-partner-recap?mode=atrisk',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'email_queue_service_role_key' LIMIT 1
      )
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);