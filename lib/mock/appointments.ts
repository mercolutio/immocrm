import type { AppointmentItem } from "@/components/dashboard/types";

function todayAt(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function getTodayAppointments(): AppointmentItem[] {
  return [
    {
      kind: "appointment",
      id: "mock-app-1",
      title: "Beratungsgespräch · Sarah König",
      description: "Telefontermin · Budget 1,2–1,5M · Zielbezirk Mitte",
      startsAt: todayAt(10, 30),
      durationMin: 45,
      location: null,
    },
    {
      kind: "appointment",
      id: "mock-app-2",
      title: "Besichtigung Loft Hamburg · Thomas Brandt",
      description: "Jungfernstieg 12, 20354 Hamburg · 218 m² · €1,85M",
      startsAt: todayAt(15, 0),
      durationMin: 60,
      location: "Jungfernstieg 12, 20354 Hamburg",
    },
    {
      kind: "appointment",
      id: "mock-app-3",
      title: "Notartermin · Fam. Reuter",
      description: "Vertragsunterzeichnung · Notariat Dr. Keller",
      startsAt: todayAt(17, 30),
      durationMin: 60,
      location: "Notariat Dr. Keller, Potsdamer Platz 1",
    },
  ];
}
