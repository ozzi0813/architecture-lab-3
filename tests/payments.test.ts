import test from "node:test";
import assert from "node:assert/strict";
import { normalizePaymentStatus } from "../src/payments/index.ts";

test("normalizePaymentStatus maps successful state to paid", () => {
  assert.equal(normalizePaymentStatus("succeeded"), "paid");
  assert.equal(normalizePaymentStatus("paid"), "paid");
});

test("normalizePaymentStatus maps intermediate states to processing", () => {
  assert.equal(normalizePaymentStatus("processing"), "processing");
  assert.equal(normalizePaymentStatus("requires_action"), "processing");
  assert.equal(normalizePaymentStatus("pending"), "processing");
});

test("normalizePaymentStatus maps declined and failed to failed", () => {
  assert.equal(normalizePaymentStatus("declined"), "failed");
  assert.equal(normalizePaymentStatus("failed"), "failed");
});

test("normalizePaymentStatus maps unknown or malformed input to unknown", () => {
  assert.equal(normalizePaymentStatus("something_random"), "unknown");
  assert.equal(normalizePaymentStatus(""), "unknown");
  assert.equal(normalizePaymentStatus(null), "unknown");
  assert.equal(normalizePaymentStatus(undefined), "unknown");
});