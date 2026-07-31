import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Deposit checkout is not available yet.",
      code: "DEPOSIT_CHECKOUT_NOT_IMPLEMENTED",
    },
    { status: 501 },
  );
}
