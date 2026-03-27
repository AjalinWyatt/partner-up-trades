import { useState } from "react";
import { Bell, Settings, Edit, Share2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";

const tradePosts = [
  { bg: "from-[#0f1a24] to-[#1a2a38]", pips: "+38", pos: true },
  { bg: "from-[#2a1f1a] to-[#3a2e24]", label: "Setup life" },
  { bg: "from-[#1a1a2a] to-[#242438]", pips: "-12", pos: false },
  { bg: "from-[#1a241f] to-[#283830]", label: "Morning charts" },
  { bg: "from-[#0f1a24] to-[#1a2a38]", pips: "+52", pos: true },
  { bg: "from-[#241a1e] to-[#382830]", label: "Desk upgrade" },
  { bg: "from-[#1a2024] to-[#28343a]", pips: "+24", pos: true },
  { bg: "from-[#1a1a2a] to-[#242438]", pips: "-8", pos: false },
  { bg: "from-[#2a1f1a] to-[#3a2e24]", label: "Trade review" },
];

const detailsData = {
  watchingFor: ["Order blocks", "Key levels", "Liquidity zones", "Market structure", "BOS / CHOCH"],
  offCharts: ["Gym", "Football", "Travel", "Cars", "Business"],
  tradingDetails: [
    { k: "Style", v: "Day trader" },
    { k: "Strategy", v: "Smart money / ICT" },
    { k: "Timeframe", v: "15m – 1H" },
    { k: "Experience", v: "Consistent & growing" },
    { k: "Goal", v: "Go full-time" },
    { k: "Frequency", v: "Daily" },
    { k: "Session", v: "London" },
    { k: "Reach", v: "Global" },
  ],
  workingOn: ["FOMO entries", "Moving stop loss"],
};

const Profile = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-14">
      {/* Nav */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-extrabold text-foreground">@trishtrades</span>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="url(#vg)" />
            <path d="M6.5 10l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <defs><linearGradient id="vg" x1="0" y1="0" x2="20" y2="20"><stop stopColor="hsl(var(--primary))" /><stop offset="1" stopColor="hsl(var(--success))" /></linearGradient></defs>
          </svg>
        </div>
        <div className="flex gap-2.5">
          <Bell className="w-5 h-5 text-muted-foreground" strokeWidth={1.6} />
          <Settings className="w-5 h-5 text-muted-foreground" strokeWidth={1.6} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-5 px-5 py-1.5">
          <div className="relative">
            <div className="w-[76px] h-[76px] rounded-full bg-gradient-to-br from-primary to-success flex items-center justify-center text-2xl font-black text-primary-foreground">TM</div>
            <div className="absolute -inset-1 rounded-full border-2 border-success/40" />
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-[2.5px] border-background" />
          </div>
          <div className="flex-1 grid grid-cols-3 text-center">
            {[{ n: "3", l: "Partners" }, { n: "2", l: "Groups" }, { n: "128", l: "Followers" }].map(s => (
              <div key={s.l}>
                <div className="text-lg font-black text-foreground">{s.n}</div>
                <div className="text-[11px] text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="px-5 py-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-foreground">Trish M.</span>
            <div className="flex gap-1.5">
              <button className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center"><Edit className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} /></button>
              <button className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center"><Share2 className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} /></button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Day trader · Smart money / ICT · 15m–1H</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            London, UK · London session
          </div>
        </div>

        {/* Market pills */}
        <div className="flex gap-1 px-5 py-1.5">
          <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-primary to-success text-[10px] font-bold text-primary-foreground">Gold</span>
          <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-primary to-success text-[10px] font-bold text-primary-foreground">Forex</span>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-b border-border">
          {["Posts", "Details"].map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={cn(
                "flex-1 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider relative transition-colors",
                activeTab === i ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {tab}
              {activeTab === i && <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-primary to-success" />}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 0 ? (
          <div className="grid grid-cols-3 gap-[2px] p-[2px]">
            {tradePosts.map((p, i) => (
              <div key={i} className={`aspect-square bg-gradient-to-br ${p.bg} relative overflow-hidden`}>
                {p.pips && (
                  <>
                    <div className="absolute bottom-[8%] left-[8%] right-[8%] h-[35%]">
                      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                        <polyline
                          points={p.pos ? "0,35 15,28 30,30 45,12 60,16 75,6 90,10 100,3" : "0,8 20,15 40,12 60,28 80,35 100,32"}
                          fill="none"
                          stroke={p.pos ? "hsl(var(--success))" : "#E45C2D"}
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    <div className={`absolute bottom-1 left-1.5 text-[9px] font-bold px-1 py-0.5 rounded ${p.pos ? "text-success bg-success/15" : "text-orange-500 bg-orange-500/15"}`}>{p.pips}</div>
                  </>
                )}
                {p.label && (
                  <div className="absolute bottom-1.5 left-1.5 text-[8px] font-semibold text-primary-foreground bg-black/40 px-1 py-0.5 rounded">{p.label}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-3 space-y-2">
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Watching for</div>
              <div className="flex flex-wrap gap-1">{detailsData.watchingFor.map(d => <span key={d} className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">{d}</span>)}</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Off the charts</div>
              <div className="flex flex-wrap gap-1">{detailsData.offCharts.map(d => <span key={d} className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">{d}</span>)}</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Trading details</div>
              {detailsData.tradingDetails.map(d => (
                <div key={d.k} className="flex justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-[11px] text-muted-foreground">{d.k}</span>
                  <span className="text-[11px] font-bold text-foreground">{d.v}</span>
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Working on</div>
              <div className="flex flex-wrap gap-1">{detailsData.workingOn.map(d => <span key={d} className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">{d}</span>)}</div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default Profile;
