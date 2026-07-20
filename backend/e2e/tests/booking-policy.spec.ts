import { e2eFixture } from "../fixtures.js";
import { apiPrefix, bearerHeaders, loginDashboard } from "../helpers.js";
import { expect, test } from "../test.js";

type PolicyResponse = {
  version: number;
  advancePaymentType: "NONE" | "FIXED_AMOUNT" | "PERCENTAGE";
  advancePaymentValue: string;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  pendingPaymentExpiryMinutes: number;
  cancellationRules: Record<string, unknown>;
  refundRules: Record<string, unknown>;
  earlyCheckInRules: Record<string, unknown>;
  earlyCheckoutRules: Record<string, unknown>;
  lateCheckoutRules: Record<string, unknown>;
  downgradeRules: Record<string, unknown>;
  noShowRules: Record<string, unknown>;
  guestPolicyText: string;
};

const unwrapData = async <T>(response: { json: () => Promise<unknown> }) => {
  const body = (await response.json()) as { data: T };
  return body.data;
};

const toUpdatePayload = (policy: PolicyResponse) => ({
  expectedVersion: policy.version,
  advancePaymentType: policy.advancePaymentType,
  advancePaymentValue: Number(policy.advancePaymentValue),
  tokenRefundable: policy.tokenRefundable,
  checkInTime: policy.checkInTime,
  checkOutTime: policy.checkOutTime,
  pendingPaymentExpiryMinutes: policy.pendingPaymentExpiryMinutes,
  cancellationRules: policy.cancellationRules,
  refundRules: policy.refundRules,
  earlyCheckInRules: policy.earlyCheckInRules,
  earlyCheckoutRules: policy.earlyCheckoutRules,
  lateCheckoutRules: policy.lateCheckoutRules,
  downgradeRules: policy.downgradeRules,
  noShowRules: policy.noShowRules,
  guestPolicyText: policy.guestPolicyText,
});

test("unchanged booking policy saves do not create versions or audit rows", async ({
  request,
}) => {
  const auth = await loginDashboard(request, e2eFixture.users.superAdmin);
  const headers = bearerHeaders(auth.accessToken);
  const policyUrl = `${apiPrefix}/properties/${e2eFixture.property.id}/booking-policy`;
  const auditUrl = `${policyUrl}/audits`;

  const initialPolicyResponse = await request.get(policyUrl, { headers });
  expect(initialPolicyResponse.status()).toBe(200);
  const initialPolicy = await unwrapData<PolicyResponse>(initialPolicyResponse);

  const initialAuditsResponse = await request.get(auditUrl, { headers });
  expect(initialAuditsResponse.status()).toBe(200);
  const initialAudits = await unwrapData<unknown[]>(initialAuditsResponse);

  const noOpResponse = await request.put(policyUrl, {
    headers,
    data: toUpdatePayload(initialPolicy),
  });
  expect(noOpResponse.status()).toBe(200);
  const unchangedPolicy = await unwrapData<PolicyResponse>(noOpResponse);
  expect(unchangedPolicy.version).toBe(initialPolicy.version);

  const unchangedAuditsResponse = await request.get(auditUrl, { headers });
  const unchangedAudits = await unwrapData<unknown[]>(unchangedAuditsResponse);
  expect(unchangedAudits).toHaveLength(initialAudits.length);

  const changedResponse = await request.put(policyUrl, {
    headers,
    data: {
      ...toUpdatePayload(initialPolicy),
      guestPolicyText: `${initialPolicy.guestPolicyText} Updated`,
    },
  });
  expect(changedResponse.status()).toBe(200);
  const changedPolicy = await unwrapData<PolicyResponse>(changedResponse);
  expect(changedPolicy.version).toBe(initialPolicy.version + 1);

  const changedAuditsResponse = await request.get(auditUrl, { headers });
  const changedAudits = await unwrapData<unknown[]>(changedAuditsResponse);
  expect(changedAudits).toHaveLength(initialAudits.length + 1);
});
