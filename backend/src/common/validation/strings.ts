import { z } from "zod";

export const optionalStringFromForm = (max: number) =>
  z.preprocess((v) => {
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t === "" ? undefined : t;
  }, z.string().max(max).optional());
