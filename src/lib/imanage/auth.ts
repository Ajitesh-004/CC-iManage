const CLIENT_ID = process.env.OAUTH_CLIENT_ID || "web";
const CLIENT_SECRET =
  process.env.OAUTH_CLIENT_SECRET || "49e6d46f-f811-49ab-9437-0553806102b2";

export interface LoginCredentials {
  tenant: string;
  custId: string;
  username: string;
  password: string;
}

export async function authenticate(creds: LoginCredentials): Promise<{
  authToken: string;
  baseUrl: string;
}> {
  const tokenUrl = `https://${creds.tenant}/auth/oauth2/token`;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    username: creds.username,
    password: creds.password,
    grant_type: "password",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json().catch(() => ({}));
  const authToken = data?.access_token;

  if (!authToken) {
    throw new Error("Authentication failed. Check tenant, credentials, and customer ID.");
  }

  return {
    authToken,
    baseUrl: `https://${creds.tenant}/work/cc/api/v2/customers/${creds.custId}`,
  };
}
