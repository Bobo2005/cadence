"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface CookiePreferences {
  hasConsented: boolean;
  strictlyNecessary: true;
  sentinelTelemetry: boolean;
  functionalPreferences: boolean;
  timestamp: number;
}

interface CookieContextType {
  preferences: CookiePreferences;
  isMounted: boolean;
  isPreferencesModalOpen: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  saveCustom: (prefs: { sentinelTelemetry: boolean; functionalPreferences: boolean }) => void;
  openPreferencesModal: () => void;
  closePreferencesModal: () => void;
}

const STORAGE_KEY = "cadence_cookie_consent_v1";

const DEFAULT_PREFERENCES: CookiePreferences = {
  hasConsented: false,
  strictlyNecessary: true,
  sentinelTelemetry: false,
  functionalPreferences: false,
  timestamp: 0,
};

const CookieContext = createContext<CookieContextType>({
  preferences: DEFAULT_PREFERENCES,
  isMounted: false,
  isPreferencesModalOpen: false,
  acceptAll: () => {},
  rejectNonEssential: () => {},
  saveCustom: () => {},
  openPreferencesModal: () => {},
  closePreferencesModal: () => {},
});

export function CookieProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
  const [isMounted, setIsMounted] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CookiePreferences;
        if (parsed && typeof parsed.hasConsented === "boolean") {
          setPreferences({
            hasConsented: parsed.hasConsented,
            strictlyNecessary: true,
            sentinelTelemetry: Boolean(parsed.sentinelTelemetry),
            functionalPreferences: Boolean(parsed.functionalPreferences),
            timestamp: parsed.timestamp || Date.now(),
          });
        }
      }
    } catch {
      // Ignore localStorage errors or blocked access
    }
  }, []);

  const saveToStorage = (updated: CookiePreferences) => {
    setPreferences(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore localStorage write failures
    }
  };

  const acceptAll = () => {
    const updated: CookiePreferences = {
      hasConsented: true,
      strictlyNecessary: true,
      sentinelTelemetry: true,
      functionalPreferences: true,
      timestamp: Date.now(),
    };
    saveToStorage(updated);
    setIsPreferencesModalOpen(false);
  };

  const rejectNonEssential = () => {
    const updated: CookiePreferences = {
      hasConsented: true,
      strictlyNecessary: true,
      sentinelTelemetry: false,
      functionalPreferences: false,
      timestamp: Date.now(),
    };
    saveToStorage(updated);
    setIsPreferencesModalOpen(false);
  };

  const saveCustom = (prefs: { sentinelTelemetry: boolean; functionalPreferences: boolean }) => {
    const updated: CookiePreferences = {
      hasConsented: true,
      strictlyNecessary: true,
      sentinelTelemetry: prefs.sentinelTelemetry,
      functionalPreferences: prefs.functionalPreferences,
      timestamp: Date.now(),
    };
    saveToStorage(updated);
    setIsPreferencesModalOpen(false);
  };

  const openPreferencesModal = () => setIsPreferencesModalOpen(true);
  const closePreferencesModal = () => setIsPreferencesModalOpen(false);

  return (
    <CookieContext.Provider
      value={{
        preferences,
        isMounted,
        isPreferencesModalOpen,
        acceptAll,
        rejectNonEssential,
        saveCustom,
        openPreferencesModal,
        closePreferencesModal,
      }}
    >
      {children}
    </CookieContext.Provider>
  );
}

export function useCookieConsent() {
  return useContext(CookieContext);
}
