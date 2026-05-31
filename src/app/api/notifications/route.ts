import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NotificationType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth(req);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

const createNotificationSchema = z.object({
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1),
  message: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth(req);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createNotificationSchema.parse(body);

    const notification = await prisma.notification.create({
      data: {
        ...data,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ notification });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to create notification" }, { status: 500 });
  }
}
