export function StatusChip(props: {
  tone: "ready" | "upcoming" | "error" | "neutral";
  children: React.ReactNode;
}) {
  return <span className={`status status-${props.tone}`}>{props.children}</span>;
}
