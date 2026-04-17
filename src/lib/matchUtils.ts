// Traders World — Partner Matching Algorithm (100-point system)

interface TradingProfile {
  markets?: string[] | null;
  sessions?: string[] | null;
  strategies?: string[] | null;
  trading_style?: string[] | null;
  timeframes?: string[] | null;
  experience_level?: string | null;
  primary_goal?: string[] | null;
  struggles?: string[] | null;
  looking_for_gender?: string | null;
  connection_types?: string[] | null;
  instruments?: string[] | null;
}

interface ProfileData {
  gender?: string | null;
  hobbies?: string[] | null;
}

export interface MatchResult {
  pct: number;
  reasons: string[];
  breakdown: Record<string, number>;
  excluded: boolean;
  excludeReason?: string;
}

const WEIGHTS = { market: 28, strategy: 19, experience: 17, style: 11, goals: 9, hobbies: 6, struggleComplement: 5, session: 5 };

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0;
}

function overlap(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter(v => setB.has(v));
}

const EXP_ORDER: Record<string, number> = {
  "Beginner": 1, "beginner": 1, "Just getting started": 1,
  "Intermediate": 2, "intermediate": 2, "Building my edge": 2,
  "Advanced": 3, "advanced": 3, "Consistent & growing": 3,
  "Professional": 4, "professional": 4, "Profitable trader": 4,
};

const STYLE_ORDER: Record<string, number> = {
  "Scalper": 1, "scalper": 1, "Scalping": 1,
  "Day Trader": 2, "Day trader": 2, "day trader": 2, "Day Trading": 2,
  "Swing Trader": 3, "Swing trader": 3, "swing trader": 3, "Swing Trading": 3,
  "Position Trader": 4, "Position trader": 4, "position trader": 4, "Position Trading": 4,
};

const RELATED_GOALS: Record<string, string[]> = {
  "Get Funded": ["Pass Prop Challenge", "Scale Funded Account", "Trade Full-Time"],
  "Pass Prop Challenge": ["Get Funded", "Scale Funded Account", "Build Consistency"],
  "Scale Funded Account": ["Get Funded", "Pass Prop Challenge", "Trade Full-Time"],
  "Trade Full-Time": ["Get Funded", "Scale Funded Account", "Build Consistency"],
  "Build Consistency": ["Trade Full-Time", "Pass Prop Challenge", "Master a Concept"],
  "Learn Basics": ["Build Consistency", "Master a Concept"],
  "Master a Concept": ["Build Consistency", "Learn Basics"],
  // Map onboarding goal labels to related goals
  "Learn the basics": ["Get consistently profitable", "Build Consistency"],
  "Get consistently profitable": ["Learn the basics", "Pass a prop challenge", "Go full-time"],
  "Pass a prop challenge": ["Get consistently profitable", "Scale funded accounts", "Go full-time"],
  "Scale funded accounts": ["Pass a prop challenge", "Go full-time"],
  "Go full-time": ["Get consistently profitable", "Scale funded accounts", "Pass a prop challenge"],
};

