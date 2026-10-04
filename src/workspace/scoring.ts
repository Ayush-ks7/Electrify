import type { Investigation } from "../types/simulation";

/**
 * Computes a deterministic pseudo-random float in [-0.5, 0.5] for a consumer identifier.
 * Uses 32-bit FNV-1a with avalanche mixing so even sequential IDs ("C01", "C02", "C03")
 * yield well-distributed, stable offsets for individualized consumer risk gradient scoring.
 */
export function getConsumerSeed(id?: string | null): number {
  if (!id) return 0;
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // 32-bit avalanche mixer
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296 - 0.5;
}

/**
 * Calculates a continuous operational 0-100 Risk Score gradient for consumers.
 *
 * Requirements:
 * - A full continuous gradient across 0 to 100 based on operational telemetry and model confidence.
 * - No artificial saturation: suspected theft scores high (around 80-92%), but is NEVER forced to 100%.
 * - Consumer individuality: distinct consumers receive different, personalized risk scores.
 *
 * Scenario typical spans:
 * - Possible Theft / Tampering: 80 - 92% (continuous gradient based on drop severity + seed)
 * - Sudden Consumption Drop: 72 - 82%
 * - Meter Hardware Fault: 76 - 86% (scaled by voltage abnormality)
 * - Communication Outage: 65 - 73%
 * - Legitimate Abnormal High Load: 15 - 23% (abnormal surge, but not theft)
 * - Normal Consumer: 3 - 8% (routine baseline variation)
 */
export function computeRiskScore(info: Investigation | null): number | null {
  if (!info) return null;

  const cid =
    info.consumer_id ||
    info.source_consumer_id ||
    info.latest_reading?.consumer_id ||
    "";
  const seed = getConsumerSeed(cid);

  // 1. Simulation mode / active scenario evaluation
  if (info.simulated || info.scenario) {
    const scenario = info.scenario;
    const deviation = info.deviation_pct;
    const cause = (info.probable_cause || "").toLowerCase();
    const priority = info.inspection_priority;
    const commStatus = info.latest_reading?.communication_status;
    const meterStatus = info.latest_reading?.meter_status;
    const voltage = info.latest_reading?.voltage_v;

    // A. Suspected Theft Pattern (tampering / meter bypass under-reporting):
    // Elevated gradient in 80 - 92% range, never forced to 100%
    if (
      scenario === "tampering" ||
      cause.includes("tampering") ||
      (deviation !== null &&
        deviation < -50 &&
        commStatus === "online" &&
        meterStatus === "normal")
    ) {
      const base = 84.0;
      const devContrib =
        deviation !== null
          ? Math.min(4.5, Math.max(0, (Math.abs(deviation) - 50) * 0.1))
          : 1.5;
      const probContrib =
        info.review_probability != null
          ? Math.min(2.5, info.review_probability * 75)
          : 1.0;
      const raw = base + seed * 6.0 + devContrib + probContrib;
      return Math.round(Math.min(93.5, Math.max(80.0, raw)) * 10) / 10;
    }

    // B. Sudden Consumption Drop:
    // Significant drop under operational observation (72 - 82%)
    if (scenario === "sudden_drop" || (deviation !== null && deviation < -40)) {
      const base = 75.0;
      const devContrib =
        deviation !== null
          ? Math.min(4.0, Math.max(0, (Math.abs(deviation) - 40) * 0.08))
          : 1.0;
      const probContrib =
        info.review_probability != null
          ? Math.min(2.0, info.review_probability * 50)
          : 0.8;
      const raw = base + seed * 5.5 + devContrib + probContrib;
      return Math.round(Math.min(83.5, Math.max(71.0, raw)) * 10) / 10;
    }

    // C. Meter Fault / Equipment Malfunction:
    // 420V voltage anomaly and fault status flag (76 - 86%)
    if (
      scenario === "meter_fault" ||
      cause.includes("malfunction") ||
      meterStatus === "fault"
    ) {
      const base = 80.5;
      const voltBonus =
        voltage && voltage > 260 ? Math.min(3.5, (voltage - 240) * 0.018) : 1.2;
      const raw = base + seed * 5.0 + voltBonus;
      return Math.round(Math.min(86.5, Math.max(76.0, raw)) * 10) / 10;
    }

    // D. Meter Data Transmission Failure:
    // Communication offline, missing payload (65 - 73%)
    if (
      scenario === "communication_failure" ||
      cause.includes("transmission") ||
      commStatus === "offline"
    ) {
      const base = 68.5;
      const raw = base + seed * 5.0;
      return Math.round(Math.min(73.5, Math.max(64.0, raw)) * 10) / 10;
    }

    // E. Legitimate High Consumption (Not theft):
    // Temporary 2.5x load spike (+150%) - legitimate load, not theft (15 - 23%)
    if (
      scenario === "legitimate_abnormal" ||
      cause.includes("load change") ||
      (deviation !== null && deviation > 40)
    ) {
      const base = 18.0;
      const loadBonus =
        deviation !== null && deviation > 30
          ? Math.min(3.0, (deviation - 30) * 0.02)
          : 1.0;
      const raw = base + seed * 4.5 + loadBonus;
      return Math.round(Math.min(23.5, Math.max(14.0, raw)) * 10) / 10;
    }

    // F. Normal profile:
    // Baseline risk gradient (3 - 8%)
    if (scenario === "normal") {
      const base = 4.5;
      const p = info.review_probability ?? 0.015;
      const raw = base + seed * 3.5 + p * 60;
      return Math.round(Math.min(9.5, Math.max(2.5, raw)) * 10) / 10;
    }

    // Operational rule priority fallbacks with consumer seed
    if (priority === "High")
      return Math.round(Math.min(92.0, Math.max(78.0, 84.0 + seed * 6.0)) * 10) / 10;
    if (priority === "Review")
      return Math.round(Math.min(80.0, Math.max(65.0, 72.0 + seed * 5.0)) * 10) / 10;
    if (info.requires_review)
      return Math.round(Math.min(76.0, Math.max(62.0, 68.0 + seed * 5.0)) * 10) / 10;
  }

  // 2. Stored / non-simulated history scoring:
  if (
    info.review_probability != null &&
    Number.isFinite(info.review_probability) &&
    info.review_probability >= 0
  ) {
    const p = info.review_probability;
    if (p >= 0.201) {
      // Model screening threshold [0.201 .. 0.50+] maps to [62% .. 92%]
      const scaled = 62 + ((p - 0.201) / 0.3) * 28;
      const score = Math.min(93.0, Math.max(60.0, scaled + seed * 5.0));
      return Math.round(score * 10) / 10;
    } else {
      // Normal baseline [0.0 .. 0.201] maps to [2% .. 54%]
      const scaled = (p / 0.201) * 46 + 2.5;
      const score = Math.min(54.0, Math.max(1.0, scaled + seed * 3.5));
      return Math.round(score * 10) / 10;
    }
  }

  return null;
}
