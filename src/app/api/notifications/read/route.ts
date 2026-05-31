import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const readSchema = z.object({
  id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth(req);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = readSchema.parse(body);

    if (data.id) {
      const notification = await prisma.notification.findFirst({
        where: { id: data.id, userId: session.user.id },
      });

      if (!notification) {
        return NextResponse.json({ message: "Notification not found" }, { status: 404 });
      }

      await prisma.notification.update({
        where: { id: data.id },
        data: { isRead: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input", errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to mark as read" }, { status: 500 });
  }
}
