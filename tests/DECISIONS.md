# Architectural Decision Log

## ADR-001: Centralized Payment Status Normalization

- **Problem:** Мапінг статусів провайдера дублювався у трьох модулях (`orders`, `notifications`, `reports`), при цьому модулі напряму залежали від внутрішньої структури `StripeResponse`.
- **Evidence:** `src/orders/mapPaymentStatus.ts`, `src/notifications/mapPaymentStatus.ts`, `src/reports/mapPaymentStatus.ts`.
- **Decision:** Створити функцію `normalizePaymentStatus` всередині модуля `payments` як єдине джерело істини та експортувати нормалізовані статуси (`paid`, `processing`, `failed`, `unknown`).
- **Why:** Локалізує знання про сторонні протоколи всередині модуля `payments`, запобігає розходженню статусів у системі при додаванні нових провайдерів.
- **Alternative:** Залишити мапінг у модулях-споживачах і оновлювати кожен вручну.
- **Why rejected:** Високий ризик помилок розсинхронізації бізнес-логіки при додаванні нових провайдерів.
- **Trade-off:** Додатковий шар перетворення даних на межі модуля `payments`.
- **Verification:** Unit-тести `tests/payments.test.ts` перевіряють усі 4 стани.

---

## ADR-002: Safe Handling of Unrecognized Payment Statuses

- **Problem:** Поява невідомого або пошкодженого статусу від стороннього платіжного шлюзу може призвести до некоректного завершення або неочікуваного падіння системи.
- **Evidence:** Функція `mapPaymentStatus` за замовчуванням повертала `"failed"` для будь-якого непередбаченого значення.
- **Decision:** Ввести явний стан `"unknown"` для нерозпізнаних відповідей та обробляти його як нетермінальний стан із безпечною поведінкою за замовчуванням.
- **Why:** Гарантує fail-safe поведінку: система не позначає замовлення помилково відхиленим або оплаченим без фактичного підтвердження.
- **Alternative:** Викидати необроблену виняткову ситуацію (`throw new Error`).
- **Why rejected:** Помилка зупинить виконання процесу обробки checkout.
- **Trade-off:** Потребує явної обробки гілки `unknown` у споживачах результату.
- **Verification:** Тест `should return unknown for unrecognized or malformed statuses` у `tests/payments.test.ts`.

---

## AI Review

- **One useful suggestion:** Використання єдиного словника відповідності статусів на межі модуля `payments` для безболісного підключення другого провайдера без змін доменних сервісів.
- **One rejected suggestion:** Пропозиція побудувати складну динамічну фабрику адаптерів через декоратори/рефлексію — відхилена як надмірне ускладнення (overengineering) для двох локальних адаптерів.
- **Verification method:** Локальний запуск повного набору тестів за допомогою команди `npm test`.