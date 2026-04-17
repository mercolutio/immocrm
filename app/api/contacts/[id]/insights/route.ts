import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAnthropic,
  MODEL,
  estimateCostEur,
  assertDailyBudget,
} from "@/lib/ai/client";
import {
  LEAD_SCORE_SYSTEM_PROMPT,
  buildLeadScoreUserMessage,
  hashLeadScoreInput,
  hasEnoughSignal,
  type LeadScoreInput,
  type LeadScoreOutput,
} from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SupabaseSrv = ReturnType<typeof createClient>;

function ageDays(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((t - Date.now()) / 86400000);
}

async function loadLeadScoreInput(
  supabase: SupabaseSrv,
  contactId: string,
): Promise<LeadScoreInput | null> {
  const [c, sp, acts, notes, tasks, deals, props] = await Promise.all([
    supabase
      .from("contacts")
      .select("first_name,last_name,type,source,email,phone,created_at")
      .eq("id", contactId)
      .maybeSingle(),
    supabase
      .from("search_profiles")
      .select("type,property_type,cities,max_price,min_area,max_area,min_rooms,max_rooms,notes,created_at")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false }),
    supabase
      .from("activities")
      .select("type,summary,happened_at,notes")
      .eq("contact_id", contactId)
      .order("happened_at", { ascending: false })
      .limit(20),
    supabase
      .from("notes")
      .select("body,created_at")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("tasks")
      .select("title,priority,status,due_date")
      .eq("contact_id", contactId)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("deals")
      .select("probability,commission,expected_close_date,notes,updated_at,closed_at,stage:pipeline_stages(name,is_won,is_lost)")
      .eq("contact_id", contactId),
    supabase
      .from("properties")
      .select("title,type,listing_type,status,is_archived")
      .eq("owner_contact_id", contactId),
  ]);

  if (!c.data) return null;

  const activities = (acts.data ?? []).map((a) => ({
    type: a.type,
    summary: a.summary,
    happened_at: a.happened_at,
    age_days: ageDays(a.happened_at) ?? 0,
    notes: a.notes,
  }));

  const lastActivityAt = activities[0]?.happened_at ?? null;

  return {
    contact: {
      first_name: c.data.first_name,
      last_name: c.data.last_name,
      type: c.data.type,
      source: c.data.source,
      has_email: !!c.data.email,
      has_phone: !!c.data.phone,
      created_at: c.data.created_at,
      last_activity_at: lastActivityAt,
      days_since_last_activity: ageDays(lastActivityAt),
    },
    searchProfiles: (sp.data ?? []).map((p) => ({
      type: p.type,
      property_type: p.property_type,
      cities: p.cities,
      max_price: p.max_price != null ? Number(p.max_price) : null,
      min_area: p.min_area != null ? Number(p.min_area) : null,
      max_area: p.max_area != null ? Number(p.max_area) : null,
      min_rooms: p.min_rooms != null ? Number(p.min_rooms) : null,
      max_rooms: p.max_rooms != null ? Number(p.max_rooms) : null,
      notes: p.notes,
      age_days: ageDays(p.created_at) ?? 0,
    })),
    activities,
    notes: (notes.data ?? []).map((n) => ({
      body: n.body,
      age_days: ageDays(n.created_at) ?? 0,
    })),
    openTasks: (tasks.data ?? []).map((t) => ({
      title: t.title,
      priority: t.priority,
      status: t.status,
      due_date: t.due_date,
      days_until_due: daysUntil(t.due_date),
    })),
    deals: (deals.data ?? []).map((d) => {
      const stage = Array.isArray(d.stage) ? d.stage[0] : d.stage;
      return {
        stage_name: stage?.name ?? null,
        is_won: !!stage?.is_won,
        is_lost: !!stage?.is_lost,
        probability: d.probability,
        commission: d.commission != null ? Number(d.commission) : null,
        expected_close_date: d.expected_close_date,
        stage_age_days: ageDays(d.updated_at) ?? 0,
        notes: d.notes,
      };
    }),
    ownedProperties: (props.data ?? [])
      .filter((p) => !p.is_archived)
      .map((p) => ({
        title: p.title,
        type: p.type,
        listing_type: p.listing_type,
        status: p.status,
      })),
  };
}

function parseLeadScoreOutput(text: string): LeadScoreOutput | null {
  const trimmed = text.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) return null;
  const slice = trimmed.slice(jsonStart, jsonEnd + 1);
  try {
    const parsed = JSON.parse(slice);
    if (
      typeof parsed.score !== "number" ||
      typeof parsed.scoreLabel !== "string" ||
      !Array.isArray(parsed.signals) ||
      !parsed.nextBestAction ||
      typeof parsed.nextBestAction.action !== "string"
    ) {
      return null;
    }
    return parsed as LeadScoreOutput;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!UUID_RE.test(params.id))
    return NextResponse.json({ error: "Ungültige Contact-ID." }, { status: 400 });
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  const { data, error } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("user_id", user.id)
    .eq("entity_type", "contact")
    .eq("entity_id", params.id)
    .eq("kind", "lead_score")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ insight: data ?? null });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!UUID_RE.test(params.id))
    return NextResponse.json({ error: "Ungültige Contact-ID." }, { status: 400 });
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });

  try {
    await assertDailyBudget(user.id);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 429 });
  }

  const input = await loadLeadScoreInput(supabase, params.id);
  if (!input)
    return NextResponse.json({ error: "Kontakt nicht gefunden." }, { status: 404 });

  if (!hasEnoughSignal(input)) {
    return NextResponse.json(
      {
        insight: null,
        insufficientData: true,
        hint: "Erfasse Suchprofil, Aktivität oder Notiz — dann kann die KI bewerten.",
      },
      { status: 200 },
    );
  }

  const hash = hashLeadScoreInput(input);

  const { data: cached } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("user_id", user.id)
    .eq("entity_type", "contact")
    .eq("entity_id", params.id)
    .eq("kind", "lead_score")
    .maybeSingle();
  if (cached && cached.input_hash === hash) {
    return NextResponse.json({ insight: cached, cached: true });
  }

  const anthropic = getAnthropic();
  let msg;
  try {
    msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: LEAD_SCORE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildLeadScoreUserMessage(input) }],
    });
  } catch (e) {
    return NextResponse.json(
      { error: `KI-Dienst nicht erreichbar: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  const text =
    msg.content.find((c) => c.type === "text")?.type === "text"
      ? (msg.content.find((c) => c.type === "text") as { type: "text"; text: string }).text
      : "";
  const parsed = parseLeadScoreOutput(text);
  if (!parsed) {
    return NextResponse.json(
      { error: "KI-Antwort konnte nicht gelesen werden." },
      { status: 502 },
    );
  }

  const cost = estimateCostEur(msg.usage.input_tokens, msg.usage.output_tokens);

  const { data: upserted, error: upErr } = await supabase
    .from("ai_insights")
    .upsert(
      {
        user_id: user.id,
        entity_type: "contact",
        entity_id: params.id,
        kind: "lead_score",
        score: parsed.score,
        score_label: parsed.scoreLabel,
        signals: parsed.signals,
        next_action: parsed.nextBestAction,
        input_hash: hash,
        tokens_in: msg.usage.input_tokens,
        tokens_out: msg.usage.output_tokens,
        cost_eur: cost,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,entity_type,entity_id,kind" },
    )
    .select()
    .single();
  if (upErr)
    return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ insight: upserted, cached: false });
}
