"use client";

import React, { useState } from "react";

export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  defaultExpandedId?: string;
  allowMultiple?: boolean;
}

export default function Accordion({
  items,
  defaultExpandedId,
  allowMultiple = false,
}: AccordionProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>(
    defaultExpandedId ? [defaultExpandedId] : []
  );

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      return allowMultiple ? [...prev, id] : [id];
    });
  };

  return (
    <div className="space-y-3 font-sans">
      {items.map((item) => {
        const isExpanded = expandedIds.includes(item.id);
        return (
          <div
            key={item.id}
            className="rounded-2xl bg-white border border-[#E8EAED] hover:border-[#D9DCE1] transition-all overflow-hidden shadow-2xs"
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
            >
              <div className="text-sm sm:text-base font-bold text-[#111111]">{item.title}</div>
              <svg
                className={`w-4 h-4 text-[#8A8F98] transition-transform duration-200 shrink-0 ${
                  isExpanded ? "rotate-180 text-[#111111]" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="px-4 pb-5 sm:px-5 border-t border-[#F1F3F5] pt-3 text-xs sm:text-sm text-[#5F6368] leading-relaxed animate-in fade-in duration-150">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
