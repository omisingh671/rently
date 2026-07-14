import { randomUUID } from "node:crypto";
import { Prisma, UserRole } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { hashPassword } from "@/common/utils/password.js";
import type { PublicBookingGuestDetailsInput } from "./bookings.inputs.js";
import * as repo from "./bookings.repository.js";

export interface BookingGuestSnapshot {
  userId: string;
  fullName: string;
  email: string;
  contactNumber: string | null;
}

export const resolveBookingGuestSnapshot = async (
  userId: string | undefined,
  guestDetails: PublicBookingGuestDetailsInput | undefined,
  tx: Prisma.TransactionClient,
): Promise<BookingGuestSnapshot> => {
  if (userId !== undefined) {
    if (guestDetails !== undefined) {
      return {
        userId,
        fullName: guestDetails.name,
        email: guestDetails.email,
        contactNumber: guestDetails.contactNumber,
      };
    }

    const user = await repo.findUserSnapshotById(userId, tx);
    if (!user) {
      throw new HttpError(404, "USER_NOT_FOUND", "User not found");
    }

    return {
      userId,
      fullName: user.fullName,
      email: user.email,
      contactNumber: user.contactNumber,
    };
  }

  if (guestDetails === undefined) {
    throw new HttpError(
      422,
      "GUEST_DETAILS_REQUIRED",
      "Guest name, email, and mobile number are required",
    );
  }

  const email = guestDetails.email.trim().toLowerCase();
  const existingUser = await repo.findUserByEmail(email, tx);

  if (existingUser) {
    if (existingUser.role !== UserRole.GUEST) {
      throw new HttpError(
        409,
        "GUEST_EMAIL_REQUIRES_LOGIN",
        "This email is already registered. Please log in to continue.",
      );
    }

    const user = await repo.updateUserById(
      existingUser.id,
      {
        fullName: guestDetails.name,
        contactNumber: guestDetails.contactNumber,
      },
      tx,
    );

    return {
      userId: user.id,
      fullName: guestDetails.name,
      email: user.email,
      contactNumber: guestDetails.contactNumber,
    };
  }

  const passwordHash = await hashPassword(randomUUID());
  const user = await repo.createUser(
    {
      fullName: guestDetails.name,
      email,
      passwordHash,
      role: UserRole.GUEST,
      contactNumber: guestDetails.contactNumber,
    },
    tx,
  );

  return {
    userId: user.id,
    fullName: user.fullName,
    email: user.email,
    contactNumber: user.contactNumber,
  };
};
