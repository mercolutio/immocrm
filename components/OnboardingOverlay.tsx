"use client";

import { useEffect, useState, useCallback } from "react";

interface Step {
  id: string;
  title: string;
  description: string;
  position: "bottom" | "right" | "left" | "top";
}

const STEPS: Step[] = [
  {
    id: "onb-btn-neu",
    title: "Ersten Kontakt anlegen",
    description: 'Klicken Sie auf "Neu", um Ihren ersten Kontakt, ein Objekt oder einen Deal anzulegen.',
    position: "bottom",
  },
  {
    id: "onb-nav-objekte",
    title: "Erstes Objekt erfassen",
    description: "Hier finden Sie alle Ihre Immobilien. Legen Sie jetzt Ihr erstes Objekt an.",
    position: "right",
  },
  {
    id: "onb-nav-einstellungen",
    title: "Teammitglieder einladen",
    description: "Unter Einstellungen können Sie Kollegen in Ihr Maklerbüro einladen und gemeinsam arbeiten.",
    position: "right",
  },
];

const PAD = 10;

interface Props {
  onDone: () => void;
}

export default function OnboardingOverlay({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);

  const measure = useCallback((stepIndex: number) => {
    const el = document.getElementById(STEPS[stepIndex].id);
    if (el) {
      setRect(el.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    // kurze Verzögerung damit das Dashboard vollständig gerendert ist
    const t = setTimeout(() => {
      measure(0);
      setVisible(true);
    }, 400);
    return () => clearTimeout(t);
  }, [measure]);

  useEffect(() => {
    measure(step);
  }, [step, measure]);

  useEffect(() => {
    const handleResize = () => measure(step);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [step, measure]);

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      handleDone();
    }
  }

  function handleDone() {
    window.history.replaceState({}, "", "/dashboard");
    onDone();
  }

  if (!visible || !rect) return null;

  const current = STEPS[step];
  const W = window.innerWidth;
  const H = window.innerHeight;

  // Tooltip position
  const tooltip = getTooltipPos(rect, current.position, PAD);

  return (
    <>
      {/* SVG Backdrop mit Ausschnitt */}
      <svg
        style={{
          position: "fixed", inset: 0,
          width: "100vw", height: "100vh",
          zIndex: 9998, pointerEvents: "none",
        }}
      >
        <defs>
          <mask id="onb-mask">
            <rect x="0" y="0" width={W} height={H} fill="white" />
            <rect
              x={rect.left - PAD} y={rect.top - PAD}
              width={rect.width + PAD * 2} height={rect.height + PAD * 2}
              rx="10" fill="black"
              style={{ transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)" }}
            />
          </mask>
        </defs>
        <rect
          x="0" y="0" width={W} height={H}
          fill="rgba(10,8,6,0.62)"
          mask="url(#onb-mask)"
        />
      </svg>

      {/* Pulsierender Ring um das Ziel-Element */}
      <div
        style={{
          position: "fixed",
          left: rect.left - PAD,
          top: rect.top - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          borderRadius: 10,
          border: "2px solid #C2692A",
          zIndex: 9999,
          pointerEvents: "none",
          animation: "onb-pulse 1.8s ease-in-out infinite",
          boxShadow: "0 0 0 0 rgba(194,105,42,0.5)",
          transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
        }}
      />

      {/* Klick-Blocker (außerhalb des Highlights) */}
      <div
        style={{
          position: "fixed", inset: 0,
          zIndex: 9997, cursor: "default",
        }}
        onClick={e => e.stopPropagation()}
      />

      {/* Tooltip-Karte */}
      <div
        style={{
          position: "fixed",
          zIndex: 10000,
          ...tooltip,
          width: 290,
          background: "#fff",
          borderRadius: 14,
          padding: "20px 22px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
          border: "1px solid rgba(0,0,0,0.07)",
          fontFamily: "var(--font-dm-sans, 'DM Sans'), sans-serif",
          animation: "onb-fadein 0.3s ease both",
        }}
      >
        {/* Schrittnummer */}
        <div style={{
          fontSize: 10, fontWeight: 600, color: "#C2692A",
          textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 7,
        }}>
          Schritt {step + 1} von {STEPS.length}
        </div>

        {/* Titel */}
        <div style={{
          fontFamily: "var(--font-playfair, 'Playfair Display'), serif",
          fontSize: 17, fontWeight: 400, color: "#1C1814",
          letterSpacing: "-0.2px", marginBottom: 9, lineHeight: 1.3,
        }}>
          {current.title}
        </div>

        {/* Beschreibung */}
        <div style={{
          fontSize: 13, color: "#6A6460", lineHeight: 1.6, marginBottom: 18,
        }}>
          {current.description}
        </div>

        {/* Fortschritts-Dots */}
        <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 5, borderRadius: 3,
              width: i === step ? 20 : 5,
              background: i === step ? "#C2692A" : "rgba(0,0,0,0.12)",
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleNext}
            style={{
              flex: 1, height: 38,
              background: "#C2692A", color: "#fff",
              border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.14s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#D97D3A")}
            onMouseLeave={e => (e.currentTarget.style.background = "#C2692A")}
          >
            {step < STEPS.length - 1 ? "Weiter →" : "Los geht's ✓"}
          </button>
          <button
            onClick={handleDone}
            style={{
              height: 38, padding: "0 14px",
              background: "transparent",
              border: "1px solid rgba(0,0,0,0.11)",
              borderRadius: 8, fontSize: 13, color: "#A8A49F",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Überspringen
          </button>
        </div>
      </div>

      <style>{`
        @keyframes onb-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(194,105,42,0.55); }
          60%  { box-shadow: 0 0 0 8px rgba(194,105,42,0); }
          100% { box-shadow: 0 0 0 0 rgba(194,105,42,0); }
        }
        @keyframes onb-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

function getTooltipPos(rect: DOMRect, position: Step["position"], pad: number): React.CSSProperties {
  switch (position) {
    case "bottom":
      return {
        top: rect.bottom + pad + 14,
        left: Math.min(rect.left + rect.width / 2 - 145, window.innerWidth - 310),
      };
    case "right":
      return {
        top: Math.min(Math.max(rect.top + rect.height / 2 - 120, 16), window.innerHeight - 320),
        left: rect.right + pad + 14,
      };
    case "left":
      return {
        top: Math.max(rect.top + rect.height / 2 - 120, 16),
        right: window.innerWidth - rect.left + pad + 14,
      };
    case "top":
      return {
        bottom: window.innerHeight - rect.top + pad + 14,
        left: Math.min(rect.left + rect.width / 2 - 145, window.innerWidth - 310),
      };
  }
}
