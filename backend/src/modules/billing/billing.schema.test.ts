import assert from "node:assert/strict";
import test from "node:test";
import { updateBillingSettingSchema } from "./billing.schema.js";

test("requires a meaningful reason for billing-setting changes", () => {
  assert.equal(
    updateBillingSettingSchema.safeParse({ invoicePrefix: "NEW-" }).success,
    false,
  );
  assert.equal(
    updateBillingSettingSchema.safeParse({
      reason: "test",
      invoicePrefix: "NEW-",
    }).success,
    false,
  );
  assert.equal(
    updateBillingSettingSchema.safeParse({
      reason: "New financial-year numbering",
      invoicePrefix: "FY27-",
    }).success,
    true,
  );
});
