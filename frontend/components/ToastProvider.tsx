"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type ToastType = "success" | "info" | "warning" | "error";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  txHash?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastItem, "id">) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem = { ...toast, id };
      setToasts((prev) => [...prev, item]);
      return id;
    },
    []
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Floating Toast Container */}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const { title, description, txHash, type = "info", duration = 6000 } = toast;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onDismiss]);

  const borderColor =
    type === "success"
      ? "border-[#2EE6A8]"
      : type === "warning"
      ? "border-[#F5B841]"
      : type === "error"
      ? "border-[#F5484A]"
      : "border-[#8993A6]";

  const glowColor =
    type === "success"
      ? "shadow-[0_0_16px_rgba(46,230,168,0.15)]"
      : type === "warning"
      ? "shadow-[0_0_16px_rgba(245,184,65,0.15)]"
      : type === "error"
      ? "shadow-[0_0_16px_rgba(245,72,74,0.15)]"
      : "shadow-[0_0_16px_rgba(35,40,56,0.5)]";

  const icon =
    type === "success" ? "✓" : type === "warning" ? "⚡" : type === "error" ? "✕" : "ℹ";

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-2xl bg-[#12161F] border ${borderColor} p-4 text-[#E8ECF1] shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom-3 ${glowColor}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
              type === "success"
                ? "bg-[#2EE6A8]/20 text-[#2EE6A8]"
                : type === "warning"
                ? "bg-[#F5B841]/20 text-[#F5B841]"
                : type === "error"
                ? "bg-[#F5484A]/20 text-[#F5484A]"
                : "bg-[#232838] text-[#8993A6]"
            }`}
          >
            {icon}
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold tracking-tight text-[#E8ECF1]">{title}</h4>
            {description && <p className="text-[11px] text-[#8993A6] leading-relaxed">{description}</p>}

            {txHash && (
              <div className="pt-1.5">
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#2EE6A8] hover:underline bg-[#2EE6A8]/10 px-2 py-0.5 rounded border border-[#2EE6A8]/30 transition-colors"
                >
                  <span>Sepolia: {txHash.slice(0, 8)}...{txHash.slice(-6)}</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-[#8993A6] hover:text-[#E8ECF1] text-xs p-1 rounded hover:bg-[#1E2330] transition-colors"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>

      {/* Countdown Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E2330]">
        <div
          className={`h-full transition-all duration-75 ${
            type === "success"
              ? "bg-[#2EE6A8]"
              : type === "warning"
              ? "bg-[#F5B841]"
              : type === "error"
              ? "bg-[#F5484A]"
              : "bg-[#8993A6]"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
