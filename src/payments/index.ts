import { StripeClient } from "./internal/StripeClient.ts";
import { normalizePaymentStatus, type NormalizedPaymentStatus } from "./normalizePaymentStatus.ts";

export { normalizePaymentStatus };
export type { NormalizedPaymentStatus };

export type PaymentRequest = {
  paymentToken: string;
  amount: number;
  currency: string;
  orderId: string;
};

export type PaymentResult = {
  paymentId: string;
  status: NormalizedPaymentStatus;
};

export class PaymentService {
  private readonly stripe: StripeClient;

  constructor(stripe = new StripeClient()) {
    this.stripe = stripe;
  }

  async charge(request: PaymentRequest): Promise<PaymentResult> {
    const stripeResponse = await this.stripe.createCharge({
      id: request.paymentToken,
      amount: Math.round(request.amount * 100),
      currency: request.currency,
      metadata: { orderId: request.orderId },
    });

    return {
      paymentId: stripeResponse.charge_id,
      status: normalizePaymentStatus(stripeResponse.state),
    };
  }
}