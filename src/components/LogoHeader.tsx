import Wordmark from "@/components/Wordmark";

const LogoHeader = ({ compact }: { compact?: boolean }) => (
  <div className={`flex items-center gap-2 ${compact ? "justify-start" : "justify-center"}`}>
    <Wordmark size={compact ? "text-base" : "text-2xl"} />
  </div>
);

export default LogoHeader;
