"use client";

import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-full tracking-wide";

  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs font-mono",
    md: "px-6 py-3 text-xs sm:text-sm",
    lg: "px-8 py-4 text-sm sm:text-base font-bold",
  }[size];

  const variantStyles = {
    primary: "bg-[#111111] hover:bg-black text-white shadow-xs active:scale-[0.99]",
    secondary: "bg-[#F1F3F5] hover:bg-[#E8EAED] text-[#111111]",
    outline: "bg-white border border-[#D9DCE1] hover:border-[#AEB3BB] hover:bg-[#F7F8FA] text-[#111111]",
    danger: "bg-[#D64545] hover:bg-[#b83838] text-white shadow-xs",
    ghost: "bg-transparent hover:bg-[#F1F3F5] text-[#5F6368] hover:text-[#111111]",
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Processing...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="mr-2 inline-flex items-center">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="ml-2 inline-flex items-center">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
