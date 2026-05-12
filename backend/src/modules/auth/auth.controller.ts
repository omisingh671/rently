import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { env } from "@/config/env.js";
import { HttpError } from "@/common/errors/http-error.js";

import * as service from "./auth.service.js";

import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "./auth.schema.js";

import type {
  LoginUserInput,
  RegisterUserInput,
  ChangePasswordInput,
} from "./auth.inputs.js";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: `${env.API_PREFIX}/auth`,
};

/**
 * REGISTER
 */
export const register = async (req: AuthRequest, res: Response) => {
  const body = registerSchema.parse(req.body);

  const input: RegisterUserInput = {
    fullName: body.fullName,
    email: body.email,
    password: body.password,
    ...(body.countryCode !== undefined &&
      body.contactNumber !== undefined && {
        countryCode: body.countryCode,
        contactNumber: body.contactNumber,
      }),
  };

  await service.registerUser(input);

  res.status(201).json({
    success: true,
    message: "Registration successful. Please login.",
  });
};

/**
 * LOGIN
 */
export const login = async (req: AuthRequest, res: Response) => {
  const body = loginSchema.parse(req.body);

  const input: LoginUserInput = {
    email: body.email,
    password: body.password,
  };

  const { auth, refreshToken } = await service.loginUser(
    input,
    req.ip,
    req.headers["user-agent"],
  );

  res
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json({ success: true, data: auth });
};

/**
 * REFRESH
 */
export const refresh = async (req: AuthRequest, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    throw new HttpError(401, "UNAUTHORIZED", "Missing refresh token");
  }

  const auth = await service.refreshSession(refreshToken);
  res.json({ success: true, data: auth });
};

/**
 * LOGOUT
 */
export const logout = async (req: AuthRequest, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    await service.logoutUser(refreshToken);
  }

  res.clearCookie("refreshToken", cookieOptions).status(204).send();
};

/**
 * ME
 */
export const me = async (req: AuthRequest, res: Response) => {
  const user = await service.getCurrentUser(req.user!.userId);
  res.json({ success: true, data: { user } });
};

/**
 * FORGOT PASSWORD
 */
export const forgotPassword = async (req: AuthRequest, res: Response) => {
  const body = forgotPasswordSchema.parse(req.body);

  await service.forgotPassword({ email: body.email });

  return res.status(204).send();
};

/**
 * RESET PASSWORD
 */
export const resetPassword = async (req: AuthRequest, res: Response) => {
  const body = resetPasswordSchema.parse(req.body);

  await service.resetPassword({
    token: body.token,
    password: body.password,
  });

  return res.status(204).send();
};

/**
 * CHANGE PASSWORD (authenticated)
 */
export const changePassword = async (req: AuthRequest, res: Response) => {
  const body = changePasswordSchema.parse(req.body);

  const input: ChangePasswordInput = {
    userId: req.user!.userId,
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
  };

  await service.changePassword(input);

  return res.status(204).send();
};
