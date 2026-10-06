export type NormalizedPaymentStatus = "paid" | "processing" | "failed" | "unknown";

export function normalizePaymentStatus(status: unknown): NormalizedPaymentStatus {
  if (typeof status !== "string") {
    return "unknown";
  }

  const normalized = status.toLowerCase().trim();

  if (normalized === "succeeded" || normalized === "paid") {
    return "paid";
  }

  if (normalized === "processing" || normalized === "requires_action" || normalized === "pending") {
    return "processing";
  }

  if (normalized === "declined" || normalized === "failed") {
    return "failed";
  }

  return "unknown";
}