export function computeMatch(
  myTrading: TradingProfile | null,
  theirTrading: TradingProfile | null,
  myProfile?: ProfileData | null,
  theirProfile?: ProfileData | null,
  existingConnection?: boolean
): MatchResult {
  if (!myTrading || !theirTrading) return { pct: 0, reasons: [], breakdown: {}, excluded: true, excludeReason: "Missing profile data" };

  const reasons: string[] = [];
  const breakdown: Record<string, number> = {};

  const myMarkets = myTrading.markets || [];
  const theirMarkets = theirTrading.markets || [];
  const marketOverlap = overlap(myMarkets, theirMarkets);

  if (marketOverlap.length === 0) return { pct: 0, reasons: [], breakdown: {}, excluded: true, excludeReason: "No market overlap" };

  const myPref = myTrading.looking_for_gender;
  const theirGender = theirProfile?.gender;
  const prefNorm = (myPref || "").toLowerCase().replace(/[-\s]/g, "");
  const isOpenPref = !myPref || prefNorm === "nopreference" || prefNorm === "coed" || prefNorm === "any";
  if (!isOpenPref && theirGender && myPref!.toLowerCase().replace(/s$/, '') !== theirGender.toLowerCase()) {
    return { pct: 0, reasons: [], breakdown: {}, excluded: true, excludeReason: "Gender preference mismatch" };
  }

  if (existingConnection) return { pct: 0, reasons: [], breakdown: {}, excluded: true, excludeReason: "Already connected" };

  let totalScore = 0;

  // Market (28pts)
  const mj = jaccard(myMarkets, theirMarkets);
  const ms = mj >= 1 ? 28 : mj >= 0.67 ? 22 : mj >= 0.34 ? 15 : 8;
  totalScore += ms;
  breakdown["Market"] = Math.round((ms / 28) * 100);
  if (marketOverlap.length > 0) reasons.push(`Both trade ${marketOverlap.slice(0, 2).join(" & ")}`);

  // Strategy (19pts)
  const myStrats = myTrading.strategies || [];
  const theirStrats = theirTrading.strategies || [];
  const sj = jaccard(myStrats, theirStrats);
  const ss = sj >= 1 ? 19 : sj >= 0.5 ? 14 : sj > 0 ? 7 : 0;
  totalScore += ss;
  breakdown["Strategy"] = Math.round((ss / 19) * 100);
  const so = overlap(myStrats, theirStrats);
  if (so.length > 0) reasons.push(`${so[0]} strategy`);

  // Experience (17pts)
  const myE = EXP_ORDER[myTrading.experience_level || ""] || 0;
  const theirE = EXP_ORDER[theirTrading.experience_level || ""] || 0;
  let es = 0;
  if (myE > 0 && theirE > 0) {
    const d = Math.abs(myE - theirE);
    es = d === 0 ? 17 : d === 1 ? 11 : d === 2 ? 4 : 0;
  }
  totalScore += es;
  breakdown["Experience"] = Math.round((es / 17) * 100);
  if (es >= 11) reasons.push("Same experience level");

  // Style (11pts)
  const myStyles = myTrading.trading_style || [];
  const theirStyles = theirTrading.trading_style || [];
  let stScore = 0;
  if (myStyles.length > 0 && theirStyles.length > 0) {
    const mv = STYLE_ORDER[myStyles[0]] || 0;
    const tv = STYLE_ORDER[theirStyles[0]] || 0;
    if (mv > 0 && tv > 0) {
      const d = Math.abs(mv - tv);
      stScore = d === 0 ? 11 : d === 1 ? 7 : d === 2 ? 3 : 0;
    }
  }
  totalScore += stScore;
  breakdown["Style"] = Math.round((stScore / 11) * 100);
  const stO = overlap(myStyles, theirStyles);
  if (stO.length > 0) reasons.push(`${stO[0]} style`);

  // Goals (9pts)
  const myG = myTrading.primary_goal || [];
  const theirG = theirTrading.primary_goal || [];
  const gO = overlap(myG, theirG);
  let gs = 0;
  if (gO.length > 0) {
    gs = 9;
  } else {
    let rel = false;
    for (const mg of myG) {
      for (const tg of theirG) {
        if ((RELATED_GOALS[mg] || []).includes(tg)) { rel = true; break; }
      }
      if (rel) break;
    }
    gs = rel ? 5 : 1;
  }
  totalScore += gs;
  breakdown["Goal"] = Math.round((gs / 9) * 100);
  if (gs === 9 && gO.length > 0) reasons.push(`Same goal: ${gO[0]}`);

  // Hobbies (6pts)
  const myH = myProfile?.hobbies || [];
  const theirH = theirProfile?.hobbies || [];
  let hs: number;
  if (myH.length === 0 || theirH.length === 0) hs = 3;
  else {
    const ho = overlap(myH, theirH);
    hs = ho.length >= 3 ? 6 : ho.length === 2 ? 4 : ho.length === 1 ? 2 : 0;
  }
  totalScore += hs;
  breakdown["Hobbies"] = Math.round((hs / 6) * 100);

  // Struggle Complement (5pts)
  const myStr = myTrading.struggles || [];
  const theirStr = theirTrading.struggles || [];
  let strScore: number;
  if (myStr.length === 0 || theirStr.length === 0) strScore = 2;
  else {
    const shared = overlap(myStr, theirStr);
    const unique = theirStr.filter(s => !myStr.includes(s));
    strScore = unique.length >= 2 && shared.length >= 1 ? 5 : shared.length >= 2 ? 3 : shared.length === 1 ? 1 : 2;
  }
  totalScore += strScore;
  breakdown["Struggles"] = Math.round((strScore / 5) * 100);

  // Session (5pts)
  const mySess = myTrading.sessions || [];
  const theirSess = theirTrading.sessions || [];
  const sessO = overlap(mySess, theirSess);
  const sessS = sessO.length > 0 ? 5 : 0;
  totalScore += sessS;
  breakdown["Session"] = Math.round((sessS / 5) * 100);
  if (sessO.length > 0) reasons.push(`${sessO[0]} session`);

  const pct = Math.round(totalScore);
  if (pct < 50) return { pct, reasons, breakdown, excluded: true, excludeReason: `Score ${pct}% below 50% minimum` };
  return { pct, reasons, breakdown, excluded: false };
}

