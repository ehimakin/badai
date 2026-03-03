import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = isAdmin(user);
  const events = await prisma.event.findMany({
    where: admin ? undefined : { isPublished: true },
    orderBy: { startsAt: "asc" },
    include: {
      bookings: {
        where: { userId: user.id },
        select: { id: true },
      },
    },
  });

  return NextResponse.json({
    events: events.map((event) => ({
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
      booked: event.bookings.length > 0,
    })),
  });
}
