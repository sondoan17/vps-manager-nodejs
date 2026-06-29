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
      className={`min-w-0 rounded-xl border px-3.5 py-3 shadow-sm ${tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
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
