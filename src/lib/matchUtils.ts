export function computeMatch(
  myTrading: any,
  theirTrading: any
): { pct: number; reasons: string[]; breakdown: Record<string, number> } {
  if (!myTrading || !theirTrading) return { pct: 0, reasons: [], breakdown: {} };
  const reasons: string[] = [];
  const breakdown: Record<string, number> = {};
  let score = 0;
  let total = 0;

  const overlap = (a: string[], b: string[]) => a.filter((v) => b.includes(v));

  // Markets (weight 3)
  total += 3;
  const mOverlap = overlap(myTrading.markets || [], theirTrading.markets || []);
  const marketScore = mOverlap.length > 0 ? 3 * (mOverlap.length / Math.max((myTrading.markets || []).length, 1)) : 0;
  score += marketScore;
  breakdown["Market"] = Math.round((marketScore / 3) * 100);
  if (mOverlap.length > 0) reasons.push(`Both trade ${mOverlap.slice(0, 2).join(", ")}`);

  // Session (weight 2)
  total += 2;
  const sessOverlap = overlap(myTrading.sessions || [], theirTrading.sessions || []);
  const sessScore = sessOverlap.length > 0 ? 2 : 0;
  score += sessScore;
  breakdown["Session"] = Math.round((sessScore / 2) * 100);

  // Strategy (weight 2)
  total += 2;
  const stratOverlap = overlap(myTrading.strategies || [], theirTrading.strategies || []);
  const stratScore = stratOverlap.length > 0 ? 2 * (stratOverlap.length / Math.max((myTrading.strategies || []).length, 1)) : 0;
  score += stratScore;
  breakdown["Strategy"] = Math.round((stratScore / 2) * 100);

  // Style (weight 2)
  total += 2;
  const sOverlap = overlap(myTrading.trading_style || [], theirTrading.trading_style || []);
  const styleScore = sOverlap.length > 0 ? 2 : 0;
  score += styleScore;
  breakdown["Style"] = Math.round((styleScore / 2) * 100);
  if (sOverlap.length > 0) reasons.push(`${sOverlap[0]} style`);

  // Timeframe (weight 1)
  total += 1;
  const tfOverlap = overlap(myTrading.timeframes || [], theirTrading.timeframes || []);
  const tfScore = tfOverlap.length > 0 ? 1 : 0;
  score += tfScore;
  breakdown["Timeframe"] = Math.round((tfScore / 1) * 100);

  // Experience (weight 1)
  total += 1;
  const expScore = myTrading.experience_level && myTrading.experience_level === theirTrading.experience_level ? 1 : 0;
  score += expScore;
  breakdown["Experience"] = Math.round((expScore / 1) * 100);
  if (expScore > 0) reasons.push("Same experience level");

  // Goal (weight 1)
  total += 1;
  const goalOverlap = overlap(myTrading.primary_goal || [], theirTrading.primary_goal || []);
  const goalScore = goalOverlap.length > 0 ? 1 : 0;
  score += goalScore;
  breakdown["Goal"] = Math.round((goalScore / 1) * 100);

  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  return { pct, reasons, breakdown };
}

/** Convert raw breakdown scores into human-readable labels */
export function getBreakdownLabel(
  key: string,
  rawScore: number,
  myTrading?: any,
  theirTrading?: any
): string {
  const overlap = (a: string[], b: string[]) => a.filter((v) => b.includes(v));

  if (key === "Market") {
    if (!myTrading || !theirTrading) return rawScore >= 80 ? "Same markets" : rawScore >= 50 ? "Partial overlap" : "Different markets";
    const mo = overlap(myTrading.markets || [], theirTrading.markets || []);
    if (rawScore >= 80) return `Both trade ${mo.slice(0, 2).join(" & ")}`;
    if (rawScore >= 50) return "Partial overlap";
    return "Different markets";
  }
  if (key === "Session") {
    if (!myTrading || !theirTrading) return rawScore >= 80 ? "Same sessions" : "Different sessions";
    const so = overlap(myTrading.sessions || [], theirTrading.sessions || []);
    if (so.length > 0) return `${so[0]} · same`;
    return "Different sessions";
  }
  if (key === "Strategy") {
    if (!myTrading || !theirTrading) return rawScore >= 80 ? "Same strategy" : rawScore >= 50 ? "Some overlap" : "No overlap";
    const sto = overlap(myTrading.strategies || [], theirTrading.strategies || []);
    if (rawScore >= 80) return `${sto[0]} · same`;
    if (rawScore >= 50) return "Some overlap";
    return "No overlap";
  }
  if (key === "Style") {
    if (!myTrading || !theirTrading) return rawScore >= 80 ? "Same style" : rawScore >= 50 ? "Adjacent styles" : "Different styles";
    const slo = overlap(myTrading.trading_style || [], theirTrading.trading_style || []);
    if (slo.length > 0) return `${slo[0]} · same`;
    return "Different styles";
  }
  if (key === "Experience") {
    if (rawScore >= 80) return "Same level";
    if (rawScore >= 50) return "Close level";
    return "Far apart";
  }
  if (key === "Goal") {
    if (rawScore >= 80) return "Same goal";
    if (rawScore >= 50) return "Related goals";
    return "Different goals";
  }
  if (key === "Timeframe") {
    if (rawScore >= 80) return "Same timeframe";
    if (rawScore >= 50) return "Close timeframes";
    return "Different timeframes";
  }
  return rawScore >= 80 ? "Strong match" : rawScore >= 50 ? "Partial match" : "Low match";
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
