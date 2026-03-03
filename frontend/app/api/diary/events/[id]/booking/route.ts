import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "@/lib/session";

type Params = {
  params: Promise<{ id: string }>;
};

async function loadEventForMember(eventId: string, admin: boolean) {
  return prisma.event.findFirst({
    where: admin ? { id: eventId } : { id: eventId, isPublished: true },
    select: { id: true },
  });
}

export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const admin = isAdmin(user);
  const event = await loadEventForMember(id, admin);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const booking = await prisma.eventBooking.findUnique({
    where: { userId_eventId: { userId: user.id, eventId: id } },
    select: { id: true },
  });

  return NextResponse.json({ booked: Boolean(booking) });
}

export async function POST(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const admin = isAdmin(user);
  const event = await loadEventForMember(id, admin);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  await prisma.eventBooking.upsert({
    where: { userId_eventId: { userId: user.id, eventId: id } },
    create: { userId: user.id, eventId: id },
    update: {},
  });

  return NextResponse.json({ booked: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;

  await prisma.eventBooking.deleteMany({
    where: { userId: user.id, eventId: id },
  });

  return NextResponse.json({ booked: false });
}
