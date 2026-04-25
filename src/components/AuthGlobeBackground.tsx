/**
 * Large globe background that bleeds from the top of auth screens.
 * Uses the design's globe image, faded into the page below.
 * Sourced from /public so it can be preloaded in index.html and is in
 * the browser cache before this component ever mounts.
 */
const AuthGlobeBackground = ({ height = 480 }: { height?: number }) => {
  return (
    <div
      className="absolute top-0 left-0 right-0 pointer-events-none overflow-hidden"
      style={{ height }}
    >
      <img
        src="/auth-globe.png"
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        // @ts-expect-error - valid HTML attr, React types lag behind
        fetchpriority="high"
        className="absolute left-1/2 -translate-x-1/2 select-none auth-globe-float motion-reduce:animate-none"
        style={{
          top: -40,
          width: 620,
          maxWidth: "none",
          height: "auto",
          WebkitMaskImage:
            "linear-gradient(to bottom, hsl(0 0% 0%) 55%, transparent 95%)",
          maskImage:
            "linear-gradient(to bottom, hsl(0 0% 0%) 55%, transparent 95%)",
        }}
        draggable={false}
      />
      {/* Soft fade-out to background at the bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          background:
            "linear-gradient(to bottom, transparent, hsl(var(--background)))",
        }}
      />
      <style>{`
        @keyframes auth-globe-float {
          0%, 100% {
            transform: translate(-50%, 0) scale(1);
            opacity: 0.95;
          }
          50% {
            transform: translate(-50%, -6px) scale(1.015);
            opacity: 1;
          }
        }
        .auth-globe-float {
          animation: auth-globe-float 7s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-globe-float { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default AuthGlobeBackground;
