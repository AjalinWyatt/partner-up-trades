import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Globe, ArrowLeft, Send, Search, Tag as TagIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard";
import type { Connection, Message } from "@/components/messages/types";
import { groupMessagesByDate } from "@/components/messages/utils";
import AvatarIcon from "@/components/messages/AvatarIcon";
import MessageBubble from "@/components/messages/MessageBubble";
import VoiceRecorder from "@/components/messages/VoiceRecorder";
import AttachmentButton from "@/components/messages/AttachmentButton";
import ConversationTagsSheet from "@/components/messages/ConversationTagsSheet";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [allTags, setAllTags] = useState<{ id: string; name: string }[]>([]);
  const [assignmentsByPartner, setAssignmentsByPartner] = useState<Record<string, string[]>>({});
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [partnerTrading, setPartnerTrading] = useState<{ markets?: string[] | null; experience_level?: string | null; trading_style?: string[] | null } | null>(null);

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
    if (!activeChat?.partnerId) { setPartnerTrading(null); return; }
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
        .select("content, created_at, sender_id, read")
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
        partnerName: profile?.username ? `@${profile.username}` : "trader",
        partnerUsername: profile?.username || "",
        avatarUrl: profile?.avatar_url,
        lastMessage: lastMsgs?.[0]?.content,
        lastMessageTime: lastMsgs?.[0]?.created_at,
        lastMessageFromMe: lastMsgs?.[0]?.sender_id === uid,
        lastMessageRead: lastMsgs?.[0]?.read,
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

    const partnerParam = new URLSearchParams(window.location.search).get("partner");
    if (partnerParam) {
      const match = connectionList.find(c => c.partnerId === partnerParam);
      if (match) setActiveChat(match);
    }
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
    inputRef.current?.focus();
  }

  const filtered = connections.filter(
    (c) =>
      (c.partnerName.toLowerCase().includes(search.toLowerCase()) ||
        c.partnerUsername.toLowerCase().includes(search.toLowerCase())) &&
      (!activeTagId || (assignmentsByPartner[c.partnerId] || []).includes(activeTagId))
  );

  const grouped = activeChat ? groupMessagesByDate(messages) : [];

  const conversationListContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        {showSearch ? (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => !search && setShowSearch(false)}
              placeholder="Search"
              className="pl-9 bg-secondary border-none text-foreground placeholder:text-muted-foreground rounded-xl h-9 text-sm"
            />
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowSearch(true)}
              className="p-1 text-foreground"
              aria-label="Search"
            >
              <Search className="w-6 h-6" strokeWidth={2} />
            </button>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              Traders<span className="font-bold">World</span>
            </h1>
            <button
              onClick={() => navigate("/profile")}
              className="w-10 h-10 rounded-full overflow-hidden bg-secondary shrink-0"
              aria-label="My profile"
            >
              {myAvatarUrl ? (
                <img src={myAvatarUrl} alt="Me" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-brand" />
              )}
            </button>
          </>
        )}
      </div>

      <div className="px-4 pb-4 flex items-center gap-2 overflow-x-auto scrollbar-none">
        {allTags.map((t) => {
          const active = activeTagId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTagId(active ? null : t.id)}
              className={cn(
                "shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors border",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-foreground border-foreground/70"
              )}
            >
              {t.name}
            </button>
          );
        })}
        <button
          onClick={() => setTagsOpen(true)}
          className="shrink-0 ml-auto h-7 w-7 rounded-full border border-border flex items-center justify-center text-primary hover:bg-muted"
          aria-label="Manage tags"
        >
          <TagIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5">
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
              className="w-full flex items-center gap-3 py-2.5 text-left"
            >
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary">
                  <AvatarIcon conn={conn} size="md" />
                </div>
                {conn.unreadCount > 0 && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-foreground truncate leading-tight">
                  {conn.partnerName.replace(/^@/, "")}
                </p>
                <p className={cn("text-[13px] truncate mt-0.5", conn.unreadCount > 0 ? "text-foreground" : "text-muted-foreground")}>
                  {conn.lastMessage || "No messages yet"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {conn.lastMessage && conn.lastMessageFromMe && (
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      conn.lastMessageRead ? "text-primary" : "text-muted-foreground"
                    )}
                    title={conn.lastMessageRead ? "Seen" : "Sent"}
                  >
                    {conn.lastMessageRead ? "Seen" : "Sent"}
                  </span>
                )}
                {conn.unreadCount > 0 && !conn.lastMessageFromMe && (
                  <span className="min-w-[20px] h-[20px] bg-primary rounded-full flex items-center justify-center text-[11px] font-bold text-primary-foreground px-1.5">
                    {conn.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))
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
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border/40">
        <button
          onClick={() => setActiveChat(null)}
          className="p-1.5 text-foreground -ml-1"
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
        </button>
        {activeChat.avatarUrl ? (
          <img
            src={activeChat.avatarUrl}
            alt={activeChat.partnerName}
            className="w-9 h-9 rounded-full object-cover bg-secondary shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
            <AvatarIcon conn={activeChat} size="sm" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-foreground truncate leading-tight">
            {activeChat.partnerName.replace(/^@/, "")}
          </p>
          <p className="text-[11px] text-muted-foreground truncate leading-tight">
            @{activeChat.partnerUsername || activeChat.partnerName.replace(/^@/, "")}
          </p>
          {partnerTrading && (partnerTrading.markets?.length || partnerTrading.experience_level || partnerTrading.trading_style?.length) ? (
            <p className="text-[10px] text-primary/80 truncate leading-tight mt-0.5 font-medium">
              {[
                partnerTrading.markets?.[0],
                partnerTrading.experience_level,
                partnerTrading.trading_style?.[0],
              ].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <button
          onClick={() => setTagsOpen(true)}
          className="p-2 text-primary shrink-0"
          aria-label="Tag conversation"
          title="Tag conversation"
        >
          <TagIcon className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
      {(assignmentsByPartner[activeChat.partnerId] || []).length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap px-4 pt-2">
          {(assignmentsByPartner[activeChat.partnerId] || [])
            .map((tid) => allTags.find((t) => t.id === tid))
            .filter(Boolean)
            .map((t) => (
              <span key={t!.id} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-semibold">
                {t!.name}
              </span>
            ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4">
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
                <span className="text-[10px] text-muted-foreground bg-secondary px-3 py-1 rounded-full font-medium">
                  {group.date}
                </span>
              </div>
              <div className="space-y-1.5">
                {group.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMine={msg.sender_id === userId}
                    onDeleted={(id) => setMessages((prev) => prev.filter((m) => m.id !== id))}
                    onEdited={(id, content) => setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content } : m))}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center gap-2 bg-secondary/70 rounded-full pl-3 pr-1.5 py-1.5">
          <AttachmentButton
            userId={userId!}
            connectionId={activeChat.id}
            partnerId={activeChat.partnerId}
            onSent={() => {}}
          />
          <span className="w-px h-5 bg-foreground/30" />
          <input
            ref={inputRef}
            value={msgInput}
            onChange={(e) => setMsgInput(e.target.value)}
            placeholder="Type here"
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground py-1.5"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          {msgInput.trim() ? (
            <button
              onClick={sendMessage}
              disabled={sendingMsg}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center disabled:opacity-40"
            >
              <Send className="w-5 h-5 text-primary-foreground" />
            </button>
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
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
    </div>
  );

  return (
    <>
      <div className="hidden lg:block">
        <AppLayout>
          <div className="flex h-[calc(100vh-0px)] -mt-0 border-[3px] border-primary/40 rounded-xl overflow-hidden m-2">
            <div className="w-[340px] xl:w-[380px] border-r border-primary/30 bg-card/50 shrink-0">
              {conversationListContent}
            </div>
            <div className="flex-1 bg-background">
              {chatPanelContent}
            </div>
          </div>
        </AppLayout>
      </div>
      <div className="lg:hidden">
        <AppLayout hideBottomNav={!!activeChat}>
          {activeChat ? (
            <div className="flex flex-col h-[100dvh]">
              {chatPanelContent}
            </div>
          ) : (
            conversationListContent
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
    </>
  );
}
