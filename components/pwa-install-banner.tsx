"use client";

import { useEffect, useMemo, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

const DISMISS_KEY = "pikesville-pwa-install-banner-dismissed-at";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function isIosDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isAndroidDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  return /android/i.test(window.navigator.userAgent);
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  );
}

function hasRecentDismissal() {
  if (typeof window === "undefined") {
    return false;
  }

  const dismissedAt = window.localStorage.getItem(DISMISS_KEY);
  if (!dismissedAt) {
    return false;
  }

  const dismissedAtMs = Number.parseInt(dismissedAt, 10);
  if (!Number.isFinite(dismissedAtMs)) {
    return false;
  }

  return Date.now() - dismissedAtMs < DISMISS_FOR_MS;
}

function dismissBanner() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DISMISS_KEY, Date.now().toString());
}

export function PwaInstallBanner() {
  const [ready, setReady] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    setReady(true);
    setIsStandalone(isStandaloneDisplay());
    setIsIos(isIosDevice());
    setIsAndroid(isAndroidDevice());
    setIsDismissed(hasRecentDismissal());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const message = useMemo(() => {
    if (isIos) {
      return "Install the app for faster access and alerts. In Safari, tap Share and then Add to Home Screen.";
    }

    if (isAndroid) {
      if (deferredPrompt) {
        return "Install the app for faster access and alerts.";
      }

      return "Install the app for faster access and alerts. Use your browser menu and choose Install app or Add to Home screen.";
    }

    return null;
  }, [deferredPrompt, isAndroid, isIos]);

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    setIsInstalling(true);
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => undefined);
    setDeferredPrompt(null);
    setIsInstalling(false);
  }

  function handleDismiss() {
    dismissBanner();
    setIsDismissed(true);
  }

  if (!ready || isStandalone || isDismissed || !message) {
    return null;
  }

  return (
    <aside className="install-banner card" aria-label="Install app banner">
      <div className="install-banner-copy">
        <p className="eyebrow-label">Install App</p>
        <h2>Pikesville MBB Works Best Installed</h2>
        <p>{message}</p>
      </div>
      <div className="install-banner-actions">
        {deferredPrompt ? (
          <button className="button-link secondary" type="button" onClick={handleInstall} disabled={isInstalling}>
            {isInstalling ? "Opening..." : "Install App"}
          </button>
        ) : null}
        <button className="button-link ghost" type="button" onClick={handleDismiss}>
          Not Now
        </button>
      </div>
    </aside>
  );
}
