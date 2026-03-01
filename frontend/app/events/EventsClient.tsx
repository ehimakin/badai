"use client";

import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg } from "@fullcalendar/core/index.js";

export type CalendarEvent = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  location: string | null;
  allDay: boolean;
  isPublished: boolean;
};

type Props = {
  initialEvents: CalendarEvent[];
  isAdmin: boolean;
};

type EventForm = {
  title: string;
  summary: string;
  description: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  location: string;
  allDay: boolean;
  isPublished: boolean;
};

const DEFAULT_TIMEZONE = "Europe/London";

function toInputDateTime(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromInputDateTime(localDateTime: string) {
  return new Date(localDateTime).toISOString();
}

function initialForm(): EventForm {
  const now = new Date();
  const plusOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    summary: "",
    description: "",
    startsAt: toInputDateTime(now.toISOString()),
    endsAt: toInputDateTime(plusOneHour.toISOString()),
    timezone: DEFAULT_TIMEZONE,
    location: "",
    allDay: false,
    isPublished: true,
  };
}

function eventToForm(event: CalendarEvent): EventForm {
  return {
    title: event.title,
    summary: event.summary ?? "",
    description: event.description ?? "",
    startsAt: toInputDateTime(event.startsAt),
    endsAt: toInputDateTime(event.endsAt),
    timezone: event.timezone,
    location: event.location ?? "",
    allDay: event.allDay,
    isPublished: event.isPublished,
  };
}

function normalizeApiEvent(event: CalendarEvent): CalendarEvent {
  return {
    ...event,
    startsAt: new Date(event.startsAt).toISOString(),
    endsAt: new Date(event.endsAt).toISOString(),
  };
}

function googleCalendarUrl(event: CalendarEvent) {
  const start = event.startsAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const end = event.endsAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: `${event.summary ?? ""}${event.description ? `\n\n${event.description}` : ""}`,
    location: event.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

export default function EventsClient({ initialEvents, isAdmin }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedId, setSelectedId] = useState<string | null>(initialEvents[0]?.id ?? null);
  const [form, setForm] = useState<EventForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => events.find((event) => event.id === selectedId) ?? null,
    [events, selectedId]
  );

  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.startsAt,
        end: event.endsAt,
        allDay: event.allDay,
        classNames: event.isPublished ? [] : ["opacity-60"],
      })),
    [events]
  );

  function resetForm() {
    setForm(initialForm());
    setEditingId(null);
    setError(null);
  }

  function onSelectRange(selection: DateSelectArg) {
    if (!isAdmin) return;
    setEditingId(null);
    setError(null);
    setForm((prev) => ({
      ...prev,
      startsAt: toInputDateTime(selection.start.toISOString()),
      endsAt: toInputDateTime(selection.end.toISOString()),
      allDay: selection.allDay,
    }));
  }

  function onEventClick(click: EventClickArg) {
    const id = click.event.id;
    setSelectedId(id);
    if (!isAdmin) return;
    const event = events.find((item) => item.id === id);
    if (!event) return;
    setEditingId(event.id);
    setForm(eventToForm(event));
    setError(null);
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const payload = {
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        description: form.description.trim() || null,
        startsAt: fromInputDateTime(form.startsAt),
        endsAt: fromInputDateTime(form.endsAt),
        timezone: form.timezone.trim() || DEFAULT_TIMEZONE,
        location: form.location.trim() || null,
        allDay: form.allDay,
        isPublished: form.isPublished,
      };

      const endpoint = editingId ? `/api/events/${editingId}` : "/api/events";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Unable to save event");
      }

      const body = (await res.json()) as { event: CalendarEvent };
      const normalized = normalizeApiEvent(body.event);

      setEvents((prev) => {
        const exists = prev.some((item) => item.id === normalized.id);
        if (!exists) return [...prev, normalized].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        return prev
          .map((item) => (item.id === normalized.id ? normalized : item))
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      });
      setSelectedId(normalized.id);
      setEditingId(normalized.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save event");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvent() {
    if (!editingId) return;
    const ok = window.confirm("Delete this event?");
    if (!ok) return;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${editingId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Unable to delete event");
      }

      setEvents((prev) => prev.filter((item) => item.id !== editingId));
      setSelectedId((prev) => (prev === editingId ? null : prev));
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete event");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-2xl border bg-white p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          selectable={isAdmin}
          selectMirror={isAdmin}
          select={onSelectRange}
          eventClick={onEventClick}
          events={calendarEvents}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,listMonth",
          }}
        />
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border p-4">
          <div className="text-sm font-semibold opacity-70">Selected event</div>
          {!selected ? (
            <div className="mt-2 text-sm opacity-70">Select an event in the calendar to view details.</div>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              <div className="text-lg font-bold leading-tight">{selected.title}</div>
              {selected.summary ? <p className="opacity-85">{selected.summary}</p> : null}
              <div>
                <span className="font-semibold">Start:</span> {new Date(selected.startsAt).toLocaleString()}
              </div>
              <div>
                <span className="font-semibold">End:</span> {new Date(selected.endsAt).toLocaleString()}
              </div>
              {selected.location ? (
                <div>
                  <span className="font-semibold">Location:</span> {selected.location}
                </div>
              ) : null}
              {!selected.isPublished ? (
                <div className="inline-flex rounded-full bg-black/5 px-2 py-1 text-xs font-semibold">Draft</div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <a className="btn-primary" href={`/api/events/${selected.id}/ics`}>
                  Add to device calendar
                </a>
                <a className="btn-outline" href={googleCalendarUrl(selected)} target="_blank" rel="noreferrer">
                  Add to Google Calendar
                </a>
              </div>
            </div>
          )}
        </div>

        {isAdmin ? (
          <div className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold opacity-70">
                {editingId ? "Edit event (admin)" : "Create event (admin)"}
              </div>
              <button type="button" className="btn-outline" onClick={resetForm}>
                New
              </button>
            </div>

            <form className="mt-3 space-y-3" onSubmit={saveEvent}>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Title</span>
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Summary</span>
                <input
                  className="w-full rounded-lg border px-3 py-2"
                  value={form.summary}
                  onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Description</span>
                <textarea
                  className="min-h-24 w-full rounded-lg border px-3 py-2"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Start</span>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.startsAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">End</span>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.endsAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Timezone</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.timezone}
                    onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Location</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.location}
                    onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.allDay}
                    onChange={(e) => setForm((prev) => ({ ...prev, allDay: e.target.checked }))}
                  />
                  All day
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
                  />
                  Published
                </label>
              </div>

              {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? "Saving..." : editingId ? "Update event" : "Create event"}
                </button>
                {editingId ? (
                  <button type="button" className="btn-outline" onClick={deleteEvent} disabled={busy}>
                    Delete event
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </section>
  );
}
