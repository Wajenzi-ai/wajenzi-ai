import { useEffect, useState } from "react";

export type RfqNotificationStatus = "delivered" | "acknowledged" | "quotation_ready";

export type RfqNotification = {
  id: string;
  rfqRef: string;
  title: string;
  value: string;
  recipientName: string;
  recipientType: string;
  status: RfqNotificationStatus;
  sentAt: string;
};

type RfqDispatchInput = {
  rfqRef: string;
  title: string;
  value: string;
};

const STORAGE_KEY = "wajenzi-simulated-rfq-notifications-v1";
const CHANGE_EVENT = "wajenzi-rfq-notifications-updated";
const recipients = [
  ["Atlas Hardware", "Verified hardware supplier"],
  ["BuildOps Africa", "Structural materials supplier"],
  ["Wajenzi Stores", "Marketplace catalog supplier"],
] as const;

export function simulateRfqNotifications(input: RfqDispatchInput, sentAt = new Date().toISOString()): RfqNotification[] {
  return recipients.map(([recipientName, recipientType], index) => ({
    id: `${input.rfqRef}-${index + 1}`,
    rfqRef: input.rfqRef,
    title: input.title,
    value: input.value,
    recipientName,
    recipientType,
    status: "delivered",
    sentAt,
  }));
}

export function transitionRfqNotification(notification: RfqNotification, status: RfqNotificationStatus): RfqNotification {
  return { ...notification, status };
}

function readNotifications(): RfqNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as RfqNotification[] : [];
  } catch {
    return [];
  }
}

function writeNotifications(notifications: RfqNotification[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function dispatchSimulatedRfqNotifications(input: RfqDispatchInput): RfqNotification[] {
  const current = readNotifications();
  const existing = current.filter((notification) => notification.rfqRef === input.rfqRef);
  if (existing.length) return existing;
  const created = simulateRfqNotifications(input);
  writeNotifications([...created, ...current]);
  return created;
}

export function updateSimulatedRfqNotification(notificationId: string, status: RfqNotificationStatus) {
  const next = readNotifications().map((notification) => notification.id === notificationId ? transitionRfqNotification(notification, status) : notification);
  writeNotifications(next);
  return next;
}

export function useSimulatedRfqNotifications() {
  const [notifications, setNotifications] = useState<RfqNotification[]>([]);
  useEffect(() => {
    const sync = () => setNotifications(readNotifications());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);
  return { notifications, updateNotification: updateSimulatedRfqNotification };
}
