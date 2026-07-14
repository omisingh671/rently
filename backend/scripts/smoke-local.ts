type LoginResponse = {
  success: boolean;
  data: {
    accessToken: string;
  };
};

type SpacesResponse = {
  success: boolean;
  data: Array<{
    id: string;
  }>;
};

type BookingResponse = {
  success: boolean;
  data: {
    id: string;
  };
};

const apiBaseUrl =
  process.env.SMOKE_BASE_URL ?? process.env.API_BASE_URL ?? "http://localhost:4000";
const apiPrefix = process.env.API_PREFIX ?? "/api/v1";
const requiredEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for the local smoke test`);
  }
  return value;
};

const endpoint = (path: string) => `${apiBaseUrl}${path}`;
const apiEndpoint = (path: string) => endpoint(`${apiPrefix}${path}`);

const assertOk = async (label: string, response: Response) => {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${label} failed: ${response.status} ${body}`);
  }
};

const login = async (
  label: string,
  email: string,
  password: string,
  appClient: "frontend" | "dashboard",
) => {
  const response = await fetch(apiEndpoint("/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Client": appClient,
    },
    body: JSON.stringify({ email, password }),
  });

  await assertOk(label, response);
  const payload = (await response.json()) as LoginResponse;
  return payload.data.accessToken;
};

const getJson = async (
  label: string,
  url: string,
  accessToken?: string,
  appClient?: "frontend" | "dashboard",
) => {
  const response = await fetch(url, {
    headers: {
      ...(appClient !== undefined && { "X-App-Client": appClient }),
      ...(accessToken !== undefined && {
        Authorization: `Bearer ${accessToken}`,
      }),
    },
  });

  await assertOk(label, response);
  return response.json() as Promise<unknown>;
};

const postJson = async (
  label: string,
  url: string,
  body: unknown,
  accessToken?: string,
  headers: Record<string, string> = {},
) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(accessToken !== undefined && {
        Authorization: `Bearer ${accessToken}`,
      }),
    },
    body: JSON.stringify(body),
  });

  await assertOk(label, response);
  return response.json() as Promise<unknown>;
};

try {
  const tenantSlug = requiredEnv("SMOKE_TENANT_SLUG");
  const tenantQuery = `tenantSlug=${encodeURIComponent(tenantSlug)}`;
  const credentials = {
    guest: {
      email: requiredEnv("SMOKE_GUEST_EMAIL"),
      password: requiredEnv("SMOKE_GUEST_PASSWORD"),
    },
    dashboardAdmin: {
      email: requiredEnv("SMOKE_DASHBOARD_EMAIL"),
      password: requiredEnv("SMOKE_DASHBOARD_PASSWORD"),
    },
  } as const;

  const checks = [
    {
      label: "backend health",
      run: () => getJson("backend health", endpoint("/health")),
    },
    {
      label: "public spaces",
      run: () =>
        getJson("public spaces", apiEndpoint(`/public/spaces?${tenantQuery}`)),
    },
    {
      label: "public tenant config",
      run: () =>
        getJson(
          "public tenant config",
          apiEndpoint(`/public/tenant-config?${tenantQuery}`),
        ),
    },
    {
      label: "guest login",
      run: () =>
        login(
          "guest login",
          credentials.guest.email,
          credentials.guest.password,
          "frontend",
        ),
    },
    {
      label: "dashboard admin login",
      run: () =>
        login(
          "dashboard admin login",
          credentials.dashboardAdmin.email,
          credentials.dashboardAdmin.password,
          "dashboard",
        ),
    },
    {
      label: "dashboard /me",
      run: async () => {
        const accessToken = await login(
          "dashboard admin login",
          credentials.dashboardAdmin.email,
          credentials.dashboardAdmin.password,
          "dashboard",
        );
        return getJson(
          "dashboard /me",
          apiEndpoint("/auth/me"),
          accessToken,
          "dashboard",
        );
      },
    },
    {
      label: "public booking manual payment",
      run: async () => {
        const accessToken = await login(
          "guest login",
          credentials.guest.email,
          credentials.guest.password,
          "frontend",
        );
        const spaces = (await getJson(
          "public spaces",
          apiEndpoint(`/public/spaces?${tenantQuery}`),
        )) as SpacesResponse;
        const space = spaces.data[0];

        if (!space) {
          throw new Error("public booking manual payment failed: no spaces found");
        }

        let booking: BookingResponse | undefined;
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const dayOffset = 730 + attempt * 31 + Math.floor(Math.random() * 20);
          const checkIn = new Date(
            Date.now() + dayOffset * 24 * 60 * 60 * 1000,
          );
          const checkOut = new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);

          try {
            booking = (await postJson(
              "public booking",
              apiEndpoint(`/public/bookings?${tenantQuery}`),
              {
                spaceId: space.id,
                from: checkIn.toISOString(),
                to: checkOut.toISOString(),
                guests: 1,
                comfortOption: "AC",
              },
              accessToken,
              {
                "X-App-Client": "frontend",
              },
            )) as BookingResponse;
            break;
          } catch (error) {
            if (
              error instanceof Error &&
              error.message.includes("SPACE_NOT_AVAILABLE")
            ) {
              continue;
            }

            throw error;
          }
        }

        if (!booking) {
          throw new Error(
            "public booking manual payment failed: no available smoke date found",
          );
        }

        return postJson(
          "public booking manual payment",
          apiEndpoint(`/public/bookings/${booking.data.id}/payments/manual`),
          {},
          accessToken,
          {
            "X-App-Client": "frontend",
            "Idempotency-Key": `smoke-${Date.now()}-${booking.data.id}`,
          },
        );
      },
    },
  ] as const;

  for (const check of checks) {
    await check.run();
    console.log(`ok - ${check.label}`);
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
