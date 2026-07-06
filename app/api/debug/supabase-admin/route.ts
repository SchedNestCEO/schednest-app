import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getProjectRefFromUrl(url: string | undefined) {
  if (!url) return null;

  return url
    .replace("https://", "")
    .replace("http://", "")
    .split(".")[0];
}

function decodeJwtPayload(token: string | undefined) {
  if (!token || !token.startsWith("eyJ")) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString()
    );

    return {
      role: payload.role || null,
      ref: payload.ref || null,
      issuer: payload.iss || null,
      aud: payload.aud || null,
      exp: payload.exp
        ? new Date(payload.exp * 1000).toISOString()
        : null,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const decodedServiceRole = decodeJwtPayload(serviceRoleKey);

  let supabaseStatus: number | null = null;
  let supabaseResponse = "";

  if (supabaseUrl && serviceRoleKey) {
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        cache: "no-store",
      });

      supabaseStatus = response.status;
      supabaseResponse = (await response.text()).slice(0, 250);
    } catch (error) {
      supabaseResponse =
        error instanceof Error ? error.message : "Supabase fetch failed.";
    }
  }

  return NextResponse.json({
    supabaseUrl: {
      exists: Boolean(supabaseUrl),
      projectRef: getProjectRefFromUrl(supabaseUrl),
    },
    serviceRoleKey: {
      exists: Boolean(serviceRoleKey),
      length: serviceRoleKey?.length || 0,
      decoded: decodedServiceRole,
    },
    serviceRoleTest: {
      status: supabaseStatus,
      response: supabaseResponse,
    },
  });
}