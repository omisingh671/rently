import { prisma } from "@/db/prisma.js";
import { Prisma } from "@/generated/prisma/client.js";

export const createEnquiry = (data: Prisma.EnquiryCreateInput) =>
  prisma.enquiry.create({
    data,
  });
