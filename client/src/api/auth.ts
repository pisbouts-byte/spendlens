import type { ApiResponse, AuthResponse } from "@spendlens/shared";
import client from "./client.ts";

export async function registerUser(data: {
  email: string;
  password: string;
  name?: string;
}) {
  const res = await client.post<ApiResponse<AuthResponse>>(
    "/auth/register",
    data,
  );
  return res.data.data;
}

export async function loginUser(data: { email: string; password: string }) {
  const res = await client.post<ApiResponse<AuthResponse>>(
    "/auth/login",
    data,
  );
  return res.data.data;
}

export async function getMe() {
  const res = await client.get<
    ApiResponse<{ id: string; email: string; name: string | null }>
  >("/auth/me");
  return res.data.data;
}

export async function forgotPassword(email: string) {
  const res = await client.post<ApiResponse<{ message: string }>>(
    "/auth/forgot-password",
    { email },
  );
  return res.data.data;
}

export async function resetPassword(token: string, password: string) {
  const res = await client.post<ApiResponse<{ message: string }>>(
    "/auth/reset-password",
    { token, password },
  );
  return res.data.data;
}
