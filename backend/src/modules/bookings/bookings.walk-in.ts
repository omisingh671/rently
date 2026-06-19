import { randomUUID } from "node:crypto";
import { prisma } from "@/db/prisma.js";
import { UserRole } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import type { DashboardActor } from "./bookings.access.js";
import type { CreateDashboardManualBookingInput } from "./bookings.inputs.js";

export const findOrCreateWalkInGuest = async (
  actor: DashboardActor,
  input: Pick<
    CreateDashboardManualBookingInput,
    "guestName" | "guestEmail" | "countryCode" | "contactNumber"
  >,
) => {
  const email = input.guestEmail.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    if (existingUser.role !== UserRole.GUEST) {
      throw new HttpError(
        409,
        "GUEST_EMAIL_UNAVAILABLE",
        "This email belongs to a dashboard user",
      );
    }

    return prisma.user.update({
      where: { id: existingUser.id },
      data: {
        fullName: input.guestName,
        ...(input.countryCode !== undefined &&
          input.contactNumber !== undefined && {
            countryCode: input.countryCode,
            contactNumber: input.contactNumber,
          }),
      },
    });
  }

  const passwordHash = randomUUID();
  return prisma.user.create({
    data: {
      fullName: input.guestName,
      email,
      passwordHash,
      role: UserRole.GUEST,
      createdBy: {
        connect: {
          id: actor.id,
        },
      },
      ...(input.countryCode !== undefined &&
        input.contactNumber !== undefined && {
          countryCode: input.countryCode,
          contactNumber: input.contactNumber,
        }),
    },
  });
};

export const getStayNights = (from: Date, to: Date) =>
  Math.max(
    1,
    Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
  );
