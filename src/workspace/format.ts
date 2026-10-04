export const number = (v: number | null | undefined, unit = "") =>
  v == null
    ? "Unavailable"
    : `${v.toLocaleString("en-IN", { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}`;
export const date = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "No reading";
