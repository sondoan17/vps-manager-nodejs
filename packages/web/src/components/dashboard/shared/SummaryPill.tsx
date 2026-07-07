export function SummaryPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "red";
}) {
  return (
    <div
      className={`min-w-0 rounded-md border px-3.5 py-3 shadow-sm ${tone === "red" ? "border-neutral-200 bg-neutral-50 text-neutral-700" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.12em] opacity-75">
        {label}
      </p>
      <p
        className="mt-1 whitespace-normal break-words text-[15px] font-black leading-5"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
