import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/session";

type Params = {
  params: Promise<{ id: string }>;
};

function esc(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function dt(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });

  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!event.isPublished && !isAdmin(user)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = dt(new Date());
  const uid = `${event.id}@bdaia-events`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BDAIA//Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dt(event.startsAt)}`,
    `DTEND:${dt(event.endsAt)}`,
    `SUMMARY:${esc(event.title)}`,
    event.summary ? `DESCRIPTION:${esc(event.summary)}${event.description ? `\\n\\n${esc(event.description)}` : ""}` : event.description ? `DESCRIPTION:${esc(event.description)}` : "",
    event.location ? `LOCATION:${esc(event.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  const body = `${lines.join("\r\n")}\r\n`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename=event-${event.id}.ics`,
      "Cache-Control": "no-store",
    },
  });
}
