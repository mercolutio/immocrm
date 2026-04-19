interface Props {
  label: string;
  count: number;
  urgent?: boolean;
}

export default function TodayFeedGroupLabel({ label, count, urgent = false }: Props) {
  const color = urgent ? "var(--accent)" : "#A8A49C";
  const lineBg = urgent ? "rgba(194,105,42,0.18)" : "#E7E5E0";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 4px",
        marginBottom: 10,
        fontSize: 10.5,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        color,
      }}
    >
      <span>{label}</span>
      <span style={{ flex: 1, height: 1, background: lineBg }} />
      <span
        style={{
          fontFamily: "'DM Mono', ui-monospace, monospace",
          fontSize: 10,
          fontWeight: 400,
          letterSpacing: 0,
          fontVariantNumeric: "tabular-nums",
          color,
        }}
      >
        {count}
      </span>
    </div>
  );
}
