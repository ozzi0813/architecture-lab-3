import { normalizePaymentStatus, type NormalizedPaymentStatus } from "../payments/index.ts";

export function mapPaymentStatus(response: { state?: string }): NormalizedPaymentStatus {
  return normalizePaymentStatus(response?.state);
}