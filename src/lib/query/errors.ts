import { notFound } from "@tanstack/react-router";
import { toast } from "sonner";

/** Turns any thrown value into a readable message. */
export function describeError(error: unknown, fallback = "Ndodhi një gabim i papritur."): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && "message" in (error as Record<string, unknown>)) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg) return msg;
  }
  return fallback;
}

/** Standard error toast for mutations and imperative actions. */
export function notifyError(error: unknown, fallback?: string): void {
  toast.error(describeError(error, fallback));
}

/** Throws a router notFound() when a required record is missing. */
export function requireRecord<T>(record: T | null | undefined): T {
  if (record == null) throw notFound();
  return record;
}
