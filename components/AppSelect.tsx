"use client";

import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export interface AppSelectOption {
  value: string;
  label: string;
}

interface AppSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function AppSelect({ value, onChange, options, placeholder, style }: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          style={{
            width: "100%",
            height: 37,
            border: open ? "1px solid var(--accent)" : "1px solid rgba(0,0,0,0.11)",
            borderRadius: 8,
            padding: "0 11px",
            fontSize: 13,
            color: selected ? "var(--t1)" : "var(--t3)",
            background: "var(--bg)",
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
            textAlign: "left",
            transition: "border-color 0.15s",
            ...style,
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {selected?.label ?? placeholder ?? "Auswählen…"}
          </span>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className=""
        style={{
          width: "var(--radix-popover-trigger-width)",
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 10,
          boxShadow: "0 4px 16px rgba(28,24,20,0.12)",
          padding: 4,
          maxHeight: 260,
          overflowY: "auto",
        }}
      >
        {options.map((opt) => {
          const isActive = opt.value === value;
          return (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              role="option"
              aria-selected={isActive}
              style={{
                padding: "7px 11px",
                borderRadius: 6,
                fontSize: 13,
                color: isActive ? "var(--accent)" : "var(--t1)",
                background: isActive ? "rgba(194,105,42,0.1)" : "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "inherit",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = isActive ? "rgba(194,105,42,0.1)" : "transparent";
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: isActive ? "var(--accent)" : "transparent",
                flexShrink: 0,
              }} />
              {opt.label}
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
