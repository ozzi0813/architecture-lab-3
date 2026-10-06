import test from "node:test";
import assert from "node:assert/strict";
import { PaymentService } from "../src/payments/index.ts";

test("MockBank adapter correctly processes paid, processing, and failed states", async () => {
  const service = new PaymentService();

  const paidResult = await service.charge({
    paymentToken: "bank_tok_success",
    amount: 150,
    currency: "UAH",
    orderId: "ord-101",
    provider: "mockbank",
  });
  assert.equal(paidResult.status, "paid");
  assert.match(paidResult.paymentId, /^bnk_/);

  const processingResult = await service.charge({
    paymentToken: "pending_bank_tok",
    amount: 150,
    currency: "UAH",
    orderId: "ord-102",
    provider: "mockbank",
  });
  assert.equal(processingResult.status, "processing");

  const failedResult = await service.charge({
    paymentToken: "fail_bank_tok",
    amount: 150,
    currency: "UAH",
    orderId: "ord-103",
    provider: "mockbank",
  });
  assert.equal(failedResult.status, "failed");
});