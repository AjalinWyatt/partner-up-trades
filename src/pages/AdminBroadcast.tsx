import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Megaphone, Users, Send } from "lucide-react";

const MARKETS = ["Forex", "Futures", "Options", "Crypto", "Stocks"];
const GOALS = [
  "Learn the basics",
  "Get consistently profitable",
  "Pass a prop challenge",
  "Scale funded accounts",
  "Go full-time",
];
const EXPERIENCE = ["Beginner", "Intermediate", "Advanced", "Expert"];
const ACCOUNT_TYPES = ["Demo", "Live", "Funded"];

type Filters = {
  markets: string[];
  primary_goals: string[];
  experience_levels: string[];
  account_types: string[];
  has_logged_trades: boolean;
  partners_status: "any" | "zero" | "has_partners";
  onboarding_completed?: boolean;
};

const emptyFilters: Filters = {
  markets: [],
  primary_goals: [],
  experience_levels: [],
  account_types: [],
  has_logged_trades: false,
  partners_status: "any",
  onboarding_completed: undefined,
};

function toggle<T>(list: T[], v: T) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function AdminBroadcast() {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");
  const [broadcastKey, setBroadcastKey] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setChecking(false), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!checking && !isAdmin) navigate("/");
  }, [checking, isAdmin, navigate]);

  const filtersForApi = useMemo(() => {
    const f: any = { partners_status: filters.partners_status };
    if (filters.markets.length) f.markets = filters.markets;
    if (filters.primary_goals.length) f.primary_goals = filters.primary_goals;
    if (filters.experience_levels.length) f.experience_levels = filters.experience_levels;
    if (filters.account_types.length) f.account_types = filters.account_types;
    if (filters.has_logged_trades) f.has_logged_trades = true;
    if (filters.onboarding_completed !== undefined) f.onboarding_completed = filters.onboarding_completed;
    return f;
  }, [filters]);

  const previewAudience = async () => {
    setLoadingCount(true);
    setAudienceCount(null);
    const { data, error } = await supabase.functions.invoke("admin-broadcast-dm", {
      body: { dryRun: true, filters: filtersForApi },
    });
    setLoadingCount(false);
    if (error) {
      toast.error("Failed to preview audience");
      return;
    }
    setAudienceCount((data as any)?.count ?? 0);
  };

  const send = async () => {
    if (!message.trim()) {
      toast.error("Message is required");
      return;
    }
    if (!broadcastKey.trim()) {
      toast.error("Add a broadcast key (used to prevent duplicate sends)");
      return;
    }
    if (audienceCount === null) {
      toast.error("Preview the audience first");
      return;
    }
    if (!confirm(`Send this DM to ${audienceCount} user(s)? This cannot be undone.`)) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-broadcast-dm", {
      body: {
        message: message.trim(),
        broadcastKey: broadcastKey.trim(),
        filters: filtersForApi,
      },
    });
    setSending(false);
    if (error) {
      toast.error("Send failed");
      return;
    }
    const r = data as any;
    toast.success(`Sent to ${r.sent} user(s) (skipped ${r.skippedAlreadySent} already-sent)`);
    setMessage("");
    setBroadcastKey("");
    setAudienceCount(null);
  };

  if (checking || !isAdmin) {
    return <div className="p-8 text-muted-foreground">Checking access…</div>;
  }

  return (
    <div className="container mx-auto max-w-3xl p-4 md:p-8 space-y-6">
      <header className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">TradersWorld Broadcast</h1>
          <p className="text-sm text-muted-foreground">
            Send a DM from the official system account to a filtered audience.
          </p>
        </div>
      </header>

      <Card className="p-5 space-y-4">
        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write the announcement…"
            rows={6}
          />
          <p className="text-xs text-muted-foreground">{message.length} / 4000</p>
        </div>
        <div className="space-y-2">
          <Label>Broadcast key</Label>
          <Input
            value={broadcastKey}
            onChange={(e) => setBroadcastKey(e.target.value)}
            placeholder="e.g. q1-launch-promo (unique per send)"
          />
          <p className="text-xs text-muted-foreground">
            Prevents the same broadcast from being delivered twice to the same user.
          </p>
        </div>
      </Card>

      <Card className="p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <h2 className="font-semibold">Audience filters</h2>
        </div>

        <FilterGroup
          label="Markets (any of)"
          options={MARKETS}
          selected={filters.markets}
          onToggle={(v) => setFilters({ ...filters, markets: toggle(filters.markets, v) })}
        />
        <FilterGroup
          label="Primary goal (any of)"
          options={GOALS}
          selected={filters.primary_goals}
          onToggle={(v) => setFilters({ ...filters, primary_goals: toggle(filters.primary_goals, v) })}
        />
        <FilterGroup
          label="Experience"
          options={EXPERIENCE}
          selected={filters.experience_levels}
          onToggle={(v) => setFilters({ ...filters, experience_levels: toggle(filters.experience_levels, v) })}
        />
        <FilterGroup
          label="Logged account type (from Trading Log)"
          options={ACCOUNT_TYPES}
          selected={filters.account_types}
          onToggle={(v) => setFilters({ ...filters, account_types: toggle(filters.account_types, v) })}
        />

        <div className="flex items-center gap-2">
          <Checkbox
            id="logged"
            checked={filters.has_logged_trades}
            onCheckedChange={(c) => setFilters({ ...filters, has_logged_trades: !!c })}
          />
          <Label htmlFor="logged" className="cursor-pointer">
            Has logged at least one trade
          </Label>
        </div>

        <div className="space-y-2">
          <Label>Partners</Label>
          <Select
            value={filters.partners_status}
            onValueChange={(v) => setFilters({ ...filters, partners_status: v as any })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="zero">No partners yet</SelectItem>
              <SelectItem value="has_partners">Has at least one partner</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Onboarding</Label>
          <Select
            value={
              filters.onboarding_completed === undefined
                ? "any"
                : filters.onboarding_completed ? "completed" : "incomplete"
            }
            onValueChange={(v) =>
              setFilters({
                ...filters,
                onboarding_completed: v === "any" ? undefined : v === "completed",
              })
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="completed">Completed onboarding</SelectItem>
              <SelectItem value="incomplete">Has not finished onboarding</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={previewAudience} disabled={loadingCount}>
            {loadingCount ? "Counting…" : "Preview audience"}
          </Button>
          {audienceCount !== null && (
            <Badge variant="secondary" className="text-base">
              {audienceCount} recipient{audienceCount === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
        <Button onClick={send} disabled={sending || audienceCount === null || audienceCount === 0}>
          <Send className="h-4 w-4 mr-2" />
          {sending ? "Sending…" : "Send broadcast"}
        </Button>
      </Card>
    </div>
  );
}

function FilterGroup({
  label, options, selected, onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}