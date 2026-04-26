import brandGlobe from "@/assets/tradersworld-globe.png";

interface Props {
  /** Current step (1-based) */
  step: number;
  /** Total steps */
  total: number;
}

/**
 * Circular stepper used in onboarding header - segments around a globe icon.
 */
const StepperGlobe = ({ step, total }: Props) => {
  const size = 64;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const segmentLength = circumference / total;
  const gap = 6;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {Array.from({ length: total }).map((_, i) => {
          const isActive = i < step;
          const dashOffset = -i * segmentLength;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={isActive ? "hsl(var(--accent))" : "hsl(var(--muted))"}
              strokeWidth={stroke}
              strokeDasharray={`${segmentLength - gap} ${circumference - segmentLength + gap}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <img src={brandGlobe} alt="" className="w-9 h-9 object-contain drop-shadow-[0_0_10px_hsl(var(--primary)/0.45)]" />
      </div>
    </div>
  );
};

export default StepperGlobe;
