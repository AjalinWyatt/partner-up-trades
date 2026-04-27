import { useLocation } from "react-router-dom";

/** Lightweight building blocks — all themed via design tokens. */
const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`bg-secondary/60 rounded-md animate-pulse ${className}`} />
);

const Circle = ({ className = "" }: { className?: string }) => (
  <div className={`bg-secondary/60 rounded-full animate-pulse ${className}`} />
);

const FeedSkeleton = () => (
  <div className="mx-auto w-full max-w-[600px] px-4 py-4 space-y-6">
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <Circle key={i} className="h-16 w-16 shrink-0" />
      ))}
    </div>
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="space-y-3">
        <div className="flex items-center gap-3">
          <Circle className="h-9 w-9" />
          <Bar className="h-3 w-32" />
        </div>
        <Bar className="h-[360px] w-full rounded-xl" />
        <Bar className="h-3 w-3/4" />
      </div>
    ))}
  </div>
);

const MessagesSkeleton = () => (
  <div className="mx-auto w-full max-w-[600px] px-4 py-4 space-y-3">
    <Bar className="h-9 w-full" />
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 py-2">
        <Circle className="h-12 w-12 shrink-0" />
        <div className="flex-1 space-y-2">
          <Bar className="h-3 w-1/3" />
          <Bar className="h-3 w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

const DashboardSkeleton = () => (
  <div className="mx-auto w-full max-w-[680px] px-4 py-4 space-y-4">
    <div className="flex items-center gap-3">
      <Circle className="h-12 w-12" />
      <div className="space-y-2 flex-1">
        <Bar className="h-3 w-32" />
        <Bar className="h-3 w-48" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Bar key={i} className="h-24 rounded-xl" />
      ))}
    </div>
    <Bar className="h-48 rounded-xl" />
  </div>
);

const DiscoverSkeleton = () => (
  <div className="mx-auto w-full max-w-[600px] px-4 py-4">
    <Bar className="h-[520px] w-full rounded-3xl" />
  </div>
);

const PartnersSkeleton = () => (
  <div className="mx-auto w-full max-w-[680px] px-4 py-4 space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 py-3">
        <Circle className="h-14 w-14 shrink-0" />
        <div className="flex-1 space-y-2">
          <Bar className="h-3 w-1/3" />
          <Bar className="h-3 w-1/2" />
        </div>
        <Bar className="h-9 w-20 rounded-full" />
      </div>
    ))}
  </div>
);

const ProfileSkeleton = () => (
  <div className="mx-auto w-full max-w-[680px] px-4 py-4 space-y-4">
    <Bar className="h-32 w-full rounded-2xl" />
    <div className="flex items-center gap-4 -mt-10 px-2">
      <Circle className="h-20 w-20 border-4 border-background" />
      <div className="flex-1 space-y-2 pt-10">
        <Bar className="h-4 w-40" />
        <Bar className="h-3 w-24" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Bar key={i} className="aspect-square rounded-md" />
      ))}
    </div>
  </div>
);

const TradingLogSkeleton = () => (
  <div className="mx-auto w-full max-w-[680px] px-4 py-4 space-y-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <Bar key={i} className="h-20 rounded-xl" />
    ))}
  </div>
);

const GenericSkeleton = () => (
  <div className="mx-auto w-full max-w-[680px] px-4 py-4 space-y-3">
    <Bar className="h-6 w-1/3" />
    <Bar className="h-32 rounded-xl" />
    <Bar className="h-32 rounded-xl" />
  </div>
);

/**
 * Renders a skeleton matching the current route. Used as the global Suspense
 * fallback so navigation feels instant — the page paints structure immediately
 * while React Query / route bundles finish loading.
 */
const RouteSkeleton = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/feed")) return <FeedSkeleton />;
  if (pathname.startsWith("/messages")) return <MessagesSkeleton />;
  if (pathname.startsWith("/dashboard")) return <DashboardSkeleton />;
  if (pathname.startsWith("/discover")) return <DiscoverSkeleton />;
  if (pathname.startsWith("/partners")) return <PartnersSkeleton />;
  if (pathname.startsWith("/profile")) return <ProfileSkeleton />;
  if (pathname.startsWith("/trading-log")) return <TradingLogSkeleton />;
  return <GenericSkeleton />;
};

export default RouteSkeleton;