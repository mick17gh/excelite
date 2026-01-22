import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(request.url);
  const callbackURL = searchParams.get("callbackURL");

  // Redirect to our custom reset password page with the token
  const resetUrl = new URL("/auth/reset-password", request.url);
  resetUrl.searchParams.set("token", token);
  
  return NextResponse.redirect(resetUrl);
}
