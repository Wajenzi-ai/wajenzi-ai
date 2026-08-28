import { describe, expect, it } from "vitest";
import { simulateRfqNotifications, transitionRfqNotification } from "./rfqNotifications";

describe("simulated RFQ notifications", () => {
  it("creates delivered supplier notifications with the RFQ context", () => {
    const notifications = simulateRfqNotifications({ rfqRef: "PR-2408-71", title: "Structural concrete", value: "KES 426,000" }, "2026-08-23T12:00:00.000Z");

    expect(notifications).toHaveLength(3);
    expect(notifications.map((notification) => notification.recipientName)).toEqual(["Atlas Hardware", "BuildOps Africa", "Wajenzi Stores"]);
    expect(notifications.every((notification) => notification.status === "delivered")).toBe(true);
    expect(notifications[0]).toMatchObject({ rfqRef: "PR-2408-71", title: "Structural concrete", value: "KES 426,000" });
  });

  it("advances an RFQ supplier alert from delivered to quotation ready without changing its source context", () => {
    const notification = simulateRfqNotifications({ rfqRef: "PR-2408-68", title: "D12 reinforcement", value: "KES 312,500" })[0];
    const acknowledged = transitionRfqNotification(notification, "acknowledged");
    const quotationReady = transitionRfqNotification(acknowledged, "quotation_ready");

    expect(quotationReady).toMatchObject({ id: notification.id, rfqRef: "PR-2408-68", title: "D12 reinforcement", status: "quotation_ready" });
  });
});
