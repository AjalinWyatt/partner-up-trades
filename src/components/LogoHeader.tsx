import { Globe } from "lucide-react";

const LogoHeader = ({ compact }: { compact?: boolean }) => (
  <div className={`flex items-center gap-2 ${compact ? "justify-start" : "justify-center"}`}>
    <Globe className="w-5 h-5 text-primary" />
    <span className="text-lg font-bold tracking-tight text-foreground">
      traders<span className="text-gradient-gold">world</span>
    </span>
  </div>
);

export default LogoHeader;
