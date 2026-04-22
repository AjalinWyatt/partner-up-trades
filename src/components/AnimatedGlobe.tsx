import * as React from "react";
import globeImg from "@/assets/auth-globe.png";

const AnimatedGlobe = React.forwardRef<HTMLDivElement, { size?: number }>(({ size = 240 }, ref) => {
  return (
    <div
      ref={ref}
      className="relative mx-auto pointer-events-none select-none"
      style={{ width: size, height: size }}
    >
      <img
        src={globeImg}
        alt=""
        aria-hidden="true"
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
});

AnimatedGlobe.displayName = "AnimatedGlobe";

export default AnimatedGlobe;
