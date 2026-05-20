// SVG approximation of the ZWB Cycling Community wordmark.
// Drop a pixel-perfect /public/logo.png and swap the import if you want exact.

export function ZwbLogo({
  className,
  withTagline = true,
}: {
  className?: string;
  withTagline?: boolean;
}) {
  const viewBox = withTagline ? "0 0 220 100" : "0 0 220 70";
  return (
    <svg
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="ZWB Cycling Community"
      role="img"
    >
      {/* Three leaning parallelograms forming a stylized ZWB */}
      <polygon points="20,10 70,10 55,65 5,65" fill="var(--color-zwb-gold)" />
      <polygon points="80,10 130,10 115,65 65,65" fill="var(--color-zwb-petrol)" />
      <polygon
        points="140,10 190,10 175,65 125,65"
        fill="var(--color-zwb-petrol-dark)"
      />
      {withTagline && (
        <text
          x="0"
          y="92"
          fontFamily="var(--font-sans), system-ui, sans-serif"
          fontSize="11"
          letterSpacing="4"
          fontWeight={600}
          fill="currentColor"
        >
          CYCLING COMMUNITY
        </text>
      )}
    </svg>
  );
}

export function ZwbMark({ className }: { className?: string }) {
  return <ZwbLogo className={className} withTagline={false} />;
}
