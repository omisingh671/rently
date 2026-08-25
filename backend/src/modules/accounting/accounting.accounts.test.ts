import assert from "node:assert/strict";
import test from "node:test";
import { LedgerSystemKey, PaymentMethod } from "@/generated/prisma/client.js";
import {
  systemAccountDefinitions,
  tenderAccountForMethod,
} from "./accounting.accounts.js";

test("system chart of accounts has unique keys and codes", () => {
  assert.equal(
    new Set(systemAccountDefinitions.map(([key]) => key)).size,
    systemAccountDefinitions.length,
  );
  assert.equal(
    new Set(systemAccountDefinitions.map(([, code]) => code)).size,
    systemAccountDefinitions.length,
  );
});

test("every payment method maps to a deterministic tender account", () => {
  assert.equal(
    tenderAccountForMethod(PaymentMethod.CASH),
    LedgerSystemKey.CASH,
  );
  assert.equal(
    tenderAccountForMethod(PaymentMethod.ONLINE_GATEWAY),
    LedgerSystemKey.ONLINE_GATEWAY_CLEARING,
  );
  for (const method of Object.values(PaymentMethod)) {
    assert.ok(tenderAccountForMethod(method));
  }
});
