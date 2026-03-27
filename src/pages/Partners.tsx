import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Heart, Zap, MessageSquare, User, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";

// Mock data
const alerts = [
  { name: "David T.", text: "hasn't logged in 2 days", sub: "Last active: Tuesday · Crypto · NY session" },
  { name: "Marcus K.", text: "had 3 tough days in a row", sub: "May need support · Forex · Lagos" },
];

const pendingRequests = [
  { initials: "KW", name: "Kofi W.", meta: "Forex · New York session", match: "91%", gradient: "from-purple-600 to-pink-600" },
  { initials: "JR", name: "Jade R.", meta: "Gold · London session", match: "88%", gradient: "from-primary to-success" },
];

const partners = [
  { initials: "AL", name: "Amara L.", meta: "Gold · London · Smart money", streak: 12, lastActive: "2h ago", online: true, gradient: "from-primary to-success" },
  { initials: "MK", name: "Marcus K.", meta: "Forex · Lagos · Price action", streak: 8, lastActive: "5h ago", online: true, gradient: "from-blue-700 to-purple-600" },
  { initials: "DT", name: "David T.", meta: "Crypto · NY session · Swing", streak: 3, lastActive: "2d ago", online: false, gradient: "from-orange-600 to-amber-500" },
];

const groups = [
  {
    name: "Gold London Crew", members: 4, activity: "Active today", badge: "Small", badgeColor: "bg-primary/15 text-primary",
    avatars: [
      { initials: "AL", gradient: "from-primary to-success" },
      { initials: "SR", gradient: "from-purple-600 to-pink-600" },
      { initials: "MK", gradient: "from-blue-700 to-purple-600" },
      { initials: "KM", gradient: "from-orange-600 to-amber-500" },
    ],
  },
  {
    name: "ICT Strategy Circle", members: 8, activity: "Active yesterday", badge: "Circle", badgeColor: "bg-success/15 text-success",
    avatars: [
      { initials: "TM", gradient: "from-primary to-success" },
      { initials: "JO", gradient: "from-success to-primary" },
      { initials: "NP", gradient: "from-pink-600 to-purple-600" },
      { initials: "RW", gradient: "from-primary to-success" },
    ],
    extra: 4,
  },
];

const logEntries = [
  { who: "Amara", initials: "AL", pnl: "+38 pips", pnlPos: true, mood: "Great session", moodColor: "bg-success", time: "2h ago", tags: [{ text: "Followed plan", type: "right" }, { text: "Clean entry", type: "right" }, { text: "Gold · London", type: "neutral" }] },
  { who: "You", initials: "TM", pnl: "+24 pips", pnlPos: true, mood: "Good day", moodColor: "bg-success", time: "3h ago", tags: [{ text: "Stuck to plan", type: "right" }, { text: "Gold · London", type: "neutral" }] },
  { who: "Amara", initials: "AL", pnl: "-15 pips", pnlPos: false, mood: "Tough day", moodColor: "bg-destructive", time: "Yesterday", tags: [{ text: "FOMO entry", type: "wrong" }, { text: "Moved stop", type: "wrong" }, { text: "Gold · London", type: "neutral" }] },
  { who: "You", initials: "TM", pnl: "+52 pips", pnlPos: true, mood: "Best session this week", moodColor: "bg-success", time: "Yesterday", tags: [{ text: "Patience", type: "right" }, { text: "Textbook setup", type: "right" }, { text: "Gold · London", type: "neutral" }] },
];

