import type { ReactNode } from "react";
import { BookOpen, CalendarDays, MapPin, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

type P = Record<string, any> | null;

const initials = (name?: string | null) => (name || "?").replace("@", "").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

export function ProfileAvatar({ profile, size, onClick }: { profile: P; size: number; onClick?: () => void }) {
  const style = { width: size, height: size };
  const inner = profile?.avatar_url
    ? <img src={profile.avatar_url} alt="Profile photo" style={style} className="rounded-full border-2 border-primary/70 object-cover shadow-[0_0_0_4px_hsl(var(--background))]" />
    : <div style={style} className="flex items-center justify-center rounded-full border-2 border-primary/70 bg-surface-raised text-xl font-black text-foreground shadow-[0_0_0_4px_hsl(var(--background))]">{initials(profile?.full_name || profile?.username)}</div>;
  return onClick ? <button type="button" data-tour="profile-avatar" onClick={onClick} className="block shrink-0">{inner}</button> : <div className="shrink-0">{inner}</div>;
}

interface HeroProps {
  profile: P;
  tradingProfile: P;
  compact?: boolean;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  cta?: ReactNode;
  bioFallback?: ReactNode;
  onAvatarClick?: () => void;
}

export default function ProfileHero({ profile, tradingProfile, compact, topLeft, topRight, cta, bioFallback, onAvatarClick }: HeroProps) {
  const age = profile?.birth_year ? new Date().getFullYear() - profile.birth_year : null;
  const name = String(profile?.full_name || `@${profile?.username || "trader"}`).replace(/\s*[·.]\s*$/, "");
  const location = [profile?.city, profile?.state, profile?.country].filter(Boolean).join(", ") || profile?.location;
  const tradingBits = [tradingProfile?.markets?.[0], tradingProfile?.trading_style?.[0], tradingProfile?.experience_level].filter(Boolean) as string[];
  const tradingLine = tradingBits.length > 0 && (
    <p className="truncate text-[13px] font-semibold text-primary">{tradingBits.map((b, i) => <span key={b}>{i > 0 && <span className="mx-1.5 text-primary/70">·</span>}{b}</span>)}</p>
  );

  if (compact) {
    return (
      <header className="shrink-0 border-b border-surface-line bg-gradient-to-b from-surface-raised/60 to-background">
        <div className="flex items-center justify-between px-4 pt-safe-3">{topLeft ?? <span />}{topRight}</div>
        <div className="flex items-center gap-3.5 px-4 pb-4 pt-2">
          <ProfileAvatar profile={profile} size={80} onClick={onAvatarClick} />
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-bold leading-tight text-foreground">{name}{age ? <span className="font-semibold"> · {age}</span> : ""}</h1>
            <p className="text-[12px] text-muted-foreground">@{profile?.username || "trader"}</p>
            <div className="mt-1">{tradingLine}</div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-background">
      <div className="relative h-[150px] w-full overflow-hidden bg-gradient-to-br from-surface-raised via-surface to-background">
        {profile?.cover_url
          ? <img src={profile.cover_url} alt="" className="h-full w-full object-cover" />
          : <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,hsl(var(--primary)/0.14),transparent_60%)]" />}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/90 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-safe-3">{topLeft ?? <span />}{topRight}</div>
      </div>
      <div className="relative -mt-[52px] px-4">
        <ProfileAvatar profile={profile} size={96} onClick={onAvatarClick} />
        <h1 className="mt-2 truncate text-[22px] font-bold leading-tight text-foreground">{name}{age ? <span className="font-semibold"> · {age}</span> : ""}</h1>
        <p className="text-[12px] text-muted-foreground">@{profile?.username || "trader"}</p>
        {(location || profile?.created_at) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-foreground/80">
            {location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{location}</span>}
            {profile?.created_at && <span className="inline-flex items-center gap-1 text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>}
          </div>
        )}
        {tradingLine && <div className="mt-1.5">{tradingLine}</div>}
        {profile?.bio ? <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[12px] leading-[17px] text-foreground/75">{profile.bio}</p> : bioFallback}
        {profile?.hobbies?.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {profile.hobbies.slice(0, 3).map((t: string) => <span key={t} className="rounded-full border border-surface-line bg-surface px-3 py-1 text-[10px] font-medium text-foreground/85">{t}</span>)}
          </div>
        )}
        {cta && <div className="mt-3">{cta}</div>}
      </div>
    </header>
  );
}

export function ProfileBottomNav({ active, onChange, className }: { active: "details" | "journal"; onChange: (t: "details" | "journal") => void; className?: string }) {
  return (
    <nav aria-label="Profile sections" className={cn("grid shrink-0 grid-cols-2 border-t border-surface-line bg-surface/95 backdrop-blur-xl", className)}>
      {(["details", "journal"] as const).map((tab, i) => {
        const on = active === tab;
        const Icon = tab === "details" ? UserRound : BookOpen;
        return (
          <button key={tab} type="button" onClick={() => onChange(tab)} className={cn("relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors", i === 0 && "border-r border-surface-line", on ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            <Icon className="h-5 w-5" strokeWidth={1.8} />
            {tab === "details" ? "Details" : "Journal"}
            {on && <span className="absolute inset-x-8 bottom-1 h-[3px] rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)]" />}
          </button>
        );
      })}
    </nav>
  );
}
