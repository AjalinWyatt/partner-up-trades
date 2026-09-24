import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BellOff, Bell, Flag, ShieldOff, Ban, CheckCircle2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const REPORT_REASONS = ["Spam or scam", "Harassment or bullying", "Inappropriate content", "Fake profile", "Selling signals / promotions", "Other"];

export function useIsMuted(targetId?: string | null) {
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    if (!targetId) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("muted_users").select("id").eq("muter_id", session.user.id).eq("muted_id", targetId).maybeSingle();
      setMuted(!!data);
    })();
  }, [targetId]);
  return [muted, setMuted] as const;
}

type Props = {
  targetId: string;
  username?: string | null;
  context: "profile" | "chat";
  trigger: ReactNode;
  isBlocked?: boolean;
  onBlockedChange?: (blocked: boolean) => void;
  extraItems?: ReactNode;
};

export default function SafetyMenu({ targetId, username, context, trigger, isBlocked = false, onBlockedChange, extraItems }: Props) {
  const handle = username ? `@${username}` : "this trader";
  const [muted, setMuted] = useIsMuted(targetId);
  const [dialog, setDialog] = useState<null | "block" | "unblock" | "mute" | "report" | "reported">(null);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const me = async () => (await supabase.auth.getSession()).data.session?.user.id;

  const doMute = async () => {
    const uid = await me(); if (!uid) return;
    setBusy(true);
    if (muted) {
      const { error } = await supabase.from("muted_users").delete().eq("muter_id", uid).eq("muted_id", targetId);
      if (error) toast.error("Couldn't unmute"); else { setMuted(false); toast.success(`${handle} unmuted`); }
    } else {
      const { error } = await supabase.from("muted_users").insert({ muter_id: uid, muted_id: targetId });
      if (error) toast.error("Couldn't mute"); else { setMuted(true); toast.success(`${handle} muted`, { description: "You won't get notifications from them." }); }
    }
    setBusy(false); setDialog(null);
  };

  const doBlock = async (block: boolean) => {
    const uid = await me(); if (!uid) return;
    setBusy(true);
    if (block) {
      const { error } = await supabase.from("blocked_users").insert({ blocker_id: uid, blocked_id: targetId });
      if (error) { toast.error("Couldn't block"); setBusy(false); return; }
      await supabase.from("partner_connections").delete()
        .or(`and(requester_id.eq.${uid},receiver_id.eq.${targetId}),and(requester_id.eq.${targetId},receiver_id.eq.${uid})`);
      toast.success(`${handle} blocked`);
    } else {
      await supabase.from("blocked_users").delete().eq("blocker_id", uid).eq("blocked_id", targetId);
      toast.success(`${handle} unblocked`);
    }
    onBlockedChange?.(block);
    setBusy(false); setDialog(null);
  };

  const submitReport = async () => {
    const uid = await me(); if (!uid || !reason) return;
    setBusy(true);
    const { error } = await supabase.from("user_reports").insert({
      reporter_id: uid, reported_id: targetId, context, reason, details: details.trim().slice(0, 1000) || null,
    });
    setBusy(false);
    if (error) { toast.error("Couldn't send report"); return; }
    setReason(""); setDetails(""); setDialog("reported");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          {extraItems}
          {extraItems && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={() => (muted ? doMute() : setDialog("mute"))}>
            {muted ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}{muted ? "Unmute" : "Mute"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("report")}>
            <Flag className="mr-2 h-4 w-4" />Report
          </DropdownMenuItem>
          <DropdownMenuItem className={cn(!isBlocked && "text-destructive focus:text-destructive")} onSelect={() => setDialog(isBlocked ? "unblock" : "block")}>
            {isBlocked ? <ShieldOff className="mr-2 h-4 w-4" /> : <Ban className="mr-2 h-4 w-4" />}{isBlocked ? "Unblock" : "Block"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={dialog === "mute"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Mute {handle}?</AlertDialogTitle>
            <AlertDialogDescription>You'll stop getting notifications from them. They won't be told, and you can still message each other.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); doMute(); }}>Mute</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === "block" || dialog === "unblock"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog === "block" ? `Block ${handle}?` : `Unblock ${handle}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialog === "block"
                ? "They won't be able to see your profile, find you in Discover, or message you. Any partnership will end. They won't be notified."
                : "They'll be able to find you and send a request again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} className={cn(dialog === "block" && "bg-destructive text-destructive-foreground hover:bg-destructive/90")} onClick={(e) => { e.preventDefault(); doBlock(dialog === "block"); }}>
              {dialog === "block" ? "Block" : "Unblock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={dialog === "report"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Report {handle}</DialogTitle>
            <DialogDescription>Reports are private. Our team reviews every one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            {REPORT_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)}
                className={cn("flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  reason === r ? "border-primary/60 bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
                {r}{reason === r && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
          <Textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} placeholder="Add details (optional)" className="min-h-[70px] text-sm" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDialog(null)}>Cancel</Button>
            <Button size="sm" disabled={!reason || busy} onClick={submitReport}>Send report</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={dialog === "reported"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" />Report sent</AlertDialogTitle>
            <AlertDialogDescription>Thanks for keeping TradersWorld safe. {isBlocked ? "" : `Want to block ${handle} too?`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Done</AlertDialogCancel>
            {!isBlocked && <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(e) => { e.preventDefault(); doBlock(true); }}>Block</AlertDialogAction>}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
