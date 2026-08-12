import assert from "node:assert/strict";
import test from "node:test";

import { parseDatabaseUrl } from "./database-url.js";

test("parseDatabaseUrl maps one MySQL URL to the runtime adapter config", () => {
  assert.deepEqual(
    parseDatabaseUrl(
      "mysql://rently:p%40ss@db.internal:3307/rently_db?allowPublicKeyRetrieval=false&ssl=true",
    ),
    {
      host: "db.internal",
      port: 3307,
      user: "rently",
      password: "p@ss",
      database: "rently_db",
      connectionLimit: 5,
      allowPublicKeyRetrieval: false,
      ssl: true,
    },
  );
});

test("parseDatabaseUrl applies safe connection defaults", () => {
  const config = parseDatabaseUrl("mysql://user:password@localhost/rently_db");

  assert.equal(config.port, 3306);
  assert.equal(config.connectionLimit, 5);
  assert.equal(config.allowPublicKeyRetrieval, true);
  assert.equal(config.ssl, false);
});

test("parseDatabaseUrl rejects incomplete or unsupported URLs", () => {
  assert.throws(
    () => parseDatabaseUrl("postgresql://user:password@localhost/rently_db"),
    /mysql protocol/,
  );
  assert.throws(
    () => parseDatabaseUrl("mysql://user:password@localhost"),
    /host, user, and database name/,
  );
});
