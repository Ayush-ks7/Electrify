import { test } from "node:test";
import assert from "node:assert/strict";
import { balanceCSV, csvCell } from "../src/workspace/export.ts";

test("balance export carries selected dates, units, nulls, precision and provenance", () => {
  const data = {
    range: { start: "2026-09-01", end: "2026-09-07" },
    input_source: "Simulated, not measured",
    transformers: [
      { id: "T1", input: 100, consumer: 90, residual: 10, percent: 10 },
      { id: "T2", input: 120, consumer: null, residual: null, percent: null },
    ],
  };
  const csv = balanceCSV(data);
  assert.equal(csv.split("\r\n").length, 3);
  assert.ok(
    csv.includes('"2026-09-01","2026-09-07","T1","100","90","10","10"'),
  );
  assert.ok(csv.includes('"T2","120","","",""'));
  assert.ok(csv.includes('"Simulated, not measured"'));
  const month = balanceCSV({
    ...data,
    range: { start: "2026-08-09", end: "2026-09-07" },
  });
  assert.ok(month.includes("2026-08-09") && !month.includes("2026-09-01"));
  assert.equal(csvCell("=SUM(A1)"), '"\'=SUM(A1)"');
  assert.equal(csvCell('a"b'), '"a""b"');
});

test("computeRiskScore produces 80-92% gradient for suspected theft and distinct scores across consumers", async () => {
  const { computeRiskScore, getConsumerSeed } = await import(
    "../src/workspace/scoring.ts"
  );

  assert.equal(computeRiskScore(null), null);

  // 1. Theft / Tampering: elevated continuous gradient (80-92%), never maximized to 100%
  const theftScoreC01 = computeRiskScore({
    consumer_id: "C01",
    simulated: true,
    scenario: "tampering",
    deviation_pct: -77.8,
    probable_cause: "Persistent reduction; tampering is one hypothesis",
    inspection_priority: "High",
    review_probability: 0.02,
    latest_reading: { communication_status: "online", meter_status: "normal" },
  });
  const theftScoreC02 = computeRiskScore({
    consumer_id: "C02",
    simulated: true,
    scenario: "tampering",
    deviation_pct: -77.8,
    probable_cause: "Persistent reduction; tampering is one hypothesis",
    inspection_priority: "High",
    review_probability: 0.02,
    latest_reading: { communication_status: "online", meter_status: "normal" },
  });
  const theftScoreC03 = computeRiskScore({
    consumer_id: "C03",
    simulated: true,
    scenario: "tampering",
    deviation_pct: -77.8,
    probable_cause: "Persistent reduction; tampering is one hypothesis",
    inspection_priority: "High",
    review_probability: 0.02,
    latest_reading: { communication_status: "online", meter_status: "normal" },
  });

  assert.ok(theftScoreC01 >= 80 && theftScoreC01 <= 93.5, `Theft score C01 was ${theftScoreC01}`);
  assert.ok(theftScoreC02 >= 80 && theftScoreC02 <= 93.5, `Theft score C02 was ${theftScoreC02}`);
  assert.ok(theftScoreC01 < 100, "Theft score must not be artificially pinned to 100");
  assert.notEqual(theftScoreC01, theftScoreC02, "Distinct consumers must have different risk scores");
  assert.notEqual(theftScoreC02, theftScoreC03, "Distinct consumers must have different risk scores");

  // 2. Sudden drop: elevated gradient (72 - 82%)
  const dropScore = computeRiskScore({
    consumer_id: "C01",
    simulated: true,
    scenario: "sudden_drop",
    deviation_pct: -77.8,
    probable_cause: "Consumption change under observation",
    inspection_priority: "Review",
    review_probability: 0.02,
  });
  assert.ok(dropScore >= 72 && dropScore <= 83, `Drop score was ${dropScore}`);

  // 3. Meter fault: hardware malfunction (76 - 86%)
  const faultScore = computeRiskScore({
    consumer_id: "C01",
    simulated: true,
    scenario: "meter_fault",
    deviation_pct: null,
    probable_cause: "Meter malfunction suspected",
    inspection_priority: "High",
    latest_reading: { meter_status: "fault", voltage_v: 420 },
  });
  assert.ok(faultScore >= 76 && faultScore <= 87, `Fault score was ${faultScore}`);

  // 4. Communication failure: transmission outage (65 - 73%)
  const commScore = computeRiskScore({
    consumer_id: "C01",
    simulated: true,
    scenario: "communication_failure",
    deviation_pct: null,
    probable_cause: "Meter Data Transmission Failure",
    inspection_priority: "High",
    latest_reading: { communication_status: "offline" },
  });
  assert.ok(commScore >= 65 && commScore <= 74, `Comm score was ${commScore}`);

  // 5. Legitimate abnormal: load surge, not theft (15 - 23%)
  const highLoadScore = computeRiskScore({
    consumer_id: "C01",
    simulated: true,
    scenario: "legitimate_abnormal",
    deviation_pct: 145.0,
    probable_cause: "Reported temporary load change",
    inspection_priority: "Review",
  });
  assert.ok(highLoadScore >= 15 && highLoadScore <= 24, `High load score was ${highLoadScore}`);

  // 6. Normal: low baseline risk (3 - 8%)
  const normalScoreC01 = computeRiskScore({
    consumer_id: "C01",
    simulated: true,
    scenario: "normal",
    deviation_pct: 2.1,
    probable_cause: "No operational anomaly detected",
    inspection_priority: "Routine",
    review_probability: 0.01,
  });
  const normalScoreC02 = computeRiskScore({
    consumer_id: "C02",
    simulated: true,
    scenario: "normal",
    deviation_pct: 2.1,
    probable_cause: "No operational anomaly detected",
    inspection_priority: "Routine",
    review_probability: 0.01,
  });
  assert.ok(normalScoreC01 >= 3 && normalScoreC01 <= 9, `Normal score C01 was ${normalScoreC01}`);
  assert.notEqual(normalScoreC01, normalScoreC02, "Distinct normal consumers must have different scores");

  // 7. Seed generator check
  assert.notEqual(getConsumerSeed("C01"), getConsumerSeed("C02"));
});

