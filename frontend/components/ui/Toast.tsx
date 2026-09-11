"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss
    timerRef.current = setTimeout(() => handleDismiss(), toast.duration ?? 4500);
    return () => {
      clearTimeout(enterTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleDismiss, toast.duration]);

  const styles: Record<ToastVariant, { border: string; bg: string; icon: string; text: string }> = {
    success: {
      border: "border-[#2EE6A8]/40",
      bg: "bg-[#2EE6A8]/10",
      icon: "text-[#2EE6A8]",
      text: "text-[#2EE6A8]",
    },
    error: {
      border: "border-[#F5484A]/40",
      bg: "bg-[#F5484A]/10",
      icon: "text-[#F5484A]",
      text: "text-[#F5484A]",
    },
    warning: {
      border: "border-[#F5B841]/40",
      bg: "bg-[#F5B841]/10",
      icon: "text-[#F5B841]",
      text: "text-[#F5B841]",
    },
    info: {
      border: "border-[#8993A6]/30",
      bg: "bg-[#1A1F2B]",
      icon: "text-[#8993A6]",
      text: "text-[#E8ECF1]",
    },
  };

  const s = styles[toast.variant];

  const icons: Record<ToastVariant, React.ReactNode> = {
    success: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      className={`
        flex items-start gap-3 w-full max-w-sm px-4 py-3 rounded-xl border shadow-2xl
        backdrop-blur-sm font-sans transition-all duration-300
        ${s.border} ${s.bg}
        ${visible && !exiting
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2 pointer-events-none"
        }
      `}
      role="alert"
      aria-live="assertive"
    >
      <span className={`mt-0.5 ${s.icon}`}>{icons[toast.variant]}</span>
      <p className={`flex-1 text-sm leading-snug ${s.text}`}>{toast.message}</p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 ml-1 text-[#8993A6] hover:text-[#E8ECF1] transition-colors p-0.5 rounded"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "info", duration = 4500) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, variant, duration }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Stack — bottom-right on desktop, bottom-center on mobile */}
      <div
        aria-label="Notifications"
        className="fixed bottom-6 right-4 sm:right-6 z-[200] flex flex-col gap-2.5 items-end pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full sm:w-auto">
            <ToastItem toast={t} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
