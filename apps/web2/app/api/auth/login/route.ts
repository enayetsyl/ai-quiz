import { NextRequest, NextResponse } from "next/server";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  COOKIE_NAMES,
} from "@/lib/cookies";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4080";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Call Express backend
    const expressResponse = await fetch(`${API_BASE_URL}/api/v1/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await expressResponse.json();

    if (!expressResponse.ok) {
      return NextResponse.json(data, { status: expressResponse.status });
    }

    // Set cookies from tokens in response
    const nextResponse = NextResponse.json({ success: true });

    if (data.success && data.data?.tokens) {
      const { access, refresh } = data.data.tokens;
      console.log("access token", access);
      console.log("refresh token", refresh);
      // Set access token cookie with consistent options
      nextResponse.cookies.set(
        COOKIE_NAMES.ACCESS_TOKEN,
        access,
        getAccessTokenCookieOptions()
      );

      // Set refresh token cookie with consistent options
      nextResponse.cookies.set(
        COOKIE_NAMES.REFRESH_TOKEN,
        refresh,
        getRefreshTokenCookieOptions()
      );
    }

    // Return success response without tokens
    return nextResponse;
  } catch (error) {
    console.error("Login API route error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
