# Architecture review

> Заповнює студент. Не описуйте лише назву принципу: покажіть причинно-наслідковий зв'язок між кодом, ризиком і виправленням.

| Principle | Evidence (file:line) | Practical risk | Fix |
|---|---|---|---|
| Local reasoning | `src/shared/calculateTotal.ts` | Функція залежить від глобального конфігу `config.ts`, змінює вхідний об'єкт `lines` (мутація) та виконує побічний ефект (запис в аудит-лог). Результат неможливо перевірити ізольовано в тестах без налаштування глобального стану. | Зробити функцію чистою (pure function): передавати ставки податків та знижок як явні аргументи, повертати розраховану суму без мутації вхідних даних, а логування винести на рівень orchestration. |
| High cohesion / Duplication | `src/orders/mapPaymentStatus.ts`, `src/reports/mapPaymentStatus.ts`, `src/notifications/mapPaymentStatus.ts` | Мапінг статусів стороннього провайдера продубльовано у трьох різних модулях. Додавання нового статусу `processing` вимагатиме одночасного синхронного оновлення трьох місць, де легко допустити розбіжність або забути один із модулів. | Створити єдине джерело істини для нормалізації статусів всередині модуля `src/payments/`, повертаючи назовні єдиний доменний enum/тип, а дублікати файлів видалити. |
| Information hiding | `src/payments/internal/StripeClient.ts` | Деталі реалізації Stripe (специфічні payload, заголовки та формати відповідей) імпортуються напряму в зовнішні модулі замість приховування за публічним контрактом. | Створити стабільний публічний інтерфейс/фасад `src/payments/index.ts`, який інкапсулює Stripe усередині та не випускає `payments/internal` назовні. |
| Ownership | `src/orders/OrderService.ts` звертається до `src/inventory/StockRepository.ts` | Модуль `Orders` напряму маніпулює записами сховища складу в обхід доменної логіки `Inventory`. `Inventory` втрачає контроль над інваріантом `available >= 0`, що може спричинити від'ємні залишки або стан гонитви. | Реалізувати в модулі `Inventory` метод резервування (наприклад, `reserve()`), який атомарно перевіряє наявність і змінює залишок, заборонивши іншим модулям прямий доступ до `StockRepository`. |
| Dependency direction | `src/payments/internal/StripeClient.ts` викликає `src/orders/internal/orderMutations.ts` | Виникає циклічна залежність між `Orders` та `Payments`. Модуль нижчого/допоміжного рівня (`Payments`) знає про внутрішній стан замовлень, що унеможливлює його ізольоване тестування чи подальше винесення в окремий сервіс. | Розірвати цикл: залежність має бути однонаправленою (`Orders/Checkout -> Payments`). `Payments` повертає лише результат операції, а стан замовлення оновлює сам `Orders`. |

## Change impact prediction (заповнити до реалізації change request)

**Requirement:**
Підтримати другого навчального payment provider та новий нормалізований статус `processing`. Забезпечити стабільність публічного Checkout API для статусів `paid` та `failed` без витоку деталей провайдера за межі модуля Payments.

**Expected files:**
1. `src/payments/normalizeStatus.ts` (або `src/payments/index.ts` — новий централізований мапінг статусів).
2. `src/payments/types.ts` (доменні типи для статусів: `paid`, `processing`, `failed`, `unknown`).
3. `src/orders/mapPaymentStatus.ts` (заміна локальної логіки на використання публічного контракту `Payments`).
4. `src/reports/mapPaymentStatus.ts` (перехід на контракт `Payments`).
5. `src/notifications/mapPaymentStatus.ts` (перехід на контракт `Payments`).
6. `test/payments.test.ts` (нові unit-тести для перевірки нормалізації 4 статусів).

**Modules that should not change:**
- `src/checkout/CheckoutController.ts` (зовнішній API та поведінка існуючих сценаріїв `paid`/`failed` залишаються стабільними).
- `src/inventory/` (правила перевірки й обліку залишків товарів не залежать від появи статусу `processing`).
- `src/shared/calculateTotal.ts` (математичний розрахунок вартості товарів не залежить від вибору платіжного провайдера).

## Actual impact (заповнити після реалізації)

**Actual files changed:**

**Difference from prediction and explanation:**