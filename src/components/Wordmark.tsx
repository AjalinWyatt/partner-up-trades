import { cn } from "@/lib/utils";

interface WordmarkProps {
  className?: string;
  /** Tailwind text size class. Defaults to text-xl. */
  size?: string;
}

/**
 * Brand wordmark — always renders "TradersWorld" as bold white text.
 * Replaces the legacy logo PNGs so the branding is consistent everywhere.
 */
export default function Wordmark({ className, size = "text-xl" }: WordmarkProps) {
  return (
    <span
      className={cn(
        "font-bold tracking-tight text-white leading-none whitespace-nowrap select-none",
        size,
        className
      )}
    >
      TradersWorld
    </span>
  );
}