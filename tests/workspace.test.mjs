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
