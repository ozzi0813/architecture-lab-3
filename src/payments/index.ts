import { StripeClient } from "./internal/StripeClient.ts";
import { MockBankClient } from "./internal/MockBankClient.ts";
import { normalizePaymentStatus, type NormalizedPaymentStatus } from "./normalizePaymentStatus.ts";

export { normalizePaymentStatus };
export type { NormalizedPaymentStatus };

export type PaymentRequest = {
  paymentToken: string;
  amount: number;
  currency: string;
  orderId: string;
  provider?: "stripe" | "mockbank";
};

export type PaymentResult = {
  paymentId: string;
  status: NormalizedPaymentStatus;
};

export interface PaymentProviderAdapter {
  processPayment(request: PaymentRequest): Promise<PaymentResult>;
}

class StripeAdapter implements PaymentProviderAdapter {
  private readonly client: StripeClient;

  constructor(client: StripeClient = new StripeClient()) {
    this.client = client;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    const res = await this.client.createCharge({
      id: request.paymentToken,
      amount: Math.round(request.amount * 100),
      currency: request.currency,
      metadata: { orderId: request.orderId },
    });
    return {
      paymentId: res.charge_id,
      status: normalizePaymentStatus(res.state),
    };
  }
}

class MockBankAdapter implements PaymentProviderAdapter {
  private readonly client: MockBankClient;

  constructor(client: MockBankClient = new MockBankClient()) {
    this.client = client;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    const res = await this.client.executePayment({
      transaction_ref: request.paymentToken,
      total_minor_units: Math.round(request.amount * 100),
      iso_currency: request.currency,
      client_order_number: request.orderId,
    });
    return {
      paymentId: res.bank_reference,
      status: normalizePaymentStatus(res.transaction_status),
    };
  }
}

export class PaymentService {
  private readonly adapters: Record<string, PaymentProviderAdapter>;

  constructor(stripeClient?: StripeClient, mockBankClient?: MockBankClient) {
    this.adapters = {
      stripe: new StripeAdapter(stripeClient),
      mockbank: new MockBankAdapter(mockBankClient),
    };
  }

  async charge(request: PaymentRequest): Promise<PaymentResult> {
    const providerName = request.provider ?? "stripe";
    const adapter = this.adapters[providerName];
    if (!adapter) {
      throw new Error(`Unsupported payment provider: ${providerName}`);
    }
    return adapter.processPayment(request);
  }
}