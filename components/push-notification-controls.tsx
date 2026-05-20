"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(normalized);

  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PushNotificationControls() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [iosRequiresInstall, setIosRequiresInstall] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);
    setIosRequiresInstall(isIos() && !isStandalone());

    let isMounted = true;
    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (isMounted) {
          setHasSubscription(Boolean(subscription));
        }
      })
      .catch(() => {
        if (isMounted) {
          setMessage("Alerts are available, but this browser could not load the current subscription.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void fetch("/api/push/public-key")
      .then((response) => response.json())
      .then((payload: { publicKey?: string }) => {
        if (isMounted && payload.publicKey) {
          setPublicKey(payload.publicKey);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  if (!publicKey || permission === "unsupported") {
    return null;
  }

  async function handleEnable() {
    if (iosRequiresInstall) {
      setMessage("On iPhone, install the app to Home Screen first, then enable alerts from the installed app.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        setMessage("Alert permission was not granted.");
        return;
      }

      if (!publicKey) {
        throw new Error("Alerts are not configured yet.");
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: window.navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Unable to save alert subscription.");
      }

      setHasSubscription(true);
      setMessage("Alerts enabled for this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to enable alerts.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDisable() {
    setIsBusy(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });
        await subscription.unsubscribe();
      }

      setHasSubscription(false);
      setMessage("Alerts disabled for this device.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to disable alerts.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleTest() {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Unable to send test alert.");
      }

      setMessage("Test alert sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send test alert.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="push-controls">
      <div className="push-control-row">
        <button
          className={`button-link ${hasSubscription ? "ghost" : "secondary"}`}
          type="button"
          onClick={hasSubscription ? handleDisable : handleEnable}
          disabled={isBusy}
        >
          {hasSubscription ? "Disable Alerts" : "Enable Alerts"}
        </button>
        {hasSubscription ? (
          <button className="button-link ghost" type="button" onClick={handleTest} disabled={isBusy}>
            Send Test Alert
          </button>
        ) : null}
      </div>
      <p className="meta push-controls-meta">
        {iosRequiresInstall
          ? "iPhone requires the installed Home Screen app before alerts can be enabled."
          : hasSubscription
            ? "This device is subscribed to assignments, proof updates, reminders, and coach/admin alerts."
            : "Enable alerts for assignments, proof updates, reminders, and coach/admin alerts."}
      </p>
      {message ? <p className="meta push-controls-message">{message}</p> : null}
    </div>
  );
}
