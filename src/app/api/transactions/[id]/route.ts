import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { TransactionType } from "@prisma/client";

const updateSchema = z.object({
  type: z.nativeEnum(TransactionType).optional(),
  amount: z.coerce.number().positive().optional(),
  date: z.coerce.date().optional(),
  description: z.string().min(1).optional(),
  notes: z.string().optional(),
  accountId: z.string().min(1).optional(),
  toAccountId: z.string().optional(),
  categoryId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
      include: { tags: true },
    });

    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    if (data.type === "TRANSFER" && !data.toAccountId && !existing.toAccountId) {
      return NextResponse.json(
        { message: "toAccountId is required for transfers" },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Reverse old balance effects
      const oldAmount = Number(existing.amount);
      if (existing.type === "INCOME") {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { decrement: oldAmount } },
        });
      } else if (existing.type === "EXPENSE") {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: oldAmount } },
        });
      } else if (existing.type === "TRANSFER") {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: oldAmount } },
        });
        if (existing.toAccountId) {
          await tx.account.update({
            where: { id: existing.toAccountId },
            data: { balance: { decrement: oldAmount } },
          });
        }
      }

      // Apply new balance effects
      const newType = data.type ?? existing.type;
      const newAmount = data.amount ?? oldAmount;
      const newAccountId = data.accountId ?? existing.accountId;
      const newToAccountId =
        data.toAccountId !== undefined ? data.toAccountId : existing.toAccountId;

      if (newType === "INCOME") {
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { increment: newAmount } },
        });
      } else if (newType === "EXPENSE") {
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { decrement: newAmount } },
        });
      } else if (newType === "TRANSFER" && newToAccountId) {
        await tx.account.update({
          where: { id: newAccountId },
          data: { balance: { decrement: newAmount } },
        });
        await tx.account.update({
          where: { id: newToAccountId },
          data: { balance: { increment: newAmount } },
        });
      }

      // Update tags if provided
      if (data.tagIds !== undefined) {
        await tx.transactionTag.deleteMany({ where: { transactionId: id } });
        if (data.tagIds.length > 0) {
          await tx.transactionTag.createMany({
            data: data.tagIds.map((tagId) => ({ transactionId: id, tagId })),
          });
        }
      }

      return tx.transaction.update({
        where: { id },
        data: {
          type: data.type,
          amount: data.amount,
          date: data.date,
          description: data.description,
          notes: data.notes,
          accountId: data.accountId,
          toAccountId: data.toAccountId,
          categoryId: data.categoryId,
        },
        include: {
          category: true,
          account: true,
          tags: { include: { tag: true } },
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update transaction error:", error);
    return NextResponse.json(
      { message: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const amount = Number(existing.amount);

      if (existing.type === "INCOME") {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { decrement: amount } },
        });
      } else if (existing.type === "EXPENSE") {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: amount } },
        });
      } else if (existing.type === "TRANSFER") {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: amount } },
        });
        if (existing.toAccountId) {
          await tx.account.update({
            where: { id: existing.toAccountId },
            data: { balance: { decrement: amount } },
          });
        }
      }

      await tx.transactionTag.deleteMany({ where: { transactionId: id } });
      await tx.transaction.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return NextResponse.json(
      { message: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
