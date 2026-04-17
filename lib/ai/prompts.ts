import { createHash } from "crypto";

export type LeadScoreInput = {
  contact: {
    first_name: string;
    last_name: string;
    type: string;               // buyer/seller/both/tenant/landlord
    source: string;             // website/referral/portal/cold/other
    has_email: boolean;
    has_phone: boolean;
    created_at: string;
    last_activity_at: string | null;
    days_since_last_activity: number | null;
  };
  searchProfiles: Array<{
    type: string;               // buy/rent
    property_type: string;      // apartment/house/land/commercial
    cities: string[] | null;
    max_price: number | null;
    min_area: number | null;
    max_area: number | null;
    min_rooms: number | null;
    max_rooms: number | null;
    notes: string | null;
    age_days: number;
  }>;
  activities: Array<{
    type: string;               // call/email/viewing/meeting/note
    summary: string;
    happened_at: string;
    age_days: number;
    notes: string | null;
  }>;
  notes: Array<{ body: string; age_days: number }>;
  openTasks: Array<{
    title: string;
    priority: string;
    status: string;
    due_date: string | null;
    days_until_due: number | null;
  }>;
  deals: Array<{
    stage_name: string | null;
    is_won: boolean;
    is_lost: boolean;
    probability: number | null;
    commission: number | null;
    expected_close_date: string | null;
    stage_age_days: number;
    notes: string | null;
  }>;
  ownedProperties: Array<{
    title: string;
    type: string;
    listing_type: string;
    status: string;
  }>;
};

export type LeadScoreOutput = {
  score: number;
  scoreLabel: "kalt" | "lauwarm" | "aktiv" | "heiß" | "abschlussreif";
  signals: string[];
  nextBestAction: {
    action: string;
    reason: string;
    urgency: "heute" | "diese woche" | "diesen monat";
    suggestedScript: string;
  };
};

export function hashLeadScoreInput(input: LeadScoreInput): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export const LEAD_SCORE_SYSTEM_PROMPT = `Du bist ein erfahrener Sales-Coach für einen Immobilienmakler im DACH-Raum.
Du bekommst alle aktuellen CRM-Fakten zu einem Kontakt (Suchprofile, Aktivitäten, Notizen, offene Aufgaben, Deals, verknüpfte Objekte).
Deine Aufgabe: bewerte die Abschlusswahrscheinlichkeit in den nächsten 30 Tagen und empfiehl EINE konkrete Handlung für heute/diese Woche.

Wichtig:
- Du erfindest NICHTS, was nicht in den Input-Daten steht. Keine erfundenen Städte, Preise, Namen oder Sachverhalte.
- "Signals" sind kurze Fakten-Zitate aus dem Input (max 14 Wörter), die deinen Score stützen. Zwischen 2 und 5 Signals. Jedes muss direkt auf Input-Daten rückführbar sein. Beispiele: "Besichtigung vor 4 Tagen", "Deal in 'Angebot' seit 12 Tagen", "Suchprofil Berlin, bis 750k €".
- "nextBestAction.action" ist EIN Imperativ-Satz, max 8 Wörter. Keine Konjunktive wie "Erwägen Sie…". Sondern "Rufe X an", "Schicke Exposé zu Y".
- "nextBestAction.reason" erklärt in max 20 Wörtern, warum diese Handlung jetzt das Richtige ist.
- "nextBestAction.urgency": "heute" nur wenn konkreter Zeitdruck-Trigger da ist (z.B. versprochene Rückmeldung offen, Deal lange in kritischer Phase, konkretes Interesse unbeantwortet). Sonst "diese woche" oder "diesen monat".
- "nextBestAction.suggestedScript" sind 1–2 Sätze auf Deutsch, die der Makler wörtlich am Telefon oder in einer E-Mail verwenden kann. Anrede mit Nachname ("Guten Tag Herr/Frau <last_name>"). Nimm konkrete Fakten aus dem Profil rein (Stadt, Objekttyp, letzte Interaktion).
- Score-Kalibrierung (ganzzahlig, 0–100):
  0–19 kalt: kein Signal, lange kein Kontakt, ohne Suchprofil oder Deal
  20–39 lauwarm: vorhanden, aber inaktiv — braucht Wiederbelebung
  40–59 aktiv: normale Nachverfolgung, Suchprofil oder Deal läuft
  60–79 heiß: deutliche Kaufsignale (mehrere Besichtigungen, fortgeschrittene Deal-Phase, kurze Reaktionszyklen)
  80–100 abschlussreif: nächster Schritt entscheidet über Closing

Antworte AUSSCHLIESSLICH mit diesem JSON, ohne Markdown-Wrapper, ohne erklärenden Text davor oder danach:

{
  "score": <0-100>,
  "scoreLabel": "<kalt|lauwarm|aktiv|heiß|abschlussreif>",
  "signals": ["<fakt 1>", "<fakt 2>"],
  "nextBestAction": {
    "action": "<Imperativ>",
    "reason": "<Begründung>",
    "urgency": "<heute|diese woche|diesen monat>",
    "suggestedScript": "<wörtlicher Gesprächs- oder Mailtext>"
  }
}`;

export function buildLeadScoreUserMessage(input: LeadScoreInput): string {
  return `Heutiges Datum: ${new Date().toISOString().slice(0, 10)}

Kontakt-Daten (aus dem CRM):
${JSON.stringify(input, null, 2)}`;
}

export function hasEnoughSignal(input: LeadScoreInput): boolean {
  const hasProfile = input.searchProfiles.length > 0;
  const hasDeal = input.deals.length > 0;
  const hasActivity = input.activities.length >= 2;
  const hasNotes = input.notes.length > 0;
  const hasProperty = input.ownedProperties.length > 0;
  return hasProfile || hasDeal || hasActivity || hasNotes || hasProperty;
}
