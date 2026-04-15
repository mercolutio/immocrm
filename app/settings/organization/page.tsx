"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppSelect from "@/components/AppSelect";
import type { Organization, OrganizationMember, OrganizationRole } from "@/lib/types";
import { ORGANIZATION_ROLE_LABELS, labelsToOptions } from "@/lib/types";

export default function OrganizationSettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<OrganizationRole>("member");
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    setCurrentUid(uid);

    const { data: mem } = await supabase.from("organization_members")
      .select("organization_id").eq("user_id", uid).limit(1).single();
    if (!mem) return;
    const [{ data: o }, { data: ms }] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", mem.organization_id).single(),
      supabase.from("organization_members").select("*").eq("organization_id", mem.organization_id),
    ]);
    setOrg(o as Organization);
    setMembers((ms ?? []) as OrganizationMember[]);
    setName((o as Organization | null)?.name ?? "");
    setNameDirty(false);

    const map: Record<string, string> = {};
    map[uid] = String(auth.user?.email ?? "");
    setEmailMap(map);
  }

  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  const isOwner = !!(currentUid && members.find((m) => m.user_id === currentUid)?.role === "owner");

  async function saveName() {
    if (!org) return;
    setErr(null);
    const { error } = await supabase.from("organizations").update({ name }).eq("id", org.id);
    if (error) setErr(error.message);
    else {
      setNameDirty(false);
      setInfo("Gespeichert.");
      setTimeout(() => setInfo(null), 2000);
      load();
    }
  }

  async function addMember() {
    if (!org || !newEmail.trim()) return;
    setErr(null); setInfo(null);
    // Simple MVP: Server-Action erstellen? Hier: wir können nur hinzufügen,
    // wenn User existiert. Da Client nicht auf auth.users zugreifen kann,
    // nutzen wir eine serverless-style Helper-Route später. Für MVP:
    // informieren, dass User bereits registriert sein muss.
    setErr("Für jetzt bitte: Nutzer zuerst registrieren, dann via Backend einladen.");
  }

  async function removeMember(m: OrganizationMember) {
    if (!isOwner) return;
    if (m.user_id === currentUid) return;
    if (!confirm("Mitglied wirklich entfernen?")) return;
    await supabase.from("organization_members").delete().eq("id", m.id);
    load();
  }

  if (!org) return <div style={{ color: "var(--t3)" }}>Lade…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 640 }}>
      {/* ORG-NAME */}
      <div className="card" style={{ padding: 22 }}>
        <div style={{ fontFamily: "var(--font-playfair)", fontSize: 16, fontWeight: 500, color: "var(--t1)", marginBottom: 16 }}>
          Organisation
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className="stat-label">Name</label>
          <input className="input-field" value={name} disabled={!isOwner}
            onChange={(e) => { setName(e.target.value); setNameDirty(true); }} />
        </div>
        {isOwner && nameDirty && (
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={saveName} className="btn-primary">Speichern</button>
            <button onClick={() => { setName(org.name); setNameDirty(false); }} className="btn-ghost">Zurücksetzen</button>
          </div>
        )}
      </div>

      {/* MEMBERS */}
      <div className="card" style={{ padding: 22 }}>
        <div style={{ fontFamily: "var(--font-playfair)", fontSize: 16, fontWeight: 500, color: "var(--t1)", marginBottom: 16 }}>
          Mitglieder
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {members.map((m) => (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", border: "1px solid var(--border)",
              borderRadius: 8, background: "var(--card)",
            }}>
              <div style={{ flex: 1, fontSize: 13, color: "var(--t1)" }}>
                {emailMap[m.user_id] || m.user_id.slice(0, 8)}
                {m.user_id === currentUid && (
                  <span style={{ fontSize: 11, color: "var(--t3)", marginLeft: 8 }}>(Du)</span>
                )}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20,
                color: "var(--badge-brown)", background: "var(--badge-brown-bg)",
              }}>
                {ORGANIZATION_ROLE_LABELS[m.role]}
              </span>
              {isOwner && m.user_id !== currentUid && (
                <button onClick={() => removeMember(m)} className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12, color: "var(--red)" }}>
                  Entfernen
                </button>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--label)", marginBottom: 8 }}>
              Mitglied hinzufügen
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input-field" placeholder="E-Mail-Adresse"
                value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                style={{ flex: 1 }} />
              <AppSelect value={newRole} onChange={(v) => setNewRole(v as OrganizationRole)}
                style={{ width: 130 }}
                options={labelsToOptions(ORGANIZATION_ROLE_LABELS).filter((o) => o.value !== "owner")} />
              <button onClick={addMember} className="btn-primary">Einladen</button>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--t3)" }}>
              Der Nutzer muss bereits registriert sein. Invite-E-Mails folgen in einer späteren Version.
            </div>
          </div>
        )}
      </div>

      {info && <div style={{ color: "var(--badge-green)", fontSize: 13 }}>{info}</div>}
      {err && <div style={{ color: "var(--red)", fontSize: 13 }}>{err}</div>}
    </div>
  );
}
