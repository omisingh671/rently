export const e2eFixture = {
  tenant: {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "e2e-tenant",
  },
  foreignTenant: {
    id: "00000000-0000-4000-8000-000000000002",
    slug: "e2e-foreign-tenant",
  },
  property: {
    id: "00000000-0000-4000-8000-000000000010",
    slug: "e2e-property",
  },
  outOfScopeProperty: {
    id: "00000000-0000-4000-8000-000000000011",
    slug: "e2e-out-of-scope",
  },
  foreignProperty: {
    id: "00000000-0000-4000-8000-000000000012",
    slug: "e2e-foreign-property",
  },
  unitId: "00000000-0000-4000-8000-000000000020",
  foreignUnitId: "00000000-0000-4000-8000-000000000120",
  roomId: "00000000-0000-4000-8000-000000000030",
  upgradeRoomId: "00000000-0000-4000-8000-000000000031",
  downgradeRoomId: "00000000-0000-4000-8000-000000000032",
  foreignRoomId: "00000000-0000-4000-8000-000000000130",
  productId: "00000000-0000-4000-8000-000000000040",
  foreignProductId: "00000000-0000-4000-8000-000000000140",
  pricingId: "00000000-0000-4000-8000-000000000050",
  upgradePricingId: "00000000-0000-4000-8000-000000000051",
  downgradePricingId: "00000000-0000-4000-8000-000000000052",
  foreignPricingId: "00000000-0000-4000-8000-000000000150",
  users: {
    superAdmin: {
      id: "00000000-0000-4000-8000-000000000101",
      email: "super-admin@e2e.rently.test",
      password: "E2ePassword!123",
    },
    admin: {
      id: "00000000-0000-4000-8000-000000000102",
      email: "admin@e2e.rently.test",
      password: "E2ePassword!123",
    },
    manager: {
      id: "00000000-0000-4000-8000-000000000103",
      email: "manager@e2e.rently.test",
      password: "E2ePassword!123",
    },
    frontDesk: {
      id: "00000000-0000-4000-8000-000000000104",
      email: "front-desk@e2e.rently.test",
      password: "E2ePassword!123",
    },
    accountant: {
      id: "00000000-0000-4000-8000-000000000105",
      email: "accountant@e2e.rently.test",
      password: "E2ePassword!123",
    },
    guest: {
      id: "00000000-0000-4000-8000-000000000106",
      email: "guest@e2e.rently.test",
      password: "E2ePassword!123",
    },
    guestTwo: {
      id: "00000000-0000-4000-8000-000000000107",
      email: "guest-two@e2e.rently.test",
      password: "E2ePassword!123",
    },
  },
} as const;
