import crypto from "node:crypto";

export const hashRefreshToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const refreshTokenMatches = (
  storedToken: string,
  presentedToken: string,
) =>
  storedToken === presentedToken ||
  storedToken === hashRefreshToken(presentedToken);
