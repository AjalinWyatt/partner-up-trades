import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, Bell, MessageSquare } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Partners = () => {
  const navigate = useNavigate();

  // Dynamic data — empty until populated from Supabase
  const alerts: { name: string; text: string; sub: string }[] = [];
  const pendingRequests: { initials: string; name: string; meta: string; match: string; gradient: string }[] = [];
  const partners: { initials: string; name: string; meta: string; streak: number; lastActive: string; online: boolean; gradient: string }[] = [];
  const groups: { name: string; members: number; activity: string; badge: string; badgeColor: string; avatars: { initials: string; gradient: string }[]; extra?: number }[] = [];

  const isEmpty = alerts.length === 0 && pendingRequests.length === 0 && partners.length === 0 && groups.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-14">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-5 pt-4 pb-2">
          <h1 className="text-lg font-black text-foreground">Partners</h1>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">No partners yet</p>
            <p className="text-xs text-muted-foreground max-w-[240px]">Find your accountability partner and start building streaks together.</p>
          </div>
        ) : (
          <div className="px-5 space-y-4 pb-8">
            {/* Alerts */}
            {alerts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Alerts</span>
                </div>
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl mb-1.5" style={{ background: "rgba(228,92,45,0.08)", border: "1px solid rgba(228,92,45,0.2)" }}>
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "rgba(228,92,45,0.12)" }}>
                      <Bell className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground">{a.name} {a.text}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{a.sub}</div>
                    </div>
                    <button className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-orange-500 shrink-0" style={{ background: "rgba(228,92,45,0.15)" }}>Check in</button>
                  </div>
                ))}
              </section>
            )}

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pending Requests</span>
                  <span className="text-[11px] text-muted-foreground">{pendingRequests.length}</span>
                </div>
                {pendingRequests.map((r, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 bg-card border border-border rounded-xl mb-1.5">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${r.gradient} flex items-center justify-center text-xs font-black text-primary-foreground shrink-0`}>{r.initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground">{r.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{r.meta}</div>
                      <div className="text-[10px] font-extrabold text-success mt-0.5">{r.match} match</div>
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
            )}

            {/* My Partners */}
            {partners.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">My Partners</span>
                  <span className="text-[11px] text-muted-foreground">{partners.length}</span>
                </div>
                {partners.map((p, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 bg-card border border-border rounded-xl mb-1.5 cursor-pointer hover:bg-card/80 transition-colors">
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
                        ⚡ {p.streak}
                      </div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{p.lastActive}</div>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* My Groups */}
            {groups.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">My Groups</span>
                  <span className="text-[11px] text-muted-foreground">{groups.length}</span>
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
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Partners;
