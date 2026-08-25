import assert from "node:assert/strict";
import test from "node:test";
import {
  createDashboardTeamUserSchema,
  createLegacyAdminSchema,
  listTeamUsersQuerySchema,
  updateUserSchema,
} from "./users.schema.js";

const baseUser = {
  fullName: "Team User",
  email: "team.user@example.com",
  password: "password123",
};

test("accepts each supported team-user role", () => {
  for (const role of ["MANAGER", "FRONT_DESK", "ACCOUNTANT"] as const) {
    assert.equal(
      createDashboardTeamUserSchema.safeParse({ ...baseUser, role }).success,
      true,
    );
  }
});

test("rejects roles that an admin cannot create", () => {
  for (const role of ["SUPER_ADMIN", "ADMIN", "GUEST"] as const) {
    assert.equal(
      createDashboardTeamUserSchema.safeParse({ ...baseUser, role }).success,
      false,
    );
  }
});

test("legacy creation accepts only the Admin role", () => {
  assert.equal(
    createLegacyAdminSchema.safeParse({ ...baseUser, role: "ADMIN" }).success,
    true,
  );
  assert.equal(
    createLegacyAdminSchema.safeParse({ ...baseUser, role: "SUPER_ADMIN" })
      .success,
    false,
  );
});

test("generic detail updates do not expose role or status fields", () => {
  const result = updateUserSchema.parse({
    fullName: "Updated User",
    role: "SUPER_ADMIN",
    isActive: false,
  });

  assert.deepEqual(result, { fullName: "Updated User" });
});

test("allows an optional supported role filter and rejects other roles", () => {
  assert.equal(listTeamUsersQuerySchema.safeParse({}).success, true);
  assert.equal(
    listTeamUsersQuerySchema.safeParse({ role: "ACCOUNTANT" }).success,
    true,
  );
  assert.equal(
    listTeamUsersQuerySchema.safeParse({ role: "ADMIN" }).success,
    false,
  );
});
