import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRouteClient } from "../../../../lib/supabase/admin";
import {
  buildBirdyMemory,
  type CreateBirdyMemoryInput,
} from "../../../../lib/platform/birdyMemory";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAuthenticatedRouteClient(accessToken);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const product = request.nextUrl.searchParams.get("product");
  const memoryType = request.nextUrl.searchParams.get("type");

  let query = supabase
    .from("birdy_memories")
    .select(
      "id, product, memory_type, title, content, source, confidence, sensitivity, is_active, is_user_confirmed, last_used_at, expires_at, metadata, created_at, updated_at"
    )
    .eq("owner_id", user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (product && product !== "all") {
    query = query.eq("product", product);
  }

  if (memoryType && memoryType !== "all") {
    query = query.eq("memory_type", memoryType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ memories: data || [] });
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAuthenticatedRouteClient(accessToken);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Partial<CreateBirdyMemoryInput>;

  try {
    body = (await request.json()) as Partial<CreateBirdyMemoryInput>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.product || !body.memoryType || !body.title || !body.content) {
    return NextResponse.json(
      {
        error: "product, memoryType, title, and content are required",
      },
      { status: 400 }
    );
  }

  const payload = buildBirdyMemory({
    ownerId: user.id,
    product: body.product,
    memoryType: body.memoryType,
    title: body.title.trim(),
    content: body.content.trim(),
    source: body.source,
    confidence: body.confidence,
    sensitivity: body.sensitivity,
    isUserConfirmed: body.isUserConfirmed,
    expiresAt: body.expiresAt,
    metadata: body.metadata,
  });

  const { data, error } = await supabase
    .from("birdy_memories")
    .insert({
      ...payload,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ memory: data }, { status: 201 });
}
