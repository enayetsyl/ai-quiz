import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4080";

// Configure route to handle larger request bodies (for file uploads)
export const maxDuration = 300; // 5 minutes for file uploads
export const runtime = "nodejs"; // Use Node.js runtime for better file handling

// Increase body size limit for file uploads (up to 20MB)
export const dynamic = "force-dynamic";

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

    // Get content type and content length to determine how to handle the body
    const contentType = request.headers.get("content-type") || "";
    const contentLength = request.headers.get("content-length");

    // Forward all relevant headers
    const headers: Record<string, string> = {
      Cookie: allCookies,
    };

    // Get request body if present (for POST, PUT, PATCH)
    let body: BodyInit | undefined;
    if (["POST", "PUT", "PATCH"].includes(method)) {
      // For multipart/form-data (file uploads), stream the body directly
      // to avoid Next.js/Amplify body size limits when reading into memory
      if (contentType.includes("multipart/form-data")) {
        try {
          // Stream the request body directly to avoid memory limits
          // This allows files up to 20MB to pass through on AWS Amplify
          const requestBody = request.body;
          if (requestBody) {
            body = requestBody;
            // Preserve the Content-Type with boundary for multipart/form-data
            if (contentType) {
              headers["Content-Type"] = contentType;
            }
            // Preserve Content-Length if available (helps with streaming)
            if (contentLength) {
              headers["Content-Length"] = contentLength;
            }
          }
        } catch (error) {
          console.error("Error processing file upload:", error);
          return NextResponse.json(
            { success: false, message: "Error processing file upload" },
            { status: 400 }
          );
        }
      } else {
        // For JSON or other text-based content, read as text
        try {
          const textBody = await request.text();
          if (textBody) {
            body = textBody;
            if (contentType) {
              headers["Content-Type"] = contentType;
            }
          }
        } catch {
          // No body or error reading body
        }
      }
    }

    // Call Express backend with cookies
    // For multipart/form-data, preserve the Content-Type header with boundary
    const fetchHeaders: HeadersInit = { ...headers };
    if (contentType && !contentType.includes("multipart/form-data")) {
      fetchHeaders["Content-Type"] = contentType;
    }

    const response = await fetch(expressUrl, {
      method,
      headers: fetchHeaders,
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
