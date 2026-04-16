import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskPriority } from "@/lib/types";

interface ApplyOptions {
  templateId: string;
  organizationId: string;
  userId: string;
  contactId?: string | null;
  propertyId?: string | null;
  dealId?: string | null;
  assignedTo?: string | null;
  baseDate?: Date;
}

export async function applyTemplate(
  supabase: SupabaseClient,
  opts: ApplyOptions
): Promise<{ count: number; error?: string }> {
  const { data: items, error } = await supabase
    .from("task_template_items")
    .select("*")
    .eq("template_id", opts.templateId)
    .order("position");

  if (error) return { count: 0, error: error.message };
  if (!items || items.length === 0) return { count: 0, error: "Vorlage enthält keine Schritte" };

  const base = opts.baseDate ?? new Date();
  const itemIdToTaskId = new Map<string, string>();

  const rows = items.map((item: {
    id: string;
    title: string;
    description: string | null;
    priority: TaskPriority;
    due_offset_days: number;
    depends_on_item_id: string | null;
  }) => {
    const due = new Date(base);
    due.setDate(due.getDate() + (item.due_offset_days || 0));

    return {
      organization_id: opts.organizationId,
      user_id: opts.userId,
      assigned_to: opts.assignedTo ?? null,
      contact_id: opts.contactId ?? null,
      property_id: opts.propertyId ?? null,
      deal_id: opts.dealId ?? null,
      template_id: opts.templateId,
      title: item.title,
      description: item.description,
      priority: item.priority,
      status: "planned" as const,
      due_date: due.toISOString(),
      recurrence: "none" as const,
      position: 0,
      _item_id: item.id,
      _depends_on_item_id: item.depends_on_item_id,
    };
  });

  const { data: created, error: insertErr } = await supabase
    .from("tasks")
    .insert(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      rows.map(({ _item_id, _depends_on_item_id, ...row }) => row)
    )
    .select("id");

  if (insertErr) return { count: 0, error: insertErr.message };

  if (created) {
    rows.forEach((row, i) => {
      itemIdToTaskId.set(row._item_id, created[i].id);
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row._depends_on_item_id) {
        const depTaskId = itemIdToTaskId.get(row._depends_on_item_id);
        if (depTaskId) {
          await supabase
            .from("tasks")
            .update({ depends_on_task_id: depTaskId })
            .eq("id", created[i].id);
        }
      }
    }
  }

  return { count: created?.length ?? 0 };
}
