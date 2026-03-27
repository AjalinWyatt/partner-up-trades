import { Globe } from "lucide-react";

const LogoHeader = ({ compact }: { compact?: boolean }) => (
  <div className={`flex items-center gap-2 ${compact ? "justify-start" : "justify-center"}`}>
    <Globe className="w-5 h-5 text-success" />
    <span className="text-lg font-bold tracking-tight text-foreground">
      traders <span className="text-success">world</span>
      <span className="text-[10px] text-muted-foreground align-super ml-0.5">™</span>
    </span>
  </div>
);

export default LogoHeader;
