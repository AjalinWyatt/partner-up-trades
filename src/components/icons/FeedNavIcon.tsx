import { forwardRef, type SVGProps } from "react";

const FeedNavIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>((props, ref) => {
  return (
    <svg ref={ref} viewBox="0 0 52 36" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="17" y1="6" x2="50" y2="6" />
      <line x1="10" y1="18" x2="43" y2="18" />
      <line x1="3" y1="30" x2="36" y2="30" />
    </svg>
  );
});

FeedNavIcon.displayName = "FeedNavIcon";

export default FeedNavIcon;
