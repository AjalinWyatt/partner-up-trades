/**
 * Large globe background that bleeds from the top of auth screens.
 * Matches the Sign In / Sign Up mockups — wireframe globe in cyan,
 * positioned to fade into the page below.
 */
const AuthGlobeBackground = ({ height = 480 }: { height?: number }) => {
  // Densely-packed dot grid clipped to a circle to mimic a globe
  const dots: { cx: number; cy: number; r: number }[] = [];
  const cx = 250;
  const cy = 250;
  const radius = 230;
  const spacing = 9;
  for (let y = -radius; y <= radius; y += spacing) {
    const halfWidth = Math.sqrt(radius * radius - y * y);
    for (let x = -halfWidth; x <= halfWidth; x += spacing) {
      // Project to sphere — shrink dots near edges for 3D feel
      const d = Math.sqrt(x * x + y * y) / radius;
      const r = 0.7 + (1 - d) * 0.6;
      dots.push({ cx: cx + x, cy: cy + y, r });
    }
  }

  return (
    <div
      className="absolute top-0 left-0 right-0 pointer-events-none overflow-hidden"
      style={{ height }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center top, hsl(var(--accent) / 0.06) 0%, transparent 60%)",
        }}
      />
      <svg
        viewBox="0 0 500 500"
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: -60, width: 600, height: 600 }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="globe-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(180 100% 50%)" stopOpacity="0.9" />
            <stop offset="70%" stopColor="hsl(180 100% 50%)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="hsl(180 100% 50%)" stopOpacity="0.2" />
          </radialGradient>
          <linearGradient id="globe-bottom-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(0 0% 0%)" stopOpacity="0" />
            <stop offset="70%" stopColor="hsl(0 0% 0%)" stopOpacity="0" />
            <stop offset="100%" stopColor="hsl(0 0% 0%)" stopOpacity="1" />
          </linearGradient>
          <mask id="globe-mask">
            <rect width="500" height="500" fill="white" />
            <rect width="500" height="500" fill="url(#globe-bottom-fade)" />
          </mask>
        </defs>

        <g mask="url(#globe-mask)">
          {/* Dot grid */}
          {dots.map((d, i) => (
            <circle
              key={i}
              cx={d.cx}
              cy={d.cy}
              r={d.r}
              fill="url(#globe-fade)"
            />
          ))}

          {/* Orbit rings */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={radius}
            ry={radius * 0.32}
            fill="none"
            stroke="hsl(180 100% 50%)"
            strokeOpacity="0.55"
            strokeWidth="1.5"
          />
          <ellipse
            cx={cx}
            cy={cy}
            rx={radius * 0.95}
            ry={radius * 0.55}
            fill="none"
            stroke="hsl(180 100% 50%)"
            strokeOpacity="0.4"
            strokeWidth="1.2"
            transform={`rotate(-12 ${cx} ${cy})`}
          />

          {/* Bright spot */}
          <circle cx={cx + 150} cy={cy + 30} r="3" fill="hsl(0 0% 100%)" opacity="0.9" />
          <circle cx={cx + 150} cy={cy + 30} r="8" fill="hsl(0 0% 100%)" opacity="0.2" />
        </g>
      </svg>

      {/* Soft fade-out to background at the bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          background: "linear-gradient(to bottom, transparent, hsl(var(--background)))",
        }}
      />
    </div>
  );
};

export default AuthGlobeBackground;
