import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/session";

const updateEventSchema = z
  .object({
    title: z.string().min(3).max(120),
    summary: z.string().max(240).optional().nullable(),
    description: z.string().max(5000).optional().nullable(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    timezone: z.string().min(2).max(80),
    location: z.string().max(200).optional().nullable(),
    allDay: z.boolean(),
    isPublished: z.boolean(),
  })
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "End must be after start",
    path: ["endsAt"],
  });

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.event.update({
    where: { id },
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
    },
  });

  return NextResponse.json({ event: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;

  await prisma.event.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
