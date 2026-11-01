import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSubMeter, severity, formatReset, windowLabel } from "./quota.js";

const SAMPLE = JSON.stringify({
  limits: [
    { kind: "five_hour", percentUsed: 5, resetsAt: "2026-11-01T09:40:00.000Z" },
    { kind: "seven_day", percentUsed: 1, resetsAt: "2026-11-07T22:00:00.000Z" },
  ],
});

test("parses both Claude windows in order", () => {
  assert.deepEqual(parseSubMeter(SAMPLE), [
    { kind: "five_hour", percent: 5, resetsAt: "2026-11-01T09:40:00.000Z" },
    { kind: "seven_day", percent: 1, resetsAt: "2026-11-07T22:00:00.000Z" },
  ]);
});

test("invalid, empty or null input yields no windows", () => {
  assert.deepEqual(parseSubMeter(null), []);
  assert.deepEqual(parseSubMeter(""), []);
  assert.deepEqual(parseSubMeter("{not json"), []);
  assert.deepEqual(parseSubMeter("{}"), []);
});

test("entries without a numeric percent are dropped, percent is clamped", () => {
  const text = JSON.stringify({ limits: [
    { kind: "five_hour", percentUsed: "x" },
    { kind: "seven_day", percentUsed: 140, resetsAt: "2026-11-07T22:00:00.000Z" },
  ] });
  assert.deepEqual(parseSubMeter(text), [
    { kind: "seven_day", percent: 100, resetsAt: "2026-11-07T22:00:00.000Z" },
  ]);
});

test("severity maps usage to a status color name", () => {
  assert.equal(severity(0), "done");
  assert.equal(severity(69), "done");
  assert.equal(severity(70), "blocked");
  assert.equal(severity(89), "blocked");
  assert.equal(severity(90), "unknown");
  assert.equal(severity(100), "unknown");
});

test("windowLabel names known windows and falls back to the kind", () => {
  assert.equal(windowLabel("five_hour"), "5h");
  assert.equal(windowLabel("seven_day"), "7d");
  assert.equal(windowLabel("other"), "other");
});

test("formatReset is compact and never negative", () => {
  const now = Date.parse("2026-11-01T08:00:00.000Z");
  assert.equal(formatReset("2026-11-01T09:40:00.000Z", now), "1h 40m");
  assert.equal(formatReset("2026-11-01T08:25:00.000Z", now), "25m");
  assert.equal(formatReset("2026-11-07T22:00:00.000Z", now), "6d 14h");
  assert.equal(formatReset("2026-11-01T07:00:00.000Z", now), "now");
  assert.equal(formatReset(undefined, now), "");
});
