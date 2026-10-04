import type { Investigation } from "../types/simulation";
import { number } from "./format";

// Presentation only: probability always comes from the saved backend model result.
export function RiskScore({ info }: { info: Investigation | null }) {
  const value = info?.review_probability;
  const valid = value != null && Number.isFinite(value) && value >= 0 && value <= 1;
  return (
    <span data-testid="risk-score" title={info?.score_state ?? "No stored model result"}>
      {valid ? number(value * 100, "%") : info?.last_error ? "Score unavailable" : info ? "Awaiting score" : "Not scored"}
      {info?.last_error && <small className="subcell">{valid ? "Last saved score · " : ""}{info.last_error}</small>}
    </span>
  );
}
