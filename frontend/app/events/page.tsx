import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/session";
import EventsClient, { type CalendarEvent } from "./EventsClient";

function randomDaysInCurrentMonth(count: number) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const picks = new Set<number>();

  while (picks.size < count) {
    picks.add(Math.floor(Math.random() * daysInMonth) + 1);
  }

  return [...picks];
}

function buildCurrentMonthTestEvents(): CalendarEvent[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const [d1, d2, d3] = randomDaysInCurrentMonth(3).sort((a, b) => a - b);

  const makeEvent = (id: string, title: string, day: number, startHour: number, endHour: number): CalendarEvent => ({
    id,
    title,
    summary: "Temporary mock event for calendar testing",
    description: "TEST ONLY: remove this event generator before production.",
    startsAt: new Date(Date.UTC(year, month, day, startHour, 0, 0)).toISOString(),
    endsAt: new Date(Date.UTC(year, month, day, endHour, 0, 0)).toISOString(),
    timezone: "Europe/London",
    location: "Online",
    allDay: false,
    isPublished: true,
  });

  return [
    makeEvent(`mock-${year}-${month + 1}-1`, "Mock Event A", d1, 9, 10),
    makeEvent(`mock-${year}-${month + 1}-2`, "Mock Event B", d2, 12, 13),
    makeEvent(`mock-${year}-${month + 1}-3`, "Mock Event C", d3, 16, 17),
  ];
}

export default async function Page() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-extrabold">Events</h1>
        <p className="mt-4 max-w-2xl opacity-85">
          Members can view upcoming events in the calendar. Please sign in to access the events area.
        </p>
        <div className="mt-6">
          <Link href="/members/login" className="btn-primary">
            Member login
          </Link>
        </div>
      </main>
    );
  }

  const admin = isAdmin(user);
  const rows = await prisma.event.findMany({
    where: admin ? undefined : { isPublished: true },
    orderBy: { startsAt: "asc" },
  });

  const initialEvents: CalendarEvent[] = rows.map((event) => ({
    id: event.id,
    title: event.title,
    summary: event.summary,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    timezone: event.timezone,
    location: event.location,
    allDay: event.allDay,
    isPublished: event.isPublished,
  }));

  // TEST ONLY: easily removable mock events block for calendar previews.
  // Remove this whole block before production.
  const INCLUDE_CURRENT_MONTH_TEST_EVENTS = true;
  const testEvents = INCLUDE_CURRENT_MONTH_TEST_EVENTS ? buildCurrentMonthTestEvents() : [];
  const eventsForCalendar = [...initialEvents, ...testEvents].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt)
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-extrabold">Events</h1>
      <p className="mt-4 max-w-3xl opacity-85">
        {admin
          ? "Admin mode: create, update, publish, and delete events."
          : "Member view: browse upcoming events and add them to your device calendar."}
      </p>

      <div className="mt-8">
        <EventsClient initialEvents={eventsForCalendar} isAdmin={admin} />
      </div>
    </main>
  );
}
