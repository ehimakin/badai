"use client";

import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core/index.js";

type DiaryEvent = {
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
  booked: boolean;
};

type BookingResponse = {
  booked: boolean;
};

type ListResponse = {
  events: DiaryEvent[];
};

export default function DiaryTab() {
  const [events, setEvents] = useState<DiaryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkingBooking, setCheckingBooking] = useState(false);
  const [booked, setBooked] = useState<boolean | null>(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

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
        classNames: event.booked ? ["bg-emerald-600", "border-emerald-600"] : ["opacity-75"],
      })),
    [events]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDiaryEvents() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/diary/events", { cache: "no-store" });
        const body = (await res.json().catch(() => null)) as
          | ({ error?: string } & Partial<ListResponse>)
          | null;
        if (!res.ok || !body?.events) {
          throw new Error(body?.error || "Unable to load diary events");
        }
        if (!cancelled) {
          setEvents(body.events);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load diary events");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDiaryEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadBookingStatus(eventId: string) {
    setCheckingBooking(true);
    setBookingError(null);

    try {
      const res = await fetch(`/api/diary/events/${eventId}/booking`, { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as
        | ({ error?: string } & Partial<BookingResponse>)
        | null;

      if (!res.ok || typeof body?.booked !== "boolean") {
        throw new Error(body?.error || "Unable to check booking status");
      }

      const nextBooked = body.booked;
      setBooked(nextBooked);
      setEvents((prev) => prev.map((event) => (event.id === eventId ? { ...event, booked: nextBooked } : event)));
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Unable to check booking status");
      setBooked(null);
    } finally {
      setCheckingBooking(false);
    }
  }

  function onEventClick(click: EventClickArg) {
    const eventId = click.event.id;
    setSelectedId(eventId);
    void loadBookingStatus(eventId);
  }

  async function setBooking(nextBooked: boolean) {
    if (!selected) return;
    setBookingBusy(true);
    setBookingError(null);

    try {
      const res = await fetch(`/api/diary/events/${selected.id}/booking`, {
        method: nextBooked ? "POST" : "DELETE",
      });
      const body = (await res.json().catch(() => null)) as
        | ({ error?: string } & Partial<BookingResponse>)
        | null;

      if (!res.ok || typeof body?.booked !== "boolean") {
        throw new Error(body?.error || "Unable to update booking");
      }

      const updatedBooked = body.booked;
      setBooked(updatedBooked);
      setEvents((prev) =>
        prev.map((event) => (event.id === selected.id ? { ...event, booked: updatedBooked } : event))
      );
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Unable to update booking");
    } finally {
      setBookingBusy(false);
    }
  }

  if (loading) {
    return <div className="mt-6 rounded-xl bg-black/5 p-4 text-sm opacity-80">Loading diary events...</div>;
  }

  if (error) {
    return <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="rounded-2xl border bg-white p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          events={calendarEvents}
          eventClick={onEventClick}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,listMonth",
          }}
        />
      </div>

      <div className="rounded-2xl border p-4">
        <div className="text-sm font-semibold opacity-70">Selected event</div>
        {!selected ? (
          <div className="mt-3 text-sm opacity-80">Click an event to view details and manage your booking.</div>
        ) : (
          <div className="mt-3 space-y-3 text-sm">
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

            <div className="rounded-lg bg-black/5 px-3 py-2">
              {checkingBooking ? "Checking booking status..." : booked ? "You are booked on this event." : "You are not booked on this event."}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setBooking(true)}
                disabled={bookingBusy || checkingBooking || booked === true}
              >
                {bookingBusy && booked !== true ? "Booking..." : "Book"}
              </button>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setBooking(false)}
                disabled={bookingBusy || checkingBooking || booked !== true}
              >
                {bookingBusy && booked === true ? "Cancelling..." : "Cancel"}
              </button>
            </div>

            {bookingError ? <div className="text-sm text-red-600">{bookingError}</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
