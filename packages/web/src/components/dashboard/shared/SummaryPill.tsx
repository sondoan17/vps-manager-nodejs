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
      className={`min-w-0 rounded-md border px-3.5 py-3 shadow-sm ${tone === "red" ? "border-[#ebebeb] bg-white text-neutral-700" : "border-[#ebebeb] bg-white text-neutral-700"}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-75">
        {label}
      </p>
      <p
        className="mt-1 whitespace-normal break-words text-[15px] font-semibold leading-5"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
