const MarqueeFooter = () => {
  const markets = ["Forex", "Futures", "Options"];
  const repeated = [...markets, ...markets, ...markets];

  return (
    <div className="w-full overflow-hidden border-t border-border py-3">
      <div className="animate-marquee flex whitespace-nowrap">
        {repeated.map((m, i) => (
          <span key={i} className="mx-6 text-xs font-medium tracking-widest uppercase text-muted-foreground">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarqueeFooter;
