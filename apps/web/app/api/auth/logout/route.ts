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
    
    // Call Express backend with cookies
    const response = await fetch(`${API_BASE_URL}/api/v1/users/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: allCookies,
      },
    });

    const data = await response.json();

    // Clear cookies in Next.js regardless of Express response
    // Use same options when deleting to ensure proper cookie removal
    const nextResponse = NextResponse.json(data);
    const accessOptions = getAccessTokenCookieOptions();
    const refreshOptions = getRefreshTokenCookieOptions();
    
    nextResponse.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, "", {
      ...accessOptions,
      maxAge: 0,
    });
    nextResponse.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, "", {
      ...refreshOptions,
      maxAge: 0,
    });

    return nextResponse;
  } catch (error) {
    console.error("Logout API route error:", error);
    // Even if there's an error, clear cookies
    const nextResponse = NextResponse.json(
      { success: true }, // Return success to allow logout even if API fails
      { status: 200 }
    );
    
    const accessOptions = getAccessTokenCookieOptions();
    const refreshOptions = getRefreshTokenCookieOptions();
    
    nextResponse.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, "", {
      ...accessOptions,
      maxAge: 0,
    });
    nextResponse.cookies.set(COOKIE_NAMES.REFRESH_TOKEN, "", {
      ...refreshOptions,
      maxAge: 0,
    });
    
    return nextResponse;
  }
}

