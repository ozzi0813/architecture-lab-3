import { database } from "../database.ts";

export type ReserveItem = {
  productId: string;
  quantity: number;
};

export class StockRepository {
  find(productId: string) {
    return database.stock.get(productId);
  }

  reserve(items: readonly ReserveItem[]): void {
    for (const item of items) {
      const row = database.stock.get(item.productId);
      if (!row || row.available < item.quantity) {
        throw new Error(`Insufficient stock for ${item.productId}`);
      }
    }

    for (const item of items) {
      const row = database.stock.get(item.productId)!;
      database.stock.set(item.productId, {
        productId: item.productId,
        available: row.available - item.quantity,
      });
    }
  }
}