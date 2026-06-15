import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { SessionData } from "@/types";

export const defaultSession: SessionData = {
  authToken: "",
  tenant: "",
  custId: "",
  baseUrl: "",
  username: "",
  isLoggedIn: false,
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "development-only-secret-min-32-chars!!",
  cookieName: "imanage_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
