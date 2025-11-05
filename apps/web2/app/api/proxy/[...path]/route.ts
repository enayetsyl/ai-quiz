import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4080";

/**
 * Catch-all proxy route that forwards all requests to Express backend
 * This ensures cookies are properly forwarded for authenticated requests
 *
 * Usage: /api/proxy/users/me, /api/proxy/questions, etc.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return handleRequest(request, params, "GET");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return handleRequest(request, params, "POST");
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return handleRequest(request, params, "PUT");
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return handleRequest(request, params, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  return handleRequest(request, params, "DELETE");
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    // Reconstruct the path from the catch-all route
    const path = params.path.join("/");
    const url = new URL(request.url);

    // Get query string if present
    const queryString = url.search;

    // Construct the full Express backend URL
    const expressUrl = `${API_BASE_URL}/api/v1/${path}${queryString}`;

    // Get all cookies from the request to forward to Express
    const allCookies = request.headers.get("cookie") || "";

    // Get request body if present (for POST, PUT, PATCH)
    let body: string | undefined;
    if (["POST", "PUT", "PATCH"].includes(method)) {
      try {
        body = await request.text();
      } catch {
        // No body
      }
    }

    // Forward all relevant headers (excluding host and connection)
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Cookie: allCookies,
    };

    // Forward other headers that might be useful
    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    // Call Express backend with cookies
    const response = await fetch(expressUrl, {
      method,
      headers,
      ...(body && { body }),
    });

    // Get response data
    const contentTypeHeader = response.headers.get("content-type");
    let data: any;

    if (contentTypeHeader?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Create Next.js response with same status
    const nextResponse = NextResponse.json(data, { status: response.status });

    // Forward relevant response headers
    response.headers.forEach((value, key) => {
      // Skip headers that shouldn't be forwarded
      if (
        !["content-encoding", "content-length", "transfer-encoding"].includes(
          key.toLowerCase()
        )
      ) {
        nextResponse.headers.set(key, value);
      }
    });

    return nextResponse;
  } catch (error) {
    console.error(`Proxy API route error (${method}):`, error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
