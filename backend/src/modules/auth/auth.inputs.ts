export interface LoginUserInput {
  email: string;
  password: string;
}

export interface RegisterUserInput {
  fullName: string;
  email: string;
  password: string;
  countryCode?: string;
  contactNumber?: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}
