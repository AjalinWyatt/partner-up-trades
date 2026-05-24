import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Lock, Check, X, Crown, Sparkles } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FREE_PARTNER_LIMIT,
  PRO_PARTNER_LIMIT,
  PRO_PRICE_USD,
  isProMember,
  setProMember,
} from "@/lib/partnerLimits";
import { getInitials, timeAgo } from "@/lib/matchUtils";

interface PendingRow {
  id: string;
  requester_id: string;
  created_at: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

const WaitingList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [pro, setPro] = useState(false);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [rows, setRows] = useState<PendingRow[]>([]);

  const cap = pro ? PRO_PARTNER_LIMIT : FREE_PARTNER_LIMIT;
  const slotsLeft = Math.max(0, cap - acceptedCount);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { navigate("/sign-in"); return; }
    setMe(user.id);
    setPro(await isProMember(user.id));

    const [{ count: accCount }, { data: pendingData }] = await Promise.all([
      supabase.from("partner_connections").select("*", { count: "exact", head: true })
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`).eq("status", "accepted"),
      supabase.from("partner_connections").select("id, requester_id, created_at")
        .eq("receiver_id", user.id).eq("status", "pending")
        .order("created_at", { ascending: true }),
    ]);
    setAcceptedCount(accCount || 0);

    const ids = (pendingData || []).map(p => p.requester_id);
    let profMap = new Map<string, any>();
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles")
        .select("id, username, full_name, avatar_url").in("id", ids);
      profMap = new Map((profs || []).map(p => [p.id, p]));
    }
    setRows((pendingData || []).map(p => {
      const pr = profMap.get(p.requester_id);
      return {
        id: p.id,
        requester_id: p.requester_id,
        created_at: p.created_at,
        username: pr?.username || null,
        full_name: pr?.full_name || null,
        avatar_url: pr?.avatar_url || null,
      };
    }));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const accept = async (row: PendingRow, locked: boolean) => {
    if (locked) {
      toast.error("Upgrade to Pro to unlock this request.");
      return;
    }
    const { error } = await supabase.from("partner_connections")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) { toast.error("Could not accept"); return; }
    toast.success("Partner accepted!");
    load();
  };

  const decline = async (row: PendingRow) => {
    const { error } = await supabase.from("partner_connections").delete().eq("id", row.id);
    if (error) { toast.error("Could not decline"); return; }
    toast.success("Request removed");
    load();
  };

  const upgrade = () => {
    if (!me) return;
    // Demo upgrade - no real payment provider wired yet.
    setProMember(me, true);
    setPro(true);
    toast.success("You're Pro! Cap raised to 12 partners.");
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  // Free tier: only the first `slotsLeft` pending requests are acceptable.
  // The rest sit in the locked waiting list.
  // Pro tier: all are unlocked up to PRO_PARTNER_LIMIT.
  const unlockedCount = Math.min(rows.length, slotsLeft);
  const lockedRows = rows.slice(unlockedCount);

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 pb-3 pt-safe-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foreground" aria-label="Back">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-[18px] font-black leading-tight">Waiting List</h1>
            <p className="text-[11px] text-muted-foreground">
              {acceptedCount}/{cap} partners · {rows.length} pending
            </p>
          </div>
          {pro && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 text-accent px-2 py-1 text-[10px] font-bold">
              <Crown className="w-3 h-3" /> PRO
            </span>
          )}
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* Pro CTA */}
          {!pro && rows.length > slotsLeft && (
            <div className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/15 to-primary/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 className="text-[16px] font-black text-foreground">Pro tier coming soon</h2>
              </div>
              <p className="text-[13px] text-muted-foreground">
                Free traders can keep up to <b className="text-foreground">{FREE_PARTNER_LIMIT} partners</b>.
                Pro will raise this cap to <b className="text-foreground">{PRO_PARTNER_LIMIT} partners</b> for{" "}
                <b className="text-foreground">${PRO_PRICE_USD}/mo</b>. We'll notify you when it launches.
              </p>
            </div>
          )}

          {rows.length === 0 ? (
            <div className="bg-card/40 border border-border rounded-2xl p-8 text-center">
              <Lock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-[13px] text-muted-foreground">No one is waiting right now.</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                When you hit {cap} partners, new requests land here.
              </p>
            </div>
          ) : (
            <>
              {/* Unlocked (acceptable) */}
              {unlockedCount > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold mb-2 px-1">
                    Open slots ({slotsLeft - (slotsLeft - unlockedCount)} of {slotsLeft})
                  </p>
                  <div className="space-y-2">
                    {rows.slice(0, unlockedCount).map(r => (
                      <RequestRow key={r.id} row={r} locked={false} onAccept={() => accept(r, false)} onDecline={() => decline(r)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Locked */}
              {lockedRows.length > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold mb-2 px-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked - Pro only ({lockedRows.length})
                  </p>
                  <div className="space-y-2">
                    {lockedRows.map(r => (
                      <RequestRow key={r.id} row={r} locked={!pro} onAccept={() => accept(r, !pro)} onDecline={() => decline(r)} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

const RequestRow = ({
  row, locked, onAccept, onDecline,
}: { row: PendingRow; locked: boolean; onAccept: () => void; onDecline: () => void }) => {
  const name = row.full_name || row.username || "Trader";
  return (
    <div className={`relative flex items-center gap-3 rounded-2xl border border-border bg-card p-3 ${locked ? "overflow-hidden" : ""}`}>
      <div className={`w-11 h-11 rounded-full overflow-hidden bg-secondary shrink-0 flex items-center justify-center ${locked ? "blur-sm" : ""}`}>
        {row.avatar_url ? (
          <img src={row.avatar_url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[13px] font-bold text-foreground">{getInitials(name)}</span>
        )}
      </div>
      <div className={`flex-1 min-w-0 ${locked ? "blur-[3px] select-none" : ""}`}>
        <p className="text-[14px] font-bold text-foreground truncate">{name}</p>
        <p className="text-[11px] text-muted-foreground">{timeAgo(row.created_at)}</p>
      </div>
      {locked ? (
        <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground rounded-full border border-border px-2.5 py-1">
          <Lock className="w-3 h-3" /> Locked
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={onDecline}
            className="w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive/60 flex items-center justify-center transition-colors"
            aria-label="Decline"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={onAccept}
            className="w-9 h-9 rounded-full bg-accent text-accent-foreground hover:opacity-90 flex items-center justify-center transition-opacity"
            aria-label="Accept"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default WaitingList;