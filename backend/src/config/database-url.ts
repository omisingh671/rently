import { DATABASE_DEFAULTS } from "@/common/constants/application.constants.js";

export const parseDatabaseUrl = (value: string) => {
  const url = new URL(value);
  if (url.protocol !== "mysql:") {
    throw new Error("DATABASE_URL must use the mysql protocol");
  }

  const database = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  if (!url.hostname || !url.username || !database) {
    throw new Error("DATABASE_URL must include host, user, and database name");
  }

  const configuredPort = url.port
    ? Number(url.port)
    : DATABASE_DEFAULTS.port;
  if (!Number.isInteger(configuredPort) || configuredPort <= 0) {
    throw new Error("DATABASE_URL contains an invalid port");
  }

  return {
    host: url.hostname,
    port: configuredPort,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: DATABASE_DEFAULTS.connectionLimit,
    allowPublicKeyRetrieval:
      url.searchParams.get("allowPublicKeyRetrieval") !== "false",
    ssl: url.searchParams.get("ssl") === "true",
  };
};
