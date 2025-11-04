import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4080";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Call Express backend
    const response = await fetch(`${API_BASE_URL}/api/v1/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Registration doesn't set tokens, just return the response
    return NextResponse.json(data);
  } catch (error) {
    console.error("Register API route error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}


