import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Globe, ArrowLeft, Send, PenSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/AppLayout";
import LogoHeader from "@/components/LogoHeader";
import { cn } from "@/lib/utils";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";

interface Connection {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerUsername: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

const GRADIENT_COLORS = [
  "from-primary to-accent",
  "from-[hsl(var(--accent))] to-primary",
  "from-[hsl(38,92%,55%)] to-[hsl(var(--destructive))]",
  "from-primary to-[hsl(280,70%,50%)]",
];

function getGradient(id: string) {
  const idx = id.charCodeAt(0) % GRADIENT_COLORS.length;
  return GRADIENT_COLORS[idx];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function Messages() {
  const { loading: guardLoading, onboardingComplete } = useOnboardingGuard();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeChat, setActiveChat] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate("/signin");
        return;
      }
      setUserId(data.user.id);
    });
  }, [navigate]);

  // Load accepted connections
  const loadConnections = async (uid: string) => {
    setLoading(true);
    const { data: conns } = await supabase
      .from("partner_connections")
      .select("*")
      .eq("status", "accepted")
      .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`);

    if (!conns || conns.length === 0) {
      setConnections([]);
      setLoading(false);
      return;
    }

    const partnerIds = conns.map((c: any) =>
      c.requester_id === uid ? c.receiver_id : c.requester_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name")
      .in("id", partnerIds);

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.id, p])
    );

    const connectionList: Connection[] = [];
    for (const c of conns) {
      const partnerId =
        c.requester_id === uid ? c.receiver_id : c.requester_id;
      const profile = profileMap.get(partnerId);

      const { data: lastMsgs } = await supabase
        .from("messages")
        .select("content, created_at")
        .or(
          `and(sender_id.eq.${uid},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${uid})`
        )
        .order("created_at", { ascending: false })
        .limit(1);

      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", partnerId)
        .eq("receiver_id", uid)
        .eq("read", false);

      connectionList.push({
        id: c.id,
        partnerId,
        partnerName: profile?.full_name || profile?.username || "Trader",
        partnerUsername: profile?.username || "",
        lastMessage: lastMsgs?.[0]?.content,
        lastMessageTime: lastMsgs?.[0]?.created_at,
        unreadCount: count || 0,
      });
    }

    setConnections(connectionList);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    loadConnections(userId);
  }, [userId]);

  // Realtime: update inbox when new messages arrive (when not in a chat)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("inbox-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          // Update inbox if message involves this user and we're on inbox view
          if (msg.sender_id === userId || msg.receiver_id === userId) {
            if (!activeChat) {
              // Refresh the inbox list
              loadConnections(userId);
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, activeChat]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChat || !userId) return;
    async function loadMessages() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${activeChat!.partnerId}),and(sender_id.eq.${activeChat!.partnerId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) || []);

      // Mark unread as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", activeChat!.partnerId)
        .eq("receiver_id", userId!)
        .eq("read", false);
    }
    loadMessages();
  }, [activeChat, userId]);

  // Realtime messages
  useEffect(() => {
    if (!activeChat || !userId) return;
    const channel = supabase
      .channel(`chat-${activeChat.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (
            (msg.sender_id === userId && msg.receiver_id === activeChat.partnerId) ||
            (msg.sender_id === activeChat.partnerId && msg.receiver_id === userId)
          ) {
            setMessages((prev) => [...prev, msg]);
            // Mark as read if received
            if (msg.receiver_id === userId) {
              supabase.from("messages").update({ read: true }).eq("id", msg.id);
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChat, userId]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!msgInput.trim() || !activeChat || !userId) return;
    setSendingMsg(true);
    await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: activeChat.partnerId,
      connection_id: activeChat.id,
      content: msgInput.trim(),
    });
    setMsgInput("");
    setSendingMsg(false);
  }

  const filtered = connections.filter(
    (c) =>
      c.partnerName.toLowerCase().includes(search.toLowerCase()) ||
      c.partnerUsername.toLowerCase().includes(search.toLowerCase())
  );

  // Chat view
  if (activeChat) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setActiveChat(null)}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className={cn("w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-foreground", getGradient(activeChat.partnerId))}>
            {getInitials(activeChat.partnerName)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{activeChat.partnerName}</p>
            <p className="text-[10px] text-muted-foreground">Partner</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-lg">👋</p>
              <p className="text-sm text-muted-foreground mt-2">
                Say hi to {activeChat.partnerName.split(" ")[0]}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === userId;
              return (
                <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[75%] rounded-2xl px-4 py-2.5 text-sm", isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card text-foreground rounded-bl-md")}>
                    <p>{msg.content}</p>
                    <p className={cn("text-[10px] mt-1", isMine ? "text-primary-foreground/60" : "text-muted-foreground")}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border bg-card flex items-center gap-2">
          <Input
            value={msgInput}
            onChange={(e) => setMsgInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-full"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={!msgInput.trim() || sendingMsg}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center disabled:opacity-40"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <LogoHeader />
      <div className="px-4 pt-2">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">Messages</h1>
          <PenSquare className="w-5 h-5 text-muted-foreground" />
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="pl-9 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-full"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <Globe className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-1">No messages yet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Connect with a match to start a conversation
          </p>
          <button
            onClick={() => navigate("/discover")}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-semibold"
          >
            Find matches
          </button>
        </div>
      ) : (
        <div className="px-4 space-y-1">
          {filtered.map((conn) => (
            <button
              key={conn.id}
              onClick={() => setActiveChat(conn)}
              className="w-full flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <div className={cn("w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-bold text-foreground shrink-0", getGradient(conn.partnerId))}>
                {getInitials(conn.partnerName)}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground truncate">{conn.partnerName}</p>
                  {conn.lastMessageTime && (
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {formatTime(conn.lastMessageTime)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {conn.lastMessage || "No messages yet"}
                </p>
              </div>
              {conn.unreadCount > 0 && (
                <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
                  {conn.unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      
    </AppLayout>
  );
}
