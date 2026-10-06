import test from "node:test";
import assert from "node:assert/strict";
import { calculateTotal } from "../src/shared/calculateTotal.ts";
import { StockRepository } from "../src/inventory/StockRepository.ts";
import { database, resetDatabase } from "../src/database.ts";

test.beforeEach(() => {
  resetDatabase();
});

test("calculateTotal is pure: does not mutate lines and calculates correctly", () => {
  const inputLines = [
    { productId: "item-1", unitPrice: 100, quantity: 2 },
    { productId: "item-2", unitPrice: 50, quantity: 1 },
  ];
  const linesSnapshot = JSON.stringify(inputLines);

  const total = calculateTotal(inputLines, { taxRate: 0.2, discountPercent: 10 });
  
  // Перевірка збереження оригінального масиву (відсутність мутацій)
  assert.equal(JSON.stringify(inputLines), linesSnapshot);
  // (200 + 50) * 0.9 * 1.2 = 250 * 0.9 * 1.2 = 225 * 1.2 = 270
  assert.equal(total, 270);
});

test("StockRepository.reserve atomic behavior: rejects without partial updates", () => {
  const stock = new StockRepository();
  database.stock.set("item-a", { productId: "item-a", available: 10 });
  database.stock.set("item-b", { productId: "item-b", available: 2 });

  // Спроба списати 5 шт item-a (є в наявності) і 5 шт item-b (не вистачає)
  assert.throws(
    () => {
      stock.reserve([
        { productId: "item-a", quantity: 5 },
        { productId: "item-b", quantity: 5 },
      ]);
    },
    /Insufficient stock for item-b/,
  );

  // Переконуємось, що item-a НЕ списався частково
  assert.equal(database.stock.get("item-a")?.available, 10);
  assert.equal(database.stock.get("item-b")?.available, 2);
});