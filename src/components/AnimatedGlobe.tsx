import { motion } from "framer-motion";

const AnimatedGlobe = () => {
  const dots = Array.from({ length: 20 }, (_, i) => ({
    cx: 50 + 35 * Math.cos((i * Math.PI * 2) / 20) * Math.sin((i * 0.7)),
    cy: 50 + 35 * Math.sin((i * Math.PI * 2) / 20) * Math.cos((i * 0.5)),
    delay: i * 0.15,
  }));

  return (
    <div className="relative w-56 h-56 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Outer glow */}
        <defs>
          <radialGradient id="globe-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(214 76% 50%)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(214 76% 50%)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(214 76% 50%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(157 82% 40%)" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="50" r="42" fill="url(#globe-glow)" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="hsl(214 76% 50%)" strokeOpacity="0.2" strokeWidth="0.5" />
        <circle cx="50" cy="50" r="28" fill="none" stroke="hsl(214 76% 50%)" strokeOpacity="0.15" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="18" fill="none" stroke="hsl(214 76% 50%)" strokeOpacity="0.1" strokeWidth="0.3" />

        {/* Latitude lines */}
        <ellipse cx="50" cy="50" rx="38" ry="15" fill="none" stroke="url(#line-grad)" strokeWidth="0.4" />
        <ellipse cx="50" cy="50" rx="38" ry="30" fill="none" stroke="url(#line-grad)" strokeWidth="0.3" />

        {/* Longitude lines */}
        <ellipse cx="50" cy="50" rx="15" ry="38" fill="none" stroke="url(#line-grad)" strokeWidth="0.4" />
        <ellipse cx="50" cy="50" rx="30" ry="38" fill="none" stroke="url(#line-grad)" strokeWidth="0.3" />

        {/* Glowing dots */}
        {dots.map((dot, i) => (
          <motion.circle
            key={i}
            cx={dot.cx}
            cy={dot.cy}
            r="1.2"
            fill="hsl(157 82% 40%)"
            initial={{ opacity: 0.2 }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: dot.delay }}
          />
        ))}
      </svg>
    </div>
  );
};

export default AnimatedGlobe;
