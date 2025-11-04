import { NextRequest, NextResponse } from "next/server";
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  COOKIE_NAMES,
} from "@/lib/cookies";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4080";

export async function POST(request: NextRequest) {
  try {
    // Get all cookies from the request to forward to Express
    const allCookies = request.headers.get("cookie") || "";

    if (!allCookies) {
      return NextResponse.json(
        { success: false, message: "No refresh token" },
        { status: 401 }
      );
    }
    
    // Call Express backend with cookies
    const response = await fetch(`${API_BASE_URL}/api/v1/users/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: allCookies,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Set cookies from tokens in response
    const nextResponse = NextResponse.json({ success: true });
    
    if (data.success && data.data?.tokens) {
      const { access, refresh } = data.data.tokens;
      
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
    console.error("Refresh API route error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

