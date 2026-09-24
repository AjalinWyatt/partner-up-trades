import { useState, useEffect, useRef } from "react";
import { useSessionCache, invalidateSessionCache } from "@/hooks/use-session-cache";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Search, Tag as TagIcon, BadgeCheck, Megaphone, SquarePen, Phone, MoreVertical } from "lucide-react";
import brandGlobe from "@/assets/pulse-globe.svg";
import tradersworldGlobe from "@/assets/tradersworld-globe.png";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import { useSwipeBack } from "@/hooks/use-swipe-back";
import type { Connection, Message } from "@/components/messages/types";
import { groupMessagesByDate } from "@/components/messages/utils";
import AvatarIcon from "@/components/messages/AvatarIcon";
import MessageBubble from "@/components/messages/MessageBubble";
import VoiceRecorder from "@/components/messages/VoiceRecorder";
import AttachmentButton from "@/components/messages/AttachmentButton";
import ConversationTagsSheet from "@/components/messages/ConversationTagsSheet";
import { TRADERSWORLD_SYSTEM_USER_ID } from "@/lib/systemDM";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import SafetyMenu from "@/components/safety/SafetyMenu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

const SYSTEM_CONNECTION_ID = "system-tradersworld";

export default function Messages() {
  const { loading: guardLoading, onboardingComplete } = useOnboardingGuard();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  // Hydrate the conversation list from sessionStorage so revisits paint instantly.
  const [connections, setConnections, hadConnsCache] = useSessionCache<Connection[]>("messages:connections", []);
  const [loading, setLoading] = useState(!hadConnsCache);
  const [search, setSearch] = useState("");
  const [activeChat, setActiveChat] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [allTags, setAllTags] = useState<{ id: string; name: string }[]>([]);
  const [assignmentsByPartner, setAssignmentsByPartner] = useState<Record<string, string[]>>({});
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [partnerTrading, setPartnerTrading] = useState<{ markets?: string[] | null; experience_level?: string | null; trading_style?: string[] | null } | null>(null);
  const [systemExitOpen, setSystemExitOpen] = useState(false);
  const [deletingSystem, setDeletingSystem] = useState(false);
  const [inboxFilter, setInboxFilter] = useState<"all" | "unread" | "partners" | "requests">("all");

  // Safe left-edge swipe-back: in chat view, swipe right to return to DM list
  useSwipeBack({
    onBack: () => setActiveChat(null),
    enabled: !!activeChat,
  });

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setMyAvatarUrl((data as any)?.avatar_url || null));
  }, [userId]);

  useEffect(() => {
    if (!activeChat?.partnerId || activeChat.id === SYSTEM_CONNECTION_ID) { setPartnerTrading(null); return; }
    supabase
      .from("trading_profiles")
      .select("markets, experience_level, trading_style")
      .eq("user_id", activeChat.partnerId)
      .maybeSingle()
      .then(({ data }) => setPartnerTrading((data as any) || null));
  }, [activeChat?.partnerId]);

  const loadTagData = async (uid: string) => {
    const { data: t } = await supabase
      .from("conversation_tags" as any)
      .select("id, name")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    const { data: a } = await supabase
      .from("conversation_tag_assignments" as any)
      .select("tag_id, partner_id")
      .eq("user_id", uid);
    setAllTags(((t as any) || []) as any);
    const map: Record<string, string[]> = {};
    ((a as any) || []).forEach((row: any) => {
      if (!map[row.partner_id]) map[row.partner_id] = [];
      map[row.partner_id].push(row.tag_id);
    });
    setAssignmentsByPartner(map);
  };

  useEffect(() => { if (userId) loadTagData(userId); }, [userId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) { navigate("/sign-in"); return; }
      setUserId(data.session.user.id);
    });
  }, [navigate]);

  const loadConnections = async (uid: string) => {
    if (connections.length === 0) setLoading(true);
    const { data: conns } = await supabase
      .from("partner_connections")
      .select("*")
      .eq("status", "accepted")
      .or(`requester_id.eq.${uid},receiver_id.eq.${uid}`);

    const safeConns = conns || [];
    const partnerIds = safeConns.map((c: any) => c.requester_id === uid ? c.receiver_id : c.requester_id);
    const [{ data: profiles }, { data: recentMessages }] = await Promise.all([
      partnerIds.length > 0
        ? supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", partnerIds)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from("messages")
        .select("content, created_at, sender_id, receiver_id, read")
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const connectionList: Connection[] = [];
    const messageRows = (recentMessages || []) as any[];

    for (const c of safeConns) {
      const partnerId = c.requester_id === uid ? c.receiver_id : c.requester_id;
      const profile = profileMap.get(partnerId);
      const threadMessages = messageRows.filter((m) =>
        (m.sender_id === uid && m.receiver_id === partnerId) ||
        (m.sender_id === partnerId && m.receiver_id === uid)
      );
      const last = threadMessages[0];
      const unreadCount = threadMessages.filter((m) => m.sender_id === partnerId && m.receiver_id === uid && m.read === false).length;
      // Graceful fallbacks: if sender_id is missing we can't tell direction,
      // so default to "not from me"; if read is missing default to true so
      // we don't incorrectly show "Sent" forever.
      const lastSenderId = last?.sender_id ?? null;
      const lastFromMe = lastSenderId ? lastSenderId === uid : false;
      const lastRead = typeof last?.read === "boolean" ? last.read : true;

      connectionList.push({
        id: c.id,
        partnerId,
        partnerName: profile?.full_name || (profile?.username ? `@${profile.username}` : "trader"),
        partnerUsername: profile?.username || "",
        avatarUrl: profile?.avatar_url,
        lastMessage: last?.content,
        lastMessageTime: last?.created_at,
        lastMessageFromMe: lastFromMe,
        lastMessageRead: lastRead,
        unreadCount,
      });
    }

    // Synthesize a "TradersWorld" system conversation if any system DMs exist
    // for this user. This appears alongside real partner conversations and is
    // marked as an official channel.
    const sysMsgs = messageRows.filter((m) => m.sender_id === TRADERSWORLD_SYSTEM_USER_ID && m.receiver_id === uid);
    if (sysMsgs && sysMsgs.length > 0) {
      const last = sysMsgs[0];
      const sysUnread = sysMsgs.filter((m) => m.read === false).length;
      connectionList.push({
        id: SYSTEM_CONNECTION_ID,
        partnerId: TRADERSWORLD_SYSTEM_USER_ID,
        partnerName: "TradersWorld",
        partnerUsername: "tradersworld",
        avatarUrl: tradersworldGlobe,
        lastMessage: last?.content,
        lastMessageTime: last?.created_at,
        lastMessageFromMe: false,
        lastMessageRead: typeof last?.read === "boolean" ? last.read : true,
        unreadCount: sysUnread ?? 0,
      });
    }

    // Always sort newest-first by lastMessageTime, with a safe fallback of 0
    // when created_at is missing (those bubble to the bottom).
    const tsOf = (t?: string | null) => {
      if (!t) return 0;
      const n = new Date(t).getTime();
      return Number.isFinite(n) ? n : 0;
    };
    connectionList.sort((a, b) => tsOf(b.lastMessageTime) - tsOf(a.lastMessageTime));

    setConnections(connectionList);
    setLoading(false);

    const partnerParam = new URLSearchParams(window.location.search).get("partner");
    if (partnerParam) {
      const match = connectionList.find(c => c.partnerId === partnerParam);
      if (match) setActiveChat(match);
    }
  };

  useEffect(() => { if (userId) loadConnections(userId); }, [userId]);

  useEffect(() => {
    if (!userId) return;
    // Refresh inbox previews/badges/ticks on any message change involving me.
    const refreshIfMine = (msg: Partial<Message> | undefined) => {
      if (!msg) return;
      if (msg.sender_id === userId || msg.receiver_id === userId) {
        loadConnections(userId);
      }
    };
    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) =>
        refreshIfMine(p.new as Message)
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (p) =>
        refreshIfMine(p.new as Message)
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (p) =>
        refreshIfMine(p.old as Message)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

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
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          if (msg.receiver_id === userId) supabase.from("messages").update({ read: true }).eq("id", msg.id);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (payload) => {
        const oldMsg = payload.old as { id: string };
        setMessages((prev) => prev.filter((m) => m.id !== oldMsg.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChat, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark all unread messages from a partner as read, and clear the badge
  // optimistically so the UI updates immediately.
  async function markConversationRead(conn: Connection) {
    if (!userId) return;
    setConnections((prev) =>
      prev.map((c) => (c.id === conn.id ? { ...c, unreadCount: 0 } : c))
    );
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("sender_id", conn.partnerId)
      .eq("receiver_id", userId)
      .eq("read", false);
  }

  async function sendMessage() {
    if (!msgInput.trim() || !activeChat || !userId) return;
    setSendingMsg(true);
    await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: activeChat.partnerId,
      connection_id: activeChat.id,
      content: msgInput.trim(),
    });
    // Last-message snapshot for the conversation list is now stale.
    invalidateSessionCache("messages:connections");
    setMsgInput("");
    setSendingMsg(false);
    inputRef.current?.focus();
  }

  const filtered = connections.filter(
    (c) =>
      (c.partnerName.toLowerCase().includes(search.toLowerCase()) ||
        c.partnerUsername.toLowerCase().includes(search.toLowerCase())) &&
      (!activeTagId || (assignmentsByPartner[c.partnerId] || []).includes(activeTagId)) &&
      (inboxFilter !== "unread" || c.unreadCount > 0) &&
      inboxFilter !== "requests"
  );

  const grouped = activeChat ? groupMessagesByDate(messages) : [];

  const conversationListContent = (
    <div className="flex h-full min-w-0 w-full flex-col overflow-x-hidden bg-background">
      <div
        className="sticky top-0 z-40 flex items-center justify-between bg-background/95 px-5 pb-3 backdrop-blur-xl"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        {showSearch ? (
          <div className="relative flex-1">
            <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => !search && setShowSearch(false)}
              placeholder="Search"
              className="h-9 rounded-none border-0 border-b border-border bg-transparent pl-7 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        ) : (
          <>
            <h1 className="font-display text-[25px] font-semibold tracking-normal text-foreground">Messages</h1>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSearch(true)} className="text-foreground" aria-label="Search"><Search className="h-5 w-5" /></button>
              <button onClick={() => navigate("/discover")} className="text-foreground" aria-label="New message"><SquarePen className="h-5 w-5" /></button>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 border-b border-border/70 px-5 pb-2">
        {(["all", "unread", "partners", "requests"] as const).map((filter) => {
          const count = filter === "all" ? connections.length : filter === "unread" ? connections.filter((item) => item.unreadCount > 0).length : null;
          return <button key={filter} onClick={() => setInboxFilter(filter)} className={cn("relative shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize", inboxFilter === filter ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-secondary/45 text-muted-foreground")}>{filter}{count !== null ? ` (${count})` : ""}{inboxFilter === filter && <span className="absolute -bottom-[9px] left-1/2 h-0.5 w-8 -translate-x-1/2 bg-accent" />}</button>;
        })}
      </div>

      <div
        className="flex-1 overflow-y-auto px-5 lg:pb-0"
        style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <img src={brandGlobe} alt="" className="mb-3 h-16 w-16 object-contain opacity-80" />
            <p className="text-sm font-medium text-foreground mb-1">No conversations yet</p>
            <p className="text-xs text-muted-foreground mb-4">Connect with a match to start chatting</p>
            <button onClick={() => navigate("/discover")} className="text-xs font-semibold text-info">
              Find matches
            </button>
          </div>
        ) : (
          filtered.map((conn) => {
            const isSystem = conn.id === SYSTEM_CONNECTION_ID;
            return (
            <button
              key={conn.id}
              onClick={() => { setActiveChat(conn); setMsgInput(""); markConversationRead(conn); }}
              className="flex min-h-[72px] w-full items-center gap-3 border-b border-border/60 py-2.5 text-left"
            >
              <div className="relative shrink-0">
                <div className={cn(
                   "h-12 w-12 overflow-hidden rounded-full bg-secondary",
                   isSystem && "ring-1 ring-info/60"
                )}>
                  <AvatarIcon conn={conn} size="md" />
                </div>
                {conn.unreadCount > 0 && (
                   <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-accent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-[14px] font-semibold text-foreground truncate leading-tight">
                    {conn.partnerName.replace(/^@/, "")}
                  </p>
                  {isSystem && (
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-info" />
                  )}
                  {isSystem && (
                    null
                  )}
                </div>
                 <p className={cn("mt-1 truncate text-[12px]", conn.unreadCount > 0 ? "text-foreground/85" : "text-muted-foreground")}> 
                  {conn.lastMessage || "No messages yet"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                 {conn.lastMessageTime && <span className="text-[10px] text-muted-foreground">{new Date(conn.lastMessageTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>}
                 {conn.lastMessage && conn.lastMessageFromMe === true && (
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                       conn.lastMessageRead ? "text-accent" : "text-muted-foreground"
                    )}
                    title={conn.lastMessageRead ? "Seen" : "Sent"}
                  >
                    {conn.lastMessageRead ? "Seen" : "Sent"}
                  </span>
                )}
                {conn.unreadCount > 0 && conn.lastMessageFromMe !== true && (
                   <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                    {conn.unreadCount}
                  </span>
                )}
              </div>
            </button>
            );
          })
        )}
      </div>
    </div>
  );

  const chatPanelContent = !activeChat ? (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Send className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Your messages</h3>
      <p className="text-sm text-muted-foreground text-center max-w-[260px]">
        Select a conversation to start chatting with your trading partners
      </p>
    </div>
  ) : (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden overscroll-none touch-pan-y">
      <div
        className={cn(
           "sticky top-0 z-40 flex w-full max-w-full shrink-0 items-center gap-3 overflow-hidden border-b bg-background/95 px-3 pb-3 pt-[max(3rem,calc(env(safe-area-inset-top,0px)+1rem))] backdrop-blur-xl lg:pt-3",
           activeChat.id === SYSTEM_CONNECTION_ID ? "border-info/40 bg-info/5" : "border-border/60"
        )}
      >
        <button
          onClick={() => {
            if (activeChat.id === SYSTEM_CONNECTION_ID) {
              setSystemExitOpen(true);
            } else {
              setActiveChat(null);
            }
          }}
          className="p-1.5 text-foreground -ml-1"
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
        </button>
        {activeChat.avatarUrl ? (
          <img
            src={activeChat.avatarUrl}
            alt={activeChat.partnerName}
            className={cn(
              "w-9 h-9 rounded-full object-cover bg-secondary shrink-0",
               activeChat.id === SYSTEM_CONNECTION_ID && "ring-1 ring-info/60"
            )}
          />
        ) : (
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
            <AvatarIcon conn={activeChat} size="sm" />
          </div>
        )}
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-[15px] font-semibold text-foreground truncate leading-tight">
              {activeChat.partnerName.replace(/^@/, "")}
            </p>
            {activeChat.id === SYSTEM_CONNECTION_ID && (
               <BadgeCheck className="h-4 w-4 shrink-0 text-info" />
            )}
          </div>
          {activeChat.id === SYSTEM_CONNECTION_ID ? (
             <p className="flex min-w-0 items-center gap-1 truncate text-[11px] font-semibold leading-tight text-info">
              <Megaphone className="h-3 w-3 shrink-0" /> <span className="min-w-0 truncate">Official announcements</span>
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground truncate leading-tight">
              @{activeChat.partnerUsername || activeChat.partnerName.replace(/^@/, "")}
            </p>
          )}
          {partnerTrading && (partnerTrading.markets?.length || partnerTrading.experience_level || partnerTrading.trading_style?.length) ? (
             <p className="mt-0.5 truncate text-[10px] font-medium leading-tight text-muted-foreground">
              {[
                partnerTrading.markets?.[0],
                partnerTrading.experience_level,
                partnerTrading.trading_style?.[0],
              ].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        {activeChat.id !== SYSTEM_CONNECTION_ID && <div className="flex shrink-0 items-center gap-3"><button className="text-foreground" aria-label="Call"><Phone className="h-5 w-5" /></button><SafetyMenu targetId={activeChat.partnerId} username={activeChat.partnerUsername} context="chat" onBlockedChange={(b) => { if (b) { setActiveChat(null); invalidateSessionCache("messages:connections"); setConnections((c) => c.filter((x) => x.partnerId !== activeChat.partnerId)); } }} trigger={<button className="text-foreground" aria-label="Conversation options"><MoreVertical className="h-5 w-5" /></button>} extraItems={<DropdownMenuItem onSelect={() => setTagsOpen(true)}><TagIcon className="mr-2 h-4 w-4" />Tags</DropdownMenuItem>} /></div>}
      </div>
      {(assignmentsByPartner[activeChat.partnerId] || []).length > 0 && (
        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-1.5 overflow-hidden px-4 pt-2">
          {(assignmentsByPartner[activeChat.partnerId] || [])
            .map((tid) => allTags.find((t) => t.id === tid))
            .filter(Boolean)
            .map((t) => (
              <span key={t!.id} className="max-w-full truncate rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {t!.name}
              </span>
            ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 touch-pan-y">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AvatarIcon conn={activeChat} size="lg" />
            <p className="text-sm font-semibold text-foreground mt-3">{activeChat.partnerName}</p>
            <p className="text-xs text-muted-foreground mt-1">Start a conversation with your trading partner</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.date}>
              <div className="flex items-center justify-center my-4">
               <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-medium text-muted-foreground">
                  {group.date}
                </span>
              </div>
              <div className="w-full max-w-full space-y-1.5 overflow-x-hidden">
                {group.messages.map((msg, idx) => {
                  const isMine = msg.sender_id === userId;
                  const next = group.messages[idx + 1];
                  // Show avatar only on the last incoming message in a streak
                  const showAvatar = !isMine && (!next || next.sender_id !== msg.sender_id);
                  return (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isMine={isMine}
                      partnerAvatarUrl={activeChat.avatarUrl}
                      partnerName={activeChat.partnerName}
                      showAvatar={showAvatar}
                      onDeleted={(id) => setMessages((prev) => prev.filter((m) => m.id !== id))}
                      onEdited={(id, content) => setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content } : m))}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {activeChat.id === SYSTEM_CONNECTION_ID ? (
        <div className="shrink-0 overflow-hidden px-4 pt-2 pb-safe-4">
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-[12px] text-foreground/80">
            <Megaphone className="w-4 h-4 text-primary shrink-0" />
            <span className="min-w-0 break-words">This is an official TradersWorld channel. Replies are disabled.</span>
          </div>
        </div>
      ) : (
      <div className="shrink-0 overflow-hidden px-4 pt-2 pb-safe-4">
         <div className="relative flex w-full max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-full border border-border bg-secondary/70 py-1.5 pl-3 pr-1.5">
          <AttachmentButton
            userId={userId!}
            connectionId={activeChat.id}
            partnerId={activeChat.partnerId}
            onSent={() => {}}
          />
          <span className="h-5 w-px shrink-0 bg-foreground/30" />
          <input
            ref={inputRef}
            value={msgInput}
            onChange={(e) => setMsgInput(e.target.value)}
            placeholder="Type here"
            className="min-w-0 flex-1 bg-transparent border-none py-1.5 text-[16px] text-foreground outline-none placeholder:text-muted-foreground lg:text-sm"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          {msgInput.trim() ? (
            <button
              onClick={sendMessage}
              disabled={sendingMsg}
               className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent disabled:opacity-40"
            >
               <Send className="h-5 w-5 text-accent-foreground" />
            </button>
          ) : (
             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-transparent">
              <VoiceRecorder
                userId={userId!}
                connectionId={activeChat.id}
                partnerId={activeChat.partnerId}
                onSent={() => {}}
              />
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );

  return (
    <>
      <div className="hidden lg:block">
        <AppLayout>
          <div className="m-2 flex h-[calc(100vh-16px)] overflow-hidden rounded-lg border border-border">
            <div className="w-[340px] shrink-0 border-r border-border bg-background xl:w-[380px]">
              {conversationListContent}
            </div>
            <div className="flex-1 bg-background">
              {chatPanelContent}
            </div>
          </div>
        </AppLayout>
      </div>
      <div className="lg:hidden">
        <AppLayout hideBottomNav={!!activeChat} lockHeight>
          {activeChat ? (
            <div className="flex flex-col h-full min-h-0">
              {chatPanelContent}
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              {conversationListContent}
            </div>
          )}
        </AppLayout>
      </div>
      {userId && (
        <ConversationTagsSheet
          open={tagsOpen}
          onOpenChange={setTagsOpen}
          userId={userId}
          partnerId={activeChat?.partnerId}
          partnerName={activeChat?.partnerName}
          onChanged={() => loadTagData(userId)}
        />
      )}
      <AlertDialog open={systemExitOpen} onOpenChange={setSystemExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keep this in your DMs?</AlertDialogTitle>
            <AlertDialogDescription>
              You can keep this announcement in your inbox or delete it for a
              cleaner thread. Either way, we won't keep stacking up promos —
              new announcements come as a fresh, one-and-done message.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setSystemExitOpen(false);
                setActiveChat(null);
              }}
            >
              Keep
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingSystem}
              onClick={async (e) => {
                e.preventDefault();
                if (deletingSystem) return;
                setDeletingSystem(true);
                const { data, error } = await supabase.functions.invoke(
                  "delete-system-dms",
                  { body: {} },
                );
                setDeletingSystem(false);
                if (error) {
                  toast.error("Couldn't delete — try again");
                  return;
                }
                toast.success("Deleted from your DMs");
                setSystemExitOpen(false);
                setActiveChat(null);
                if (userId) loadConnections(userId);
              }}
            >
              {deletingSystem ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
