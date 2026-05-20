"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export function CapacitorBackButtonHandler() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let initialPath = window.location.pathname;

    const listener = App.addListener("backButton", ({ canGoBack }) => {
      const currentPath = window.location.pathname;

      if (canGoBack && currentPath !== initialPath) {
        window.history.back();
        return;
      }

      if (currentPath !== "/") {
        window.location.assign("/");
        return;
      }

      App.exitApp();
    });

    return () => {
      listener.then((handle) => handle.remove()).catch(() => undefined);
    };
  }, []);

  return null;
}
