"use client";

import { useRef, useEffect } from "react";

interface Props {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel?: string;
}

export default function SelectionCheckbox({ checked, indeterminate = false, onChange, ariaLabel }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      aria-label={ariaLabel ?? "Auswählen"}
      style={{
        width: 16,
        height: 16,
        cursor: "pointer",
        accentColor: "var(--accent)",
        margin: 0,
        flexShrink: 0,
      }}
    />
  );
}
