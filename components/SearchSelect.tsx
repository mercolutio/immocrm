"use client";

import { useState, useEffect, useRef } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";

export interface SearchSelectItem {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  onSearch: (query: string) => Promise<SearchSelectItem[]>;
  placeholder?: string;
  displayValue?: string;
  style?: React.CSSProperties;
}

export default function SearchSelect({ value, onChange, onSearch, placeholder, displayValue, style }: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchSelectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const r = await onSearch(query);
        setResults(r);
      } finally {
        setLoading(false);
      }
    }, query ? 300 : 0); // instant on open, debounced on typing
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, open]);

  // Reset query when opening
  useEffect(() => {
    if (open) { setQuery(""); setResults([]); setLoading(true); }
  }, [open]);

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
            padding: "0 8px 0 11px",
            fontSize: 13,
            color: value ? "var(--t1)" : "var(--t3)",
            background: "var(--bg)",
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            textAlign: "left",
            transition: "border-color 0.15s",
            ...style,
          }}
        >
          {value && displayValue ? (
            <>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "rgba(194,105,42,0.1)", color: "var(--accent)",
                fontSize: 12, fontWeight: 500, padding: "2px 6px 2px 8px",
                borderRadius: 5, maxWidth: "100%", overflow: "hidden",
              }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayValue}
                </span>
                <span
                  onClick={(e) => { e.stopPropagation(); onChange(null); }}
                  style={{ cursor: "pointer", display: "flex", alignItems: "center", marginLeft: 2, flexShrink: 0 }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </span>
              </span>
              <span style={{ flex: 1 }} />
            </>
          ) : (
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {placeholder ?? "Suchen…"}
            </span>
          )}
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"
            style={{ flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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
          padding: 0,
          overflow: "hidden",
        }}
      >
        <Command shouldFilter={false} className="">
          <CommandInput
            placeholder="Suchen…"
            value={query}
            onValueChange={setQuery}
            className="border-b border-[rgba(0,0,0,0.08)] text-[13px]"
          />
          <CommandList className="max-h-[220px]">
            {loading ? (
              <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: 14, background: "var(--bg2)", borderRadius: 4, animation: `pulse 1.4s ease-in-out ${i * 0.1}s infinite` }} />
                ))}
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <span style={{ fontSize: 13, color: "var(--t3)" }}>Keine Ergebnisse gefunden</span>
                </CommandEmpty>
                {results.map((item) => {
                  const isActive = item.value === value;
                  return (
                    <CommandItem
                      key={item.value}
                      value={item.value}
                      onSelect={() => { onChange(item.value); setOpen(false); }}
                      className=""
                      style={{
                        padding: "8px 11px",
                        fontSize: 13,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        borderRadius: 0,
                        color: isActive ? "var(--accent)" : "var(--t1)",
                        background: isActive ? "rgba(194,105,42,0.06)" : "transparent",
                      }}
                    >
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.label}
                      </span>
                      {item.sublabel && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 4, background: "var(--amb-bg)", color: "var(--amb)", flexShrink: 0 }}>
                          {item.sublabel}
                        </span>
                      )}
                      {isActive && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </CommandItem>
                  );
                })}
              </>
            )}
          </CommandList>
        </Command>
        <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
      </PopoverContent>
    </Popover>
  );
}
