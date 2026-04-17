import { supabase } from '../lib/supabase';
import type { EventRecord, EquipmentItem } from '../types';

// ─── DB row shapes ─────────────────────────────────────────────────────────

interface DbEvent {
  id: string;
  client_name: string;
  event_name: string;
  event_type: string;
  date: string;
  location: string;
  manager_name: string;
  status: string;
  notes: string;
  tasks_done: Record<string, boolean> | null;
  created_at: string;
}

interface DbInventoryRow {
  id: string;
  event_id: string;
  item_id: string | null;
  custom_item_name: string | null;
  custom_item_category: string | null;
  quantity_out: number;
  quantity_returned: number;
  is_checked: boolean;
  selected_variant: string | null;
  baskets_out: number;
  baskets_returned: number;
  price_at_event: number;
  is_accounted_for: boolean;
}

// ─── Converters ────────────────────────────────────────────────────────────

function toDbEvent(e: EventRecord): Omit<DbEvent, 'created_at'> {
  return {
    id:           e.id,
    client_name:  e.eventName,
    event_name:   e.eventName,
    event_type:   e.type,
    date:         e.eventDate,
    location:     '',
    manager_name: e.managerName,
    status:       e.status,
    notes:        e.notes ?? '',
    tasks_done:   e.tasksDone ?? {},
  };
}

function toDbItems(eventId: string, items: EquipmentItem[]): Omit<DbInventoryRow, 'id' | 'is_accounted_for'>[] {
  return items
    .filter(i => i.quantityOut > 0 || i.isChecked)
    .map(i => ({
      event_id:             eventId,
      item_id:              null,
      custom_item_name:     i.name,
      custom_item_category: i.category,
      quantity_out:         i.quantityOut   ?? 0,
      quantity_returned:    i.quantityIn    ?? 0,
      is_checked:           i.isChecked     ?? false,
      selected_variant:     i.selectedVariant ?? null,
      baskets_out:          i.basketsOut    ?? 0,
      baskets_returned:     i.basketsIn     ?? 0,
      price_at_event:       i.price         ?? 0,
    }));
}

function fromDb(dbEvent: DbEvent, dbItems: DbInventoryRow[]): EventRecord {
  return {
    id:          dbEvent.id,
    type:        dbEvent.event_type as EventRecord['type'],
    eventName:   dbEvent.event_name,
    managerName: dbEvent.manager_name,
    eventDate:   dbEvent.date,
    status:      dbEvent.status as EventRecord['status'],
    notes:       dbEvent.notes,
    tasksDone:   dbEvent.tasks_done ?? {},
    createdAt:   new Date(dbEvent.created_at).getTime(),
    items:       dbItems.map(row => ({
      id:              row.id,
      name:            row.custom_item_name  ?? '',
      category:        row.custom_item_category ?? '',
      quantityOut:     row.quantity_out,
      quantityIn:      row.quantity_returned,
      isChecked:       row.is_checked,
      selectedVariant: row.selected_variant  ?? undefined,
      basketsOut:      row.baskets_out,
      basketsIn:       row.baskets_returned,
      price:           row.price_at_event,
      itemType:        row.is_checked ? 'checkbox' : 'count',
    })),
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function fetchAllEvents(): Promise<EventRecord[]> {
  const { data: events, error: eErr } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (eErr) throw eErr;
  if (!events || events.length === 0) return [];

  const ids = events.map((e: DbEvent) => e.id);
  const { data: items, error: iErr } = await supabase
    .from('event_inventory')
    .select('*')
    .in('event_id', ids);

  if (iErr) throw iErr;

  const byEvent = ((items ?? []) as DbInventoryRow[]).reduce<Record<string, DbInventoryRow[]>>(
    (acc, row) => {
      (acc[row.event_id] ??= []).push(row);
      return acc;
    },
    {}
  );

  return (events as DbEvent[]).map(e => fromDb(e, byEvent[e.id] ?? []));
}

export async function saveEvent(event: EventRecord): Promise<void> {
  const { error: eErr } = await supabase
    .from('events')
    .upsert(toDbEvent(event), { onConflict: 'id' });
  if (eErr) throw eErr;

  // Replace all items for this event
  await supabase.from('event_inventory').delete().eq('event_id', event.id);

  const rows = toDbItems(event.id, event.items);
  if (rows.length > 0) {
    const { error: iErr } = await supabase.from('event_inventory').insert(rows);
    if (iErr) throw iErr;
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

export async function closeEvent(eventId: string): Promise<void> {
  const { error: eErr } = await supabase
    .from('events')
    .update({ status: 'completed' })
    .eq('id', eventId);
  if (eErr) throw eErr;

  const { error: iErr } = await supabase
    .from('event_inventory')
    .update({ is_accounted_for: true })
    .eq('event_id', eventId);
  if (iErr) throw iErr;
}
