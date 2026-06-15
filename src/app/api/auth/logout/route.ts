import { NextResponse } from "next/server";
import { defaultSession, getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  Object.assign(session, defaultSession);
  await session.save();
  return NextResponse.json({ ok: true });
}
