import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/session";

const createEventSchema = z
  .object({
    title: z.string().min(3).max(120),
    summary: z.string().max(240).optional().nullable(),
    description: z.string().max(5000).optional().nullable(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    timezone: z.string().min(2).max(80).default("Europe/London"),
    location: z.string().max(200).optional().nullable(),
    allDay: z.boolean().default(false),
    isPublished: z.boolean().default(true),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "End must be after start",
    path: ["endsAt"],
  });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = isAdmin(user);
  const events = await prisma.event.findMany({
    where: admin ? undefined : { isPublished: true },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      summary: event.summary,
      description: event.description,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      timezone: event.timezone,
      location: event.location,
      allDay: event.allDay,
      isPublished: event.isPublished,
    })),
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.event.create({
    data: {
      title: parsed.data.title,
      summary: parsed.data.summary ?? null,
      description: parsed.data.description ?? null,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      timezone: parsed.data.timezone,
      location: parsed.data.location ?? null,
      allDay: parsed.data.allDay,
      isPublished: parsed.data.isPublished,
      createdById: user.id,
    },
  });

  return NextResponse.json({ event: created }, { status: 201 });
}
