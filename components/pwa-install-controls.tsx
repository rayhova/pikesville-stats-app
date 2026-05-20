"use client";

import { useEffect, useMemo, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

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

function isSamsungBrowser() {
  if (typeof window === "undefined") {
    return false;
  }

  return /SamsungBrowser/i.test(window.navigator.userAgent);
}

function isChromeBrowser() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent;
  return /Chrome|CriOS/i.test(userAgent) && !/Edg|SamsungBrowser|OPR|Opera/i.test(userAgent);
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

export function PwaInstallControls() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isSamsung, setIsSamsung] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());
    setIsIos(isIosDevice());
    setIsAndroid(isAndroidDevice());
    setIsSamsung(isSamsungBrowser());
    setIsChrome(isChromeBrowser());

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

  const iosHint = useMemo(() => {
    if (!isIos || isStandalone) {
      return null;
    }

    return "On iPhone: tap Share, then Add to Home Screen.";
  }, [isIos, isStandalone]);

  const androidHint = useMemo(() => {
    if (!isAndroid || isStandalone) {
      return null;
    }

    if (isSamsung) {
      return "Samsung Internet: use Menu, then Add page to, then Apps screen. If Play Protect appears, tap Install anyway.";
    }

    if (isChrome) {
      return deferredPrompt
        ? "Chrome should let you install the app directly from the button below."
        : "Chrome may not show an install prompt. Use the browser menu and look for Install app. If you only see Add to Home screen, use the help steps below.";
    }

    return "On Android: open the browser menu, then tap Install app or Add to Home screen.";
  }, [deferredPrompt, isAndroid, isChrome, isSamsung, isStandalone]);

  const showInstallHelp = !isStandalone && (isIos || isAndroid);

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

  if (isStandalone) {
    return <p className="meta pwa-meta">Installed app mode active.</p>;
  }

  if (!deferredPrompt && !iosHint && !androidHint) {
    return null;
  }

  return (
    <div className="pwa-install-row">
      {deferredPrompt ? (
        <button className="button-link ghost" type="button" onClick={handleInstall} disabled={isInstalling}>
          {isInstalling ? "Opening..." : "Install App"}
        </button>
      ) : null}
      {iosHint ? <p className="meta pwa-meta">{iosHint}</p> : null}
      {androidHint ? <p className="meta pwa-meta">{androidHint}</p> : null}
      {showInstallHelp ? (
        <details className="pwa-help">
          <summary className="pwa-help-summary">Install Help</summary>
          <div className="pwa-help-body">
            {isChrome ? (
              <div className="pwa-help-block">
                <strong>Chrome on Android</strong>
                <ol>
                  <li>Open the browser menu.</li>
                  <li>Tap <strong>Install app</strong> if it appears.</li>
                  <li>If Chrome does not show that option, tap <strong>Add to Home screen</strong>.</li>
                  <li>Reopen the shortcut from your home screen and use that as the app entry point.</li>
                </ol>
              </div>
            ) : null}
            {isSamsung ? (
              <div className="pwa-help-block">
                <strong>Samsung Internet</strong>
                <ol>
                  <li>Open the browser menu.</li>
                  <li>Tap <strong>Add page to</strong>.</li>
                  <li>Choose <strong>Apps screen</strong>.</li>
                  <li>If Play Protect warns you, tap <strong>Install anyway</strong>.</li>
                </ol>
              </div>
            ) : null}
            {isIos ? (
              <div className="pwa-help-block">
                <strong>iPhone / iPad</strong>
                <ol>
                  <li>Tap the <strong>Share</strong> button in Safari.</li>
                  <li>Choose <strong>Add to Home Screen</strong>.</li>
                  <li>Open the installed app from your home screen.</li>
                  <li>For alerts, enable them from the installed app, not the browser tab.</li>
                </ol>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
