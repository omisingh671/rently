import assert from "node:assert/strict";
import test from "node:test";
import {
  createDashboardTeamUserSchema,
  listTeamUsersQuerySchema,
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
