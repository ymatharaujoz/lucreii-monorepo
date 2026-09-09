"use client";

export function MarketingBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="marketing-site-canvas absolute inset-0" />
      <div
        className="absolute left-0 right-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(14, 122, 111, 0.15) 50%, transparent 100%)",
        }}
      />
    </div>
  );
}
