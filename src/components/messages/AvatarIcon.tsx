import { cn } from "@/lib/utils";
import type { Connection } from "./types";
import { getGradient, getInitials } from "./utils";

interface AvatarIconProps {
  conn: Connection;
  size?: "sm" | "md" | "lg";
}

export default function AvatarIcon({ conn, size = "md" }: AvatarIconProps) {
  const sizeClasses = size === "sm" ? "w-9 h-9 text-[11px]" : size === "lg" ? "w-14 h-14 text-base" : "w-11 h-11 text-xs";
  if (conn.avatarUrl) {
    return <img src={conn.avatarUrl} alt={conn.partnerName} className={cn("rounded-full object-cover shrink-0", sizeClasses)} />;
  }
  return (
    <div className={cn("rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-white shrink-0", sizeClasses, getGradient(conn.partnerId))}>
      {getInitials(conn.partnerName)}
    </div>
  );
}
