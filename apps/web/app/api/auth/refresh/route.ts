import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4080";

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookies
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: "No refresh token" },
        { status: 401 }
      );
    }

    // Get all cookies from the request to forward to Express
    const allCookies = request.headers.get("cookie") || "";
    
    // Call Express backend with cookies
    const response = await fetch(`${API_BASE_URL}/api/v1/users/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: allCookies || `refresh_token=${refreshToken}`,
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
      
      // Set access token cookie
      nextResponse.cookies.set("access_token", access, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 2 * 24 * 60 * 60, // 2 days in seconds
        path: "/",
      });

      // Set refresh token cookie
      nextResponse.cookies.set("refresh_token", refresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
        path: "/",
      });
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

