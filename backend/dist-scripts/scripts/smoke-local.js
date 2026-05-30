const apiBaseUrl = process.env.SMOKE_BASE_URL ?? process.env.API_BASE_URL ?? "http://localhost:4000";
const apiPrefix = process.env.API_PREFIX ?? "/api/v1";
const credentials = {
    guest: {
        email: process.env.SMOKE_GUEST_EMAIL ?? "guest@sucasa.com",
        password: process.env.SMOKE_GUEST_PASSWORD ?? "Guest@123",
    },
    dashboardAdmin: {
        email: process.env.SMOKE_DASHBOARD_EMAIL ?? "superadmin@sucasa.com",
        password: process.env.SMOKE_DASHBOARD_PASSWORD ?? "SuperAdmin@123",
    },
};
const endpoint = (path) => `${apiBaseUrl}${path}`;
const apiEndpoint = (path) => endpoint(`${apiPrefix}${path}`);
const assertOk = async (label, response) => {
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`${label} failed: ${response.status} ${body}`);
    }
};
const login = async (label, email, password) => {
    const response = await fetch(apiEndpoint("/auth/login"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });
    await assertOk(label, response);
    const payload = (await response.json());
    return payload.data.accessToken;
};
const getJson = async (label, url, accessToken) => {
    const response = await fetch(url, {
        headers: {
            ...(accessToken !== undefined && {
                Authorization: `Bearer ${accessToken}`,
            }),
        },
    });
    await assertOk(label, response);
    return response.json();
};
const postJson = async (label, url, body, accessToken, headers = {}) => {
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
    return response.json();
};
const checks = [
    {
        label: "backend health",
        run: () => getJson("backend health", endpoint("/health")),
    },
    {
        label: "public spaces",
        run: () => getJson("public spaces", apiEndpoint("/public/spaces")),
    },
    {
        label: "public tenant config",
        run: () => getJson("public tenant config", apiEndpoint("/public/tenant-config?tenantSlug=sucasa")),
    },
    {
        label: "guest login",
        run: () => login("guest login", credentials.guest.email, credentials.guest.password),
    },
    {
        label: "dashboard admin login",
        run: () => login("dashboard admin login", credentials.dashboardAdmin.email, credentials.dashboardAdmin.password),
    },
    {
        label: "dashboard /me",
        run: async () => {
            const accessToken = await login("dashboard admin login", credentials.dashboardAdmin.email, credentials.dashboardAdmin.password);
            return getJson("dashboard /me", apiEndpoint("/dashboard/me"), accessToken);
        },
    },
    {
        label: "public booking manual payment",
        run: async () => {
            const accessToken = await login("guest login", credentials.guest.email, credentials.guest.password);
            const spaces = (await getJson("public spaces", apiEndpoint("/public/spaces?tenantSlug=sucasa")));
            const space = spaces.data[0];
            if (!space) {
                throw new Error("public booking manual payment failed: no spaces found");
            }
            let booking;
            for (let attempt = 0; attempt < 10; attempt += 1) {
                const dayOffset = 730 + attempt * 31 + Math.floor(Math.random() * 20);
                const checkIn = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
                const checkOut = new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);
                try {
                    booking = (await postJson("public booking", apiEndpoint("/public/bookings?tenantSlug=sucasa"), {
                        spaceId: space.id,
                        from: checkIn.toISOString(),
                        to: checkOut.toISOString(),
                    }, accessToken));
                    break;
                }
                catch (error) {
                    if (error instanceof Error &&
                        error.message.includes("SPACE_NOT_AVAILABLE")) {
                        continue;
                    }
                    throw error;
                }
            }
            if (!booking) {
                throw new Error("public booking manual payment failed: no available smoke date found");
            }
            return postJson("public booking manual payment", apiEndpoint(`/public/bookings/${booking.data.id}/payments/manual`), {}, accessToken, {
                "Idempotency-Key": `smoke-${Date.now()}-${booking.data.id}`,
            });
        },
    },
];
for (const check of checks) {
    await check.run();
    console.log(`ok - ${check.label}`);
}
export {};
//# sourceMappingURL=smoke-local.js.map