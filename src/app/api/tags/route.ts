import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const tagSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth(req);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tags = await prisma.tag.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(tags);
}

export async function POST(req: NextRequest) {
  const session = await auth(req);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = tagSchema.parse(body);

    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        color: data.color,
        userId: session.user.id,
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Create tag error:", error);
    return NextResponse.json(
      { message: "Failed to create tag" },
      { status: 500 }
    );
  }
}
