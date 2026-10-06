export type MockBankPayload = {
  transaction_ref: string;
  total_minor_units: number;
  iso_currency: string;
  client_order_number: string;
};

export type MockBankResponse = {
  bank_reference: string;
  transaction_status: "SETTLED" | "IN_REVIEW" | "REJECTED";
};

export class MockBankClient {
  async executePayment(payload: MockBankPayload): Promise<MockBankResponse> {
    if (payload.transaction_ref.startsWith("fail_")) {
      return {
        bank_reference: `bnk_${payload.transaction_ref}`,
        transaction_status: "REJECTED",
      };
    }

    if (payload.transaction_ref.startsWith("pending_")) {
      return {
        bank_reference: `bnk_${payload.transaction_ref}`,
        transaction_status: "IN_REVIEW",
      };
    }

    return {
      bank_reference: `bnk_${payload.transaction_ref}`,
      transaction_status: "SETTLED",
    };
  }
}