import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/imanage/auth";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { tenant, custId, username, password } = await req.json();
    if (!tenant || !custId || !username || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const { authToken, baseUrl } = await authenticate({ tenant, custId, username, password });
    const session = await getSession();
    session.authToken = authToken;
    session.tenant = tenant;
    session.custId = custId;
    session.baseUrl = baseUrl;
    session.username = username;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ ok: true, username });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
