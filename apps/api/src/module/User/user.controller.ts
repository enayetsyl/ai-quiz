import { Request, Response } from "express";
import * as service from "./user.service";
import jwtLib from "../../lib/jwt";
import { sendResponse, HttpError } from "../../lib/http";

export async function register(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await service.registerUser(email, password);
  return sendResponse(res, {
    success: true,
    data: { id: user.id, email: user.email },
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await service.verifyCredentials(email, password);
  if (!user)
    throw new HttpError("Invalid credentials", 401, "invalid_credentials");
  const tokens = service.createTokensForUser(user);
  res.cookie(
    jwtLib.cookieNames.access,
    tokens.access,
    jwtLib.cookieOptions.access()
  );
  res.cookie(
    jwtLib.cookieNames.refresh,
    tokens.refresh,
    jwtLib.cookieOptions.refresh()
  );
  return sendResponse(res, { success: true });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(jwtLib.cookieNames.access);
  res.clearCookie(jwtLib.cookieNames.refresh);
  return sendResponse(res, { success: true });
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[jwtLib.cookieNames.refresh];
  if (!token) throw new HttpError("No refresh token", 401, "no_refresh_token");
  const payload = jwtLib.verifyRefreshToken(token) as any;
  const { access, refresh } = service.createTokensForUser({
    id: payload.userId,
    role: payload.role,
  });
  res.cookie(jwtLib.cookieNames.access, access, jwtLib.cookieOptions.access());
  res.cookie(
    jwtLib.cookieNames.refresh,
    refresh,
    jwtLib.cookieOptions.refresh()
  );
  return sendResponse(res, { success: true });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  const user = await service.findUserByEmail(email);
  if (!user) return sendResponse(res, { success: true });
  const token = await service.generatePasswordResetToken(user.id);
  await service.sendResetEmail(email, token);
  return sendResponse(res, { success: true });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body;
  try {
    await service.consumeResetToken(token, password);
    return sendResponse(res, { success: true });
  } catch (err) {
    throw new HttpError(
      (err as Error).message || "Invalid token",
      400,
      "invalid_token"
    );
  }
}

export default {
  register,
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
};
