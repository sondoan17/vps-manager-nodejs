export function SummaryPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "amber" | "red";
}) {
  return (
    <div
      className={`min-w-0 rounded-none border px-3.5 py-3 shadow-none ${tone === "red" ? "border-red-400/25 bg-red-400/[0.06] text-red-100" : tone === "amber" ? "border-amber-400/25 bg-amber-400/[0.05] text-amber-100" : "border-white/10 bg-white/[0.03] text-white/70"}`}
    >
      <p className="text-[11px] font-normal uppercase tracking-[0.12em] opacity-75">
        {label}
      </p>
      <p
        className="mt-1 whitespace-normal break-words text-[15px] font-normal leading-5"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
