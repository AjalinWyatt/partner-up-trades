
-- Performance indexes for hot query paths

-- messages: chat threads + unread badges
CREATE INDEX IF NOT EXISTS idx_messages_connection_created ON public.messages (connection_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON public.messages (receiver_id) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages (receiver_id);

-- posts: feed + profile activity
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON public.posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts (created_at DESC);

-- comments: per-post lookups
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments (user_id);

-- notifications: sidebar badge + list
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

-- partner_connections: discover exclusion + lists
CREATE INDEX IF NOT EXISTS idx_partner_connections_requester ON public.partner_connections (requester_id);
CREATE INDEX IF NOT EXISTS idx_partner_connections_receiver ON public.partner_connections (receiver_id);
CREATE INDEX IF NOT EXISTS idx_partner_connections_status ON public.partner_connections (status);

-- journal_entries: profile/log views
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_created ON public.journal_entries (user_id, created_at DESC);

-- blocked_users: discover exclusion
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON public.blocked_users (blocker_id);

-- profiles: discover query filter
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_created ON public.profiles (onboarding_completed, created_at DESC) WHERE onboarding_completed = true;

-- feed_likes / feed_comments
CREATE INDEX IF NOT EXISTS idx_feed_likes_entry ON public.feed_likes (entry_id);
CREATE INDEX IF NOT EXISTS idx_feed_likes_user ON public.feed_likes (user_id);
