import globeImg from "@/assets/auth-globe.png";

const AnimatedGlobe = ({ size = 240 }: { size?: number }) => {
  return (
    <div
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
};

export default AnimatedGlobe;
