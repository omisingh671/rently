import { Prisma, ComfortOption } from "@/generated/prisma/client.js";
import type { PublicInventoryItem } from "@/modules/public/availability/availability.service.js";
import * as spacesRepo from "@/modules/public/spaces/spaces.repository.js";
import * as spacesService from "@/modules/public/spaces/spaces.service.js";
import type * as repo from "./bookings.repository.js";
import type {
  PublicBookingDTO,
  PublicBookingQuoteItemDTO,
} from "./bookings.dto.js";
import {
  getBookingTaxBreakdown,
  toTaxBreakdownJson,
} from "./bookings.tax-breakdown.js";

export const mapBookingItems = (
  items: repo.PublicBookingRecord["items"],
): PublicBookingDTO["items"] =>
  items.map((item) => ({
    id: item.id,
    targetType: item.targetType,
    unitId: item.unitId ?? null,
    roomId: item.roomId ?? null,
    productId: item.productId ?? null,
    targetLabel: item.targetLabel,
    productName: item.productName,
    capacity: item.capacity,
    guestCount: item.guestCount,
    comfortOption: item.comfortOption,
    pricePerNight: Number(item.pricePerNight),
    pricingId: item.pricingId ?? null,
    subtotalAmount: Number(item.subtotalAmount),
    discountAmount: Number(item.discountAmount),
    taxableAmount: Number(item.taxableAmount),
    taxAmount: Number(item.taxAmount),
    taxBreakdown: getBookingTaxBreakdown(item.taxBreakdown),
    totalAmount: Number(item.totalAmount),
    finalAmount: Number(item.finalAmount),
  }));

export const buildBookingItemCreateInput = (
  space: spacesRepo.PublicSpaceRecord,
  target: spacesRepo.PublicSpaceTarget,
  nights: number,
  guestCount: number,
): Prisma.BookingItemCreateWithoutBookingInput => {
  const pricePerNight = Number(space.price);

  return {
    productId: space.productId,
    targetType: target.targetType,
    unitId: target.unitId,
    roomId: target.roomId,
    guestCount,
    comfortOption: spacesService.getSpaceComfortOption(space),
    targetLabel: target.roomId
      ? `${space.room?.name ?? "Room"} ${space.room?.number ?? ""}`.trim()
      : `Unit ${space.unit?.unitNumber ?? ""}`.trim(),
    productName: space.product.name,
    capacity: spacesService.getSpaceCapacity(space),
    pricePerNight,
    pricingId: space.id,
    subtotalAmount: pricePerNight * nights,
    discountAmount: 0,
    taxableAmount: pricePerNight * nights,
    taxAmount: 0,
    totalAmount: pricePerNight * nights,
    finalAmount: pricePerNight * nights,
  };
};

export const buildQuoteItemFromBookingInput = (
  item: Prisma.BookingItemCreateWithoutBookingInput,
  taxInclusive: boolean,
): PublicBookingQuoteItemDTO => ({
  targetType: item.targetType,
  unitId: typeof item.unitId === "string" ? item.unitId : null,
  roomId: typeof item.roomId === "string" ? item.roomId : null,
  productId: typeof item.productId === "string" ? item.productId : null,
  targetLabel: item.targetLabel,
  productName: item.productName,
  capacity: item.capacity,
  guestCount: item.guestCount ?? 1,
  comfortOption: item.comfortOption,
  pricePerNight: Number(item.pricePerNight),
  pricingId: typeof item.pricingId === "string" ? item.pricingId : null,
  subtotalAmount: Number(item.subtotalAmount ?? item.totalAmount),
  discountAmount: Number(item.discountAmount ?? 0),
  taxableAmount: Number(item.taxableAmount ?? item.totalAmount),
  taxAmount: Number(item.taxAmount ?? 0),
  taxBreakdown: getBookingTaxBreakdown(
    (item.taxBreakdown ?? null) as Prisma.JsonValue | null,
  ),
  totalAmount: Number(item.totalAmount),
  finalAmount: Number(item.finalAmount ?? item.totalAmount),
  taxInclusive,
});

export const buildOptionBookingItemCreateInput = (
  item: PublicInventoryItem,
  nights: number,
  comfortOption: ComfortOption,
): Prisma.BookingItemCreateWithoutBookingInput => ({
  productId: item.productId,
  targetType: item.target.targetType,
  unitId: item.target.unitId,
  roomId: item.target.roomId,
  guestCount: item.guestCount,
  comfortOption,
  targetLabel: item.publicLabel,
  productName: item.productName,
  capacity: item.capacity,
  pricePerNight: item.pricePerNight,
  pricingId: item.pricingId,
  subtotalAmount: item.pricePerNight * nights,
  discountAmount: 0,
  taxableAmount: item.pricePerNight * nights,
  taxAmount: 0,
  totalAmount: item.pricePerNight * nights,
  finalAmount: item.pricePerNight * nights,
});

export const buildQuoteItemFromOptionItem = (
  item: PublicInventoryItem,
  nights: number,
  comfortOption: ComfortOption,
): PublicBookingQuoteItemDTO =>
  buildQuoteItemFromBookingInput(
    buildOptionBookingItemCreateInput(item, nights, comfortOption),
    item.taxInclusive,
  );

export const buildBookingItemCreateInputFromQuoteItem = (
  item: PublicBookingQuoteItemDTO,
): Prisma.BookingItemCreateWithoutBookingInput => ({
  productId: item.productId,
  targetType: item.targetType,
  unitId: item.unitId,
  roomId: item.roomId,
  guestCount: item.guestCount,
  comfortOption: item.comfortOption,
  targetLabel: item.targetLabel,
  productName: item.productName,
  capacity: item.capacity,
  pricePerNight: item.pricePerNight,
  pricingId: item.pricingId,
  subtotalAmount: item.subtotalAmount,
  discountAmount: item.discountAmount,
  taxableAmount: item.taxableAmount,
  taxAmount: item.taxAmount,
  ...(item.taxBreakdown.length > 0 && {
    taxBreakdown: toTaxBreakdownJson(item.taxBreakdown),
  }),
  totalAmount: item.totalAmount,
  finalAmount: item.finalAmount,
});

export const buildQuoteItemsFromBooking = (
  booking: repo.PublicBookingRecord,
): PublicBookingQuoteItemDTO[] =>
  booking.items.map((item) => {
    const taxBreakdown = getBookingTaxBreakdown(item.taxBreakdown);

    return {
      targetType: item.targetType,
      unitId: item.unitId ?? null,
      roomId: item.roomId ?? null,
      productId: item.productId ?? null,
      targetLabel: item.targetLabel,
      productName: item.productName,
      capacity: item.capacity,
      guestCount: item.guestCount,
      comfortOption: item.comfortOption,
      pricePerNight: Number(item.pricePerNight),
      pricingId: item.pricingId ?? null,
      subtotalAmount: Number(item.subtotalAmount),
      discountAmount: 0,
      taxableAmount: Number(item.totalAmount),
      taxAmount: 0,
      taxBreakdown: [],
      totalAmount: Number(item.totalAmount),
      finalAmount: Number(item.totalAmount),
      taxInclusive: taxBreakdown.some((tax) => tax.included),
    };
  });
