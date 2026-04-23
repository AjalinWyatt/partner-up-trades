import wordmark from "@/assets/tradersworld-wordmark.png";
import lockup from "@/assets/tradersworld-lockup.png";

const LogoHeader = ({ compact }: { compact?: boolean }) => (
  <div className={`flex items-center gap-2 ${compact ? "justify-start" : "justify-center"}`}>
    <img
      src={compact ? lockup : wordmark}
      alt="TradersWorld"
      className={compact ? "h-6 w-auto" : "h-8 w-auto"}
      loading="eager"
    />
  </div>
);

export default LogoHeader;
