import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

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
    const nextResponse = NextResponse.json(data);
    nextResponse.cookies.delete("access_token");
    nextResponse.cookies.delete("refresh_token");

    return nextResponse;
  } catch (error) {
    console.error("Logout API route error:", error);
    // Even if there's an error, clear cookies
    const nextResponse = NextResponse.json(
      { success: true }, // Return success to allow logout even if API fails
      { status: 200 }
    );
    nextResponse.cookies.delete("access_token");
    nextResponse.cookies.delete("refresh_token");
    
    return nextResponse;
  }
}

