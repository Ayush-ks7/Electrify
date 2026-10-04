import type { Investigation } from "../types/simulation";
import { number } from "./format";
import { computeRiskScore } from "./service";

export { computeRiskScore };

export function RiskScore({
  info,
  showBadge = false,
}: {
  info: Investigation | null;
  showBadge?: boolean;
}) {
  const score = computeRiskScore(info);
  const rawProb = info?.review_probability;
  const rawProbPercent =
    rawProb != null && Number.isFinite(rawProb)
      ? `${(rawProb * 100).toFixed(1)}%`
      : null;

  const tooltip = info
    ? `Risk Score: ${score != null ? `${score}%` : "Not calculated"} · Raw ML model probability: ${rawProbPercent ?? "Awaiting"} · ${info.score_state ?? ""}`
    : "No stored model result";

  const tone =
    score == null
      ? "blue"
      : score >= 75
        ? "red"
        : score >= 40
          ? "amber"
          : "green";

  const content =
    score != null ? (
      showBadge ? (
        <span className={`badge ${tone}`}>{number(score, "%")}</span>
      ) : (
        number(score, "%")
      )
    ) : info?.last_error ? (
      "Score unavailable"
    ) : info ? (
      "Awaiting score"
    ) : (
      "Not scored"
    );

  return (
    <span data-testid="risk-score" title={tooltip}>
      {content}
      {info?.last_error && (
        <small className="subcell">
          {score != null ? "Last saved score · " : ""}
          {info.last_error}
        </small>
      )}
    </span>
  );
}

