import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXP = "15m";
const REFRESH_TOKEN_EXP = "30d";

const ACCESS_COOKIE_NAME = "access_token";
const REFRESH_COOKIE_NAME = "refresh_token";

function getCookieOpts(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: maxAgeMs,
    path: "/",
  };
}

export function signAccessToken(payload: object) {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_EXP });
}

export function signRefreshToken(payload: object) {
  const secret = process.env.JWT_REFRESH_SECRET as string;
  return jwt.sign(payload, secret, { expiresIn: REFRESH_TOKEN_EXP });
}

export function verifyAccessToken(token: string) {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  return jwt.verify(token, secret);
}

export function verifyRefreshToken(token: string) {
  const secret = process.env.JWT_REFRESH_SECRET as string;
  return jwt.verify(token, secret);
}

export const cookieNames = {
  access: ACCESS_COOKIE_NAME,
  refresh: REFRESH_COOKIE_NAME,
};

export const cookieOptions = {
  access: () => getCookieOpts(15 * 60 * 1000),
  refresh: () => getCookieOpts(30 * 24 * 60 * 60 * 1000),
};

export default {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  cookieNames,
  cookieOptions,
};

