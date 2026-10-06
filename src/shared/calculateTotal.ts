export type CartLine = {
  productId: string;
  unitPrice: number;
  quantity: number;
  lineTotal?: number;
};

export type PricingOptions = {
  taxRate: number;
  discountPercent: number;
};

export function calculateTotal(
  lines: readonly CartLine[],
  options: PricingOptions = { taxRate: 0.2, discountPercent: 0 },
): number {
  let subtotal = 0;

  for (const line of lines) {
    subtotal += line.unitPrice * line.quantity;
  }

  const discounted = subtotal * (1 - options.discountPercent / 100);
  const total = Number((discounted * (1 + options.taxRate)).toFixed(2));
  return total;
}