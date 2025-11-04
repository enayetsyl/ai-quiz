import { NextRequest, NextResponse } from "next/server";

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
    console.error("Login API route error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

