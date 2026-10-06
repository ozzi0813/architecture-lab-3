# Decision log

Для кожної суттєвої зміни скопіюйте секцію нижче. Обсяг одного рішення: 80–120 слів.

## Decision 1: Centralized payment status normalization

**Problem:** Мапінг статусів стороннього провайдера дублювався одночасно в трьох модулях (`orders`, `notifications`, `reports`), при цьому деталі зовнішнього API просочувалися в доменну логіку.

**Evidence:** `src/orders/mapPaymentStatus.ts`, `src/notifications/mapPaymentStatus.ts`, `src/reports/mapPaymentStatus.ts`.

**Decision:** Створити функцію `normalizePaymentStatus` всередині модуля `payments` як єдине авторитетне джерело істини та експортувати нормалізований доменний тип статусів (`paid`, `processing`, `failed`, `unknown`).

**Why:** Локалізує знання про зовнішній протокол всередині `payments`, усуває дублювання логіки та запобігає розходженню станів замовлення при додаванні нових провайдерів або проміжних статусів на зразок `processing`.

**Alternative:** Залишити мапінг у кожному модулі-споживачі окремо.

**Why rejected:** Створює ризик розсинхронізації поведінки системи під час оновлення зовнішніх інтеграцій.

**Trade-off:** Додатковий крок перетворення типів на межі модуля `payments`.

**Verification:** Unit-тести у `tests/payments.test.ts`.

## Decision 2: Safe handling of unrecognized payment statuses

**Problem:** Поява невідомого або пошкодженого статусу у відповіді провайдера призводила до непередбачуваної поведінки або дефолтного позначення операції як помилки.

**Evidence:** Функція `mapPaymentStatus` за замовчуванням повертала `"failed"` для будь-якого непередбаченого рядка.

**Decision:** Ввести обов'язковий детермінований статус `"unknown"` для нерозпізнаних відповідей та обробляти його як безпечний нейтральний стан.

**Why:** Забезпечує fail-safe поведінку: система не позначає замовлення остаточно відхиленим або успішно оплаченим без явного підтвердження від платіжного шлюзу.

**Alternative:** Викидати необроблену помилку (`throw new Error`).

**Why rejected:** Необроблений виняток аварійно перериває процес оформлення замовлення замість безпечного переходу в нетермінальний стан.

**Trade-off:** Вимагає від модулів-споживачів явної обробки додаткової гілки `unknown`.

**Verification:** Тест на обробку некоректних статусів у `tests/payments.test.ts`.

## Decision 3: Inventory encapsulation and invariant protection

**Problem:** Модуль `orders` безпосередньо змінював стан таблиці залишків `database.stock`, що порушувало принцип єдиного власника даних (Ownership) і загрожувало від'ємними залишками.

**Evidence:** Прямий виклик `database.stock.set` у методі `placeOrder` класу `src/orders/OrderService.ts`.

**Decision:** Інкапсулювати операцію зміни залишків у репозиторії `StockRepository` через метод `reserve(items)`, який попередньо валідує всі позиції перед списанням.

**Why:** Гарантує збереження інваріанту `available >= 0`: якщо хоча б одного товару недостатньо, операція відхиляється цілком без часткового списання інших товарів.

**Alternative:** Залишити прямий запис із `OrderService`, додавши туди блок обробки помилок і відкату.

**Why rejected:** Порушує принцип High Cohesion та розпорошує складську логіку по сторонніх бізнес-модулях.

**Trade-off:** Необхідність подвійного проходу по масиву товарів для попередньої валідації наявності.

**Verification:** Тест атомарної поведінки `StockRepository.reserve` у `tests/level75.test.ts`.

## Decision 4: Pure calculateTotal and decoupled payments contract

**Problem:** Функція `calculateTotal` читала глобальні змінні, мутувала вхідні дані та писала в логи, а платіжний клієнт мав циклічну залежність із модулем замовлень.

**Evidence:** `src/shared/calculateTotal.ts`, імпорт `orderMutations.ts` усередині `src/payments/internal/StripeClient.ts` та використання `StripePayload` у `CheckoutController.ts`.

**Decision:** Перетворити `calculateTotal` на чисту детерміновану функцію; винести логування на рівень виклику; сформувати вендор-нейтральний фасад `PaymentService.charge()`.

**Why:** Забезпечує Local reasoning (можливість ізольованого тестування без конфігурації globals) та розриває цикл залежностей між `orders` і `payments`.

**Alternative:** Залишити типи Stripe публічними, але додати шину подій (Event Bus).

**Why rejected:** Невиправдано ускладнює монолітну архітектуру без усунення витоку деталей провайдера.

**Trade-off:** Потребує явного передавання параметрів конфігурації у функцію розрахунку та створення нейтральних DTO.

**Verification:** Тест чистоти функції `calculateTotal is pure` у `tests/level75.test.ts` та успішне виконання `tests/checkout.functional.test.ts`.

## AI Review

- **One useful suggestion:** Відокремлення публічного фасаду `PaymentService` від деталей конкретного вендора за допомогою адаптера.
- **One rejected suggestion:** Пропозиція побудувати фабрику платіжних провайдерів через динамічний DI-контейнер з автореєстрацією — відхилена як надмірне ускладнення (overengineering).
- **Verification method:** Локальний запуск повної батареї тестів командою `npm test`.