const Partners = () => {
  const navigate = useNavigate();
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-14">
      <AnimatePresence mode="wait">
        {!detailOpen ? (
          <motion.div key="list" initial={{ x: 0 }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.25 }} className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="px-5 pt-4 pb-2">
              <h1 className="text-lg font-black text-foreground">Partners</h1>
            </div>

            <div className="px-5 space-y-4 pb-8">
              {/* Alerts */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Alerts</span>
                </div>
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl mb-1.5" style={{ background: "rgba(228,92,45,0.08)", border: "1px solid rgba(228,92,45,0.2)" }}>
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "rgba(228,92,45,0.12)" }}>
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground">{a.name} {a.text}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{a.sub}</div>
                    </div>
                    <button className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-orange-500 shrink-0" style={{ background: "rgba(228,92,45,0.15)" }}>Check in</button>
                  </div>
                ))}
              </section>

              {/* Pending Requests */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Requests</span>
                  <span className="text-[11px] text-muted-foreground">2</span>
                </div>
                {pendingRequests.map((r, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 bg-card border border-border rounded-xl mb-1.5">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${r.gradient} flex items-center justify-center text-xs font-black text-primary-foreground shrink-0`}>{r.initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground">{r.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{r.meta}</div>
                      <div className="text-[10px] font-extrabold text-gradient-accent mt-0.5">{r.match} match</div>
                    </div>
                    <button
                      onClick={() => navigate("/view-profile")}
                      className="px-3 py-1 rounded-lg bg-gradient-to-r from-primary to-success text-[10px] font-bold text-primary-foreground shrink-0"
                    >
                      View Profile
                    </button>
                  </div>
                ))}
              </section>

              {/* My Partners */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">My Partners</span>
                  <span className="text-[11px] text-muted-foreground">3</span>
                </div>
                {partners.map((p, i) => (
                  <div key={i} onClick={() => setDetailOpen(true)} className="flex items-center gap-2.5 p-2.5 bg-card border border-border rounded-xl mb-1.5 cursor-pointer hover:bg-card/80 transition-colors">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${p.gradient} flex items-center justify-center text-[13px] font-black text-primary-foreground`}>{p.initials}</div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${p.online ? "bg-success" : "bg-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-foreground truncate">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{p.meta}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`flex items-center gap-1 text-sm font-extrabold ${p.online ? "text-success" : "text-muted-foreground"}`}>
                        <Zap className="w-3 h-3" /> {p.streak}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{p.lastActive}</div>
                    </div>
                  </div>
                ))}
              </section>

              {/* My Groups */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">My Groups</span>
                  <span className="text-[11px] text-muted-foreground">2</span>
                </div>
                {groups.map((g, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 bg-card border border-border rounded-xl mb-1.5 cursor-pointer hover:bg-card/80 transition-colors">
                    <div className="flex -space-x-2">
                      {g.avatars.map((a, j) => (
                        <div key={j} className={`w-7 h-7 rounded-full bg-gradient-to-br ${a.gradient} flex items-center justify-center text-[9px] font-extrabold text-primary-foreground border-2 border-card`}>{a.initials}</div>
                      ))}
                      {g.extra && <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[8px] text-muted-foreground border-2 border-card">+{g.extra}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-foreground">{g.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{g.members} members · {g.activity}</div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${g.badgeColor}`}>{g.badge}</span>
                  </div>
                ))}
              </section>
            </div>
          </motion.div>
        ) : (
          <motion.div key="detail" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.25 }} className="flex-1 overflow-y-auto">
            {/* Detail Nav */}
            <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
              <button onClick={() => setDetailOpen(false)} className="w-7 h-7 flex items-center justify-center"><ChevronLeft className="w-5 h-5 text-foreground" /></button>
              <span className="text-base font-extrabold text-foreground flex-1">Amara L.</span>
              <button className="w-7 h-7 flex items-center justify-center opacity-60"><MessageSquare className="w-5 h-5 text-foreground" strokeWidth={1.6} /></button>
            </div>

            <div className="px-5 pb-8">
              {/* Header */}
              <div className="text-center mb-4">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-success flex items-center justify-center text-xl font-black text-primary-foreground">AL</div>
                  <div className="absolute -inset-1 rounded-full border-2 border-success/40" />
                </div>
                <div className="text-[15px] font-extrabold text-foreground">Amara L.</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Gold · London session · Smart money / ICT</div>
                <div className="flex justify-center gap-1 mt-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-success text-[9px] font-bold text-primary-foreground">Gold</span>
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-success text-[9px] font-bold text-primary-foreground">Forex</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-px bg-border rounded-[10px] overflow-hidden mb-3">
                {[{ n: "12", l: "Day Streak" }, { n: "34", l: "Days Partnered" }, { n: "94%", l: "Match" }].map(s => (
                  <div key={s.l} className="bg-card p-3 text-center">
                    <div className="text-lg font-black text-foreground">{s.n}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-1.5 mb-3">
                {[{ icon: MessageSquare, label: "Message" }, { icon: User, label: "Profile" }, { icon: Zap, label: "Nudge" }].map(a => {
                  const Icon = a.icon;
                  return (
                    <button key={a.label} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-[10px] bg-card border border-border hover:bg-card/80 transition-colors">
                      <Icon className="w-[18px] h-[18px] text-muted-foreground" strokeWidth={1.6} />
                      <span className="text-[9px] font-semibold text-muted-foreground">{a.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Shared Log */}
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Shared Log</div>
              {logEntries.map((e, i) => (
                <div key={i} className="bg-card border border-border rounded-[10px] p-2.5 mb-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-success flex items-center justify-center text-[7px] font-extrabold text-primary-foreground">{e.initials}</div>
                      <span className="text-[11px] font-bold text-foreground">{e.who}</span>
                    </div>
                    <span className={`text-xs font-extrabold ${e.pnlPos ? "text-success" : "text-destructive"}`}>{e.pnl}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${e.moodColor}`} />
                    <span className="text-[10px] text-muted-foreground">{e.mood}</span>
                    <span className="text-[9px] text-muted-foreground ml-auto">{e.time}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {e.tags.map((t, j) => (
                      <span key={j} className={`text-[8px] font-semibold px-1.5 py-0.5 rounded ${
                        t.type === "right" ? "bg-success/10 text-success" :
                        t.type === "wrong" ? "bg-destructive/10 text-destructive" :
                        "bg-muted text-muted-foreground"
                      }`}>{t.text}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <BottomNav />
    </div>
  );
};

export default Partners;
