import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronDown, X, UserPlus, Link2, ImageIcon, Settings } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";

const ViewProfile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [matchOpen, setMatchOpen] = useState(false);

  // Dynamic data — empty until populated from Supabase
  const user: {
    username: string; name: string; tagline: string; location: string;
    initials: string; markets: string[]; verified: boolean;
  } | null = null;

  const matchScore: number | null = null;
  const matchBreakdown: { label: string; value: string; match: boolean }[] = [];
  const stats = { partners: 0, groups: 0, followers: 0 };
  const posts: { bg: string; pips?: string; pos?: boolean }[] = [];
  const details = {
    watchingFor: [] as string[],
    offCharts: [] as string[],
    tradingDetails: [] as { k: string; v: string }[],
    workingOn: [] as string[],
  };

  const hasDetails =
    details.watchingFor.length > 0 || details.offCharts.length > 0 ||
    details.tradingDetails.length > 0 || details.workingOn.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Nav */}
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="w-7 h-7 flex items-center justify-center"><ChevronLeft className="w-5 h-5 text-foreground" /></button>
        <div className="flex items-center gap-1 flex-1">
          <span className="text-base font-extrabold text-foreground">{user?.username ?? "@..."}</span>
          {user?.verified && (
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" fill="url(#vg3)" />
              <path d="M6.5 10l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <defs><linearGradient id="vg3" x1="0" y1="0" x2="20" y2="20"><stop stopColor="hsl(var(--primary))" /><stop offset="1" stopColor="hsl(var(--success))" /></linearGradient></defs>
            </svg>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Match Badge */}
        {matchScore !== null && (
          <div className="mx-5 mb-3 bg-card border border-success/20 rounded-xl overflow-hidden">
            <button onClick={() => setMatchOpen(!matchOpen)} className="w-full flex items-center gap-2.5 p-3 bg-gradient-to-r from-primary/10 to-success/10">
              <span className="text-[28px] font-black text-success">{matchScore}%</span>
              <div className="flex-1 text-left">
                <div className="text-[13px] font-bold text-foreground">Match with you</div>
                <div className="text-[10px] text-muted-foreground">Tap to see why</div>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", matchOpen && "rotate-180")} />
            </button>
            {matchOpen && matchBreakdown.length > 0 && (
              <div className="px-3.5 pb-2.5">
                {matchBreakdown.map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${m.match ? "bg-success" : "bg-primary"}`} />
                      <span className="text-[10px] text-muted-foreground">{m.label}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${m.match ? "text-success" : "text-primary"}`}>{m.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="text-center px-5 pb-3">
          <div className="relative w-20 h-20 mx-auto mb-2">
            <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-[26px] font-black text-muted-foreground">
              {user?.initials ?? "?"}
            </div>
          </div>
          <div className="text-base font-extrabold text-foreground">{user?.name ?? "—"}</div>
          {user?.tagline && <div className="text-xs text-muted-foreground mt-0.5">{user.tagline}</div>}
          {user?.location && (
            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              {user.location}
            </div>
          )}
          {user?.markets && user.markets.length > 0 && (
            <div className="flex justify-center gap-1 mt-1.5">
              {user.markets.map(m => (
                <span key={m} className="px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-success text-[8px] font-bold text-primary-foreground">{m}</span>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-7 px-5 py-3 border-t border-b border-border mx-5 mb-3">
          {[
            { n: String(stats.partners), l: "partners" },
            { n: String(stats.groups), l: "groups" },
            { n: String(stats.followers), l: "followers" },
          ].map(s => (
            <div key={s.l} className="text-center">
              <div className="text-base font-black text-foreground">{s.n}</div>
              <div className="text-[10px] text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-10 px-5 mb-1">
          {["Posts", "Details"].map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={cn(
                "py-2.5 text-[10px] font-bold uppercase tracking-wider relative transition-colors",
                activeTab === i ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {tab}
              {activeTab === i && <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-primary to-success" />}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 0 ? (
          posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-[2px] p-[2px]">
              {posts.map((p, i) => (
                <div key={i} className={`aspect-square bg-gradient-to-br ${p.bg} relative overflow-hidden`}>
                  {p.pips && (
                    <>
                      <div className="absolute bottom-[8%] left-[8%] right-[8%] h-[35%]">
                        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                          <polyline
                            points={p.pos ? "0,35 15,28 30,30 50,12 70,6 100,2" : "0,8 20,15 50,28 80,35 100,32"}
                            fill="none" stroke={p.pos ? "hsl(var(--success))" : "#E45C2D"} strokeWidth="2"
                          />
                        </svg>
                      </div>
                      <div className={`absolute bottom-1 left-1.5 text-[10px] font-bold px-1 py-0.5 rounded ${p.pos ? "text-success bg-success/15" : "text-orange-500 bg-orange-500/15"}`}>{p.pips}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No posts yet</p>
              <p className="text-xs text-muted-foreground">This trader hasn't shared any posts.</p>
            </div>
          )
        ) : (
          hasDetails ? (
            <div className="px-5 py-3 space-y-2">
              {details.watchingFor.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Watching for</div>
                  <div className="flex flex-wrap gap-1">{details.watchingFor.map(d => <span key={d} className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">{d}</span>)}</div>
                </div>
              )}
              {details.offCharts.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Off the charts</div>
                  <div className="flex flex-wrap gap-1">{details.offCharts.map(d => <span key={d} className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">{d}</span>)}</div>
                </div>
              )}
              {details.tradingDetails.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Trading details</div>
                  {details.tradingDetails.map(d => (
                    <div key={d.k} className="flex justify-between py-1.5 border-b border-border last:border-0">
                      <span className="text-[11px] text-muted-foreground">{d.k}</span>
                      <span className="text-[11px] font-bold text-foreground">{d.v}</span>
                    </div>
                  ))}
                </div>
              )}
              {details.workingOn.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Working on</div>
                  <div className="flex flex-wrap gap-1">{details.workingOn.map(d => <span key={d} className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">{d}</span>)}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Settings className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">No details yet</p>
              <p className="text-xs text-muted-foreground">This trader hasn't filled in their details.</p>
            </div>
          )
        )}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-gradient-to-t from-background via-background to-transparent z-50 flex gap-2">
        <button className="flex-[0.5] py-3 rounded-xl bg-muted border border-border flex items-center justify-center">
          <X className="w-[18px] h-[18px] text-muted-foreground" strokeWidth={2} />
        </button>
        <button className="flex-1 py-3 rounded-xl bg-muted border border-border flex items-center justify-center gap-1.5 text-sm font-bold text-foreground">
          <UserPlus className="w-[18px] h-[18px]" strokeWidth={2} /> Follow
        </button>
        <button className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-success flex items-center justify-center gap-1.5 text-sm font-bold text-primary-foreground">
          <Link2 className="w-[18px] h-[18px]" strokeWidth={2} /> Match
        </button>
      </div>
    </div>
  );
};

export default ViewProfile;
