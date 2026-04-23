/**
 * Persistent device identifier for offline check-in attribution.
 */

const DEVICE_ID_KEY = "gymflow_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";

  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