export function getBreakdownLabel(key: string, rawScore: number, myTrading?: any, theirTrading?: any): string {
  const ov = (a: string[], b: string[]) => a.filter(v => b.includes(v));

  if (key === "Market") {
    if (!myTrading || !theirTrading) return rawScore >= 80 ? "Strong overlap" : rawScore >= 50 ? "Partial overlap" : "Weak overlap";
    const mo = ov(myTrading.markets || [], theirTrading.markets || []);
    if (rawScore >= 80) return `Both trade ${mo.slice(0, 2).join(" & ")}`;
    if (rawScore >= 50) return `Share ${mo.length} market${mo.length > 1 ? "s" : ""}`;
    return "Minimal overlap";
  }
  if (key === "Session") {
    if (!myTrading || !theirTrading) return rawScore >= 80 ? "Same sessions" : "Different sessions";
    const so = ov(myTrading.sessions || [], theirTrading.sessions || []);
    return so.length > 0 ? `${so[0]} session` : "Different sessions";
  }
  if (key === "Strategy") {
    if (!myTrading || !theirTrading) return rawScore >= 80 ? "Same strategy" : rawScore >= 50 ? "Some overlap" : "No overlap";
    const sto = ov(myTrading.strategies || [], theirTrading.strategies || []);
    if (rawScore >= 80) return sto.length > 0 ? sto[0] : "Same strategy";
    if (rawScore >= 50) return "Some overlap";
    return "No overlap";
  }
  if (key === "Style") return rawScore >= 80 ? "Same style" : rawScore >= 50 ? "Adjacent style" : "Different styles";
  if (key === "Experience") return rawScore >= 80 ? "Same level" : rawScore >= 50 ? "Close level" : "Far apart";
  if (key === "Goal") return rawScore >= 80 ? "Same goal" : rawScore >= 50 ? "Related goals" : "Different goals";
  if (key === "Hobbies") return rawScore >= 80 ? "Shared interests" : rawScore >= 50 ? "Some shared" : "Different interests";
  if (key === "Struggles") return rawScore >= 80 ? "Great complement" : rawScore >= 50 ? "Can relate" : "Different struggles";
  return rawScore >= 80 ? "Strong" : rawScore >= 50 ? "Partial" : "Low";
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
