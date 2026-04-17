import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const MODEL = "claude-sonnet-4-6";

// Claude Sonnet 4.6 pricing (Jan 2026): $3/MTok input, $15/MTok output. 1 USD ≈ 0.92 EUR.
const COST_PER_TOKEN_IN_EUR = (3 / 1_000_000) * 0.92;
const COST_PER_TOKEN_OUT_EUR = (15 / 1_000_000) * 0.92;

export function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY fehlt.");
  return new Anthropic({ apiKey: key });
}

export function estimateCostEur(tokensIn: number, tokensOut: number): number {
  return tokensIn * COST_PER_TOKEN_IN_EUR + tokensOut * COST_PER_TOKEN_OUT_EUR;
}

export async function assertDailyBudget(userId: string): Promise<{ spent: number; budget: number }> {
  const budget = parseFloat(process.env.ANTHROPIC_DAILY_BUDGET_EUR ?? "2");
  const supabase = createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("ai_insights")
    .select("cost_eur")
    .eq("user_id", userId)
    .gte("computed_at", since);
  if (error) throw error;
  const spent = (data ?? []).reduce((s, r) => s + Number(r.cost_eur ?? 0), 0);
  if (spent >= budget) {
    throw new Error(`Tagesbudget für KI-Analysen erreicht (${spent.toFixed(2)} €).`);
  }
  return { spent, budget };
}
