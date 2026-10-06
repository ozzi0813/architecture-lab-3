import { database } from "../database.ts";
import type { CartLine } from "../shared/calculateTotal.ts";
import { StockRepository } from "../inventory/StockRepository.ts";
import { PaymentService, type PaymentRequest } from "../payments/index.ts";

export class OrderService {
  private readonly payments: PaymentService;
  private readonly stockRepository: StockRepository;

  constructor(
    payments = new PaymentService(),
    stockRepository = new StockRepository(),
  ) {
    this.payments = payments;
    this.stockRepository = stockRepository;
  }

  async placeOrder(
    orderId: string,
    lines: CartLine[],
    total: number,
    paymentToken: string,
    currency: string,
  ) {
    this.stockRepository.reserve(
      lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    );

    database.orders.set(orderId, { id: orderId, status: "created", total });

    const paymentResult = await this.payments.charge({
      orderId,
      paymentToken,
      amount: total,
      currency,
    });

    const order = database.orders.get(orderId)!;
    order.paymentStatus = paymentResult.status;
    order.status = paymentResult.status === "paid" ? "confirmed" : "payment_pending";

    return { ...order };
  }
}