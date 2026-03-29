export interface Connection {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerUsername: string;
  avatarUrl?: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  media_url?: string | null;
  media_type?: string | null;
}
