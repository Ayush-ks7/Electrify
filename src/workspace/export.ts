import type { Workspace } from "./types";
export function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function balanceCSV(data: Workspace) {
  return [
    [
      "start_date",
      "end_date",
      "transformer",
      "input_energy_kwh",
      "consumer_energy_sum_kwh",
      "residual_energy_kwh",
      "residual_percent",
      "source",
    ],
    ...data.transformers.map((t) => [
      data.range.start,
      data.range.end,
      t.id,
      t.input,
      t.consumer,
      t.residual,
      t.percent,
      data.input_source,
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}
export function downloadCSV(data: Workspace) {
  const url = URL.createObjectURL(
    new Blob(["\ufeff", balanceCSV(data)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `electrify-energy-balance-${data.range.start}-${data.range.end}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
