import type { Scenario } from "../types/simulation";
import type { CaseStatus } from "./types";

export const scenarios: { value: Scenario; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "legitimate_abnormal", label: "High Consumption" },
  { value: "sudden_drop", label: "Sudden Consumption Drop" },
  { value: "tampering", label: "Suspected Theft Pattern" },
  { value: "meter_fault", label: "Meter Fault" },
  { value: "communication_failure", label: "Meter Data Transmission Failure" },
];
export const caseStatuses: CaseStatus[] = [
  "Open",
  "Under Review",
  "Confirmed",
  "False Positive",
  "Resolved",
];
