"use client";

import React from "react";
import Link from "next/link";
import CadenceLogo from "./CadenceLogo";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  external?: boolean;
}

export interface SidebarProps {
  overviewItems: NavItem[];
  systemItems: NavItem[];
  activeId?: string;
  className?: string;
}

export default function Sidebar({
  overviewItems,
  systemItems,
  activeId,
  className = "",
}: SidebarProps) {
  return (
    <aside
      className={`w-64 shrink-0 bg-white border-r border-[#E8EAED] p-6 hidden md:flex flex-col justify-between font-sans ${className}`}
    >
      <div className="space-y-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-[#F7F8FA] border border-[#E8EAED]">
            <CadenceLogo size={22} showWordmark={false} />
          </div>
          <span className="text-base font-bold tracking-tight text-[#111111]">
            CADENCE
          </span>
        </Link>

        {/* Section: OVERVIEW */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider px-3">
            OVERVIEW
          </div>
          <nav className="space-y-1">
            {overviewItems.map((item) => {
              const isActive = activeId === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                    isActive
                      ? "bg-[#F0ECFF] text-[#111111] font-semibold"
                      : "text-[#5F6368] hover:text-[#111111] hover:bg-[#F7F8FA] font-medium"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? "bg-[#7C5CFF]" : "bg-transparent"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Section: SYSTEM */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-[#8A8F98] uppercase tracking-wider px-3">
            SYSTEM
          </div>
          <nav className="space-y-1">
            {systemItems.map((item) => {
              const isActive = activeId === item.id;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                    isActive
                      ? "bg-[#F0ECFF] text-[#111111] font-semibold"
                      : "text-[#5F6368] hover:text-[#111111] hover:bg-[#F7F8FA] font-medium"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? "bg-[#7C5CFF]" : "bg-transparent"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="pt-6 border-t border-[#E8EAED] text-xs text-[#8A8F98] font-mono">
        <div>CADENCE PROTOCOL v1.0</div>
        <div className="mt-1 text-[11px] text-[#22A06B] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22A06B]" />
          HEALTHY HEARTBEAT
        </div>
      </div>
    </aside>
  );
}
