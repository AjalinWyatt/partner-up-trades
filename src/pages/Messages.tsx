import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Globe, ArrowLeft, Send, Search, Image, Mic, Smile } from "lucide-react";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";

interface Connection {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerUsername: string;
  avatarUrl?: string | null;
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
  "from-teal-500 to-emerald-400",
  "from-emerald-500 to-cyan-500",
  "from-cyan-500 to-teal-400",
  "from-green-500 to-emerald-400",
];

function getGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENT_COLORS[Math.abs(hash) % GRADIENT_COLORS.length];
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMessageDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return "Today";
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
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
      if (!data.user) { navigate("/signin"); return; }
      setUserId(data.user.id);
    });
  }, [navigate]);

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

    const partnerIds = conns.map((c: any) => c.requester_id === uid ? c.receiver_id : c.requester_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", partnerIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const connectionList: Connection[] = [];

    for (const c of conns) {
      const partnerId = c.requester_id === uid ? c.receiver_id : c.requester_id;
      const profile = profileMap.get(partnerId);
      const { data: lastMsgs } = await supabase
        .from("messages")
        .select("content, created_at")
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${uid})`)
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
        avatarUrl: profile?.avatar_url,
        lastMessage: lastMsgs?.[0]?.content,
        lastMessageTime: lastMsgs?.[0]?.created_at,
        unreadCount: count || 0,
      });
    }

    connectionList.sort((a, b) => {
      if (!a.lastMessageTime && !b.lastMessageTime) return 0;
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });

    setConnections(connectionList);
    setLoading(false);
  };

  useEffect(() => { if (userId) loadConnections(userId); }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === userId || msg.receiver_id === userId) {
          if (!activeChat) loadConnections(userId);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, activeChat]);

  useEffect(() => {
    if (!activeChat || !userId) return;
    async function loadMessages() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${activeChat!.partnerId}),and(sender_id.eq.${activeChat!.partnerId},receiver_id.eq.${userId})`)
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) || []);
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", activeChat!.partnerId)
        .eq("receiver_id", userId!)
        .eq("read", false);
    }
    loadMessages();
  }, [activeChat, userId]);

  useEffect(() => {
    if (!activeChat || !userId) return;
    const channel = supabase
      .channel(`chat-${activeChat.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (
          (msg.sender_id === userId && msg.receiver_id === activeChat.partnerId) ||
          (msg.sender_id === activeChat.partnerId && msg.receiver_id === userId)
        ) {
          setMessages((prev) => [...prev, msg]);
          if (msg.receiver_id === userId) supabase.from("messages").update({ read: true }).eq("id", msg.id);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChat, userId]);

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

  // Group messages by date
  function groupMessagesByDate(msgs: Message[]) {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    for (const msg of msgs) {
      const date = formatMessageDate(msg.created_at);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }

  const Avatar = ({ conn, size = "md" }: { conn: Connection; size?: "sm" | "md" | "lg" }) => {
    const sizeClasses = size === "sm" ? "w-9 h-9 text-[11px]" : size === "lg" ? "w-14 h-14 text-base" : "w-11 h-11 text-xs";
    if (conn.avatarUrl) {
      return <img src={conn.avatarUrl} alt={conn.partnerName} className={cn("rounded-full object-cover shrink-0", sizeClasses)} />;
    }
    return (
      <div className={cn("rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-white shrink-0", sizeClasses, getGradient(conn.partnerId))}>
        {getInitials(conn.partnerName)}
      </div>
    );
  };

  /* ---- CONVERSATION LIST (sidebar on desktop, full on mobile) ---- */
  const ConversationList = ({ className }: { className?: string }) => (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-xl font-bold text-foreground">Messages</h1>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations"
            className="pl-9 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-xl h-9 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-3">
              <Globe className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No conversations yet</p>
            <p className="text-xs text-muted-foreground mb-4">Connect with a match to start chatting</p>
            <button onClick={() => navigate("/discover")} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold">
              Find matches
            </button>
          </div>
        ) : (
          filtered.map((conn) => (
            <button
              key={conn.id}
              onClick={() => { setActiveChat(conn); setMsgInput(""); }}
              className={cn(
                "w-full flex items-center gap-3 py-3 px-3 rounded-xl transition-colors",
                activeChat?.id === conn.id
                  ? "bg-secondary"
                  : "hover:bg-secondary/50"
              )}
            >
              <Avatar conn={conn} />
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <p className={cn("text-sm truncate", conn.unreadCount > 0 ? "font-bold text-foreground" : "font-medium text-foreground")}>
                    {conn.partnerName}
                  </p>
                  {conn.lastMessageTime && (
                    <span className={cn("text-[10px] shrink-0 ml-2", conn.unreadCount > 0 ? "text-primary font-semibold" : "text-muted-foreground")}>
                      {formatTime(conn.lastMessageTime)}
                    </span>
                  )}
                </div>
                <p className={cn("text-xs truncate mt-0.5", conn.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {conn.lastMessage || "No messages yet"}
                </p>
              </div>
              {conn.unreadCount > 0 && (
                <span className="min-w-[20px] h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0 px-1.5">
                  {conn.unreadCount}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  /* ---- CHAT PANEL ---- */
  const ChatPanel = ({ className }: { className?: string }) => {
    if (!activeChat) {
      return (
        <div className={cn("flex flex-col items-center justify-center h-full", className)}>
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Send className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Your messages</h3>
          <p className="text-sm text-muted-foreground text-center max-w-[260px]">
            Select a conversation to start chatting with your trading partners
          </p>
        </div>
      );
    }

    const grouped = groupMessagesByDate(messages);

    return (
      <div className={cn("flex flex-col h-full", className)}>
        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-primary/20 bg-card/80 backdrop-blur-sm">
          <button onClick={() => setActiveChat(null)} className="lg:hidden">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <Avatar conn={activeChat} size="sm" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{activeChat.partnerName}</p>
            <p className="text-[10px] text-muted-foreground">@{activeChat.partnerUsername || "trader"} · Partner</p>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Avatar conn={activeChat} size="lg" />
              <p className="text-sm font-semibold text-foreground mt-3">{activeChat.partnerName}</p>
              <p className="text-xs text-muted-foreground mt-1">Start a conversation with your trading partner</p>
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.date}>
                <div className="flex items-center justify-center my-4">
                  <span className="text-[10px] text-muted-foreground bg-secondary px-3 py-1 rounded-full font-medium">
                    {group.date}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {group.messages.map((msg) => {
                    const isMine = msg.sender_id === userId;
                    return (
                      <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[70%] px-3.5 py-2 text-[13px] leading-relaxed",
                            isMine
                              ? "bg-gradient-brand text-white rounded-2xl rounded-br-md"
                              : "bg-secondary text-foreground rounded-2xl rounded-bl-md"
                          )}
                        >
                          <p>{msg.content}</p>
                          <p className={cn("text-[9px] mt-1 text-right", isMine ? "text-primary-foreground/50" : "text-muted-foreground")}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-3 border-t border-primary/20 bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 bg-secondary rounded-2xl px-3 py-1.5">
            <button className="p-1.5 rounded-full hover:bg-background/50 transition-colors text-muted-foreground hover:text-foreground" title="Send image">
              <Image className="w-5 h-5" />
            </button>
            <button className="p-1.5 rounded-full hover:bg-background/50 transition-colors text-muted-foreground hover:text-foreground" title="Voice note">
              <Mic className="w-5 h-5" />
            </button>
            <input
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              placeholder="Message..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground py-1.5"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button className="p-1.5 rounded-full hover:bg-background/50 transition-colors text-muted-foreground hover:text-foreground" title="Emoji">
              <Smile className="w-5 h-5" />
            </button>
            {msgInput.trim() && (
              <button
                onClick={sendMessage}
                disabled={sendingMsg}
                className="p-1.5 rounded-full bg-primary flex items-center justify-center disabled:opacity-40"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ---- MOBILE VIEW: show list or chat ---- */
  const MobileView = () => (
    <AppLayout>
      {activeChat ? (
        <div className="flex flex-col h-[calc(100dvh-60px)]">
          <ChatPanel className="flex-1" />
        </div>
      ) : (
        <ConversationList />
      )}
    </AppLayout>
  );

  /* ---- DESKTOP VIEW: split panel ---- */
  const DesktopView = () => (
    <AppLayout>
      <div className="flex h-[calc(100vh-0px)] -mt-0 border-[3px] border-primary/40 rounded-xl overflow-hidden m-2">
        {/* Left: conversation list */}
        <div className="w-[340px] xl:w-[380px] border-r border-primary/30 bg-card/50 shrink-0">
          <ConversationList />
        </div>
        {/* Right: chat panel */}
        <div className="flex-1 bg-background">
          <ChatPanel />
        </div>
      </div>
    </AppLayout>
  );

  return (
    <>
      <div className="hidden lg:block"><DesktopView /></div>
      <div className="lg:hidden"><MobileView /></div>
    </>
  );
}
