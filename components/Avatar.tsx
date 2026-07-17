const PALETTE = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b",
  "#10b981","#3b82f6","#14b8a6","#f97316",
];

function colorFor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = 32,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const bg = colorFor(name || "user");
  const ini = initials(name || "?");
  return (
    <div
      aria-label={name}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.38),
        fontWeight: 700,
        letterSpacing: "-0.02em",
        flexShrink: 0,
        userSelect: "none",
        fontFamily: "var(--font-sans, system-ui)",
      }}
    >
      {ini}
    </div>
  );
}
