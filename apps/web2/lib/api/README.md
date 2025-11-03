# API Client Setup

This directory contains the centralized axios configuration and helpers for API calls.

## Configuration

- **Base URL**: Configured via `NEXT_PUBLIC_API_URL` environment variable (defaults to `http://localhost:4080`)
- **API Path**: Automatically includes `/api/v1` prefix in base URL
- **Credentials**: Cookies are automatically sent with requests (`withCredentials: true`)
- **Error Handling**: Global error interceptor integrates with toast notifications

## Usage

### Direct Axios Usage

```typescript
import { apiClient } from "@/lib/api";

// GET request (base URL already includes /api/v1)
const response = await apiClient.get("/users");

// POST request
const response = await apiClient.post("/users", { email, password });
```

### With TanStack Query

#### Using Helper Functions

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";
import { createQueryFn, createMutationFn } from "@/lib/api/queries";

// Query example (base URL already includes /api/v1)
function UsersList() {
  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: createQueryFn<User[]>("/users"),
  });

  if (isLoading) return <div>Loading...</div>;
  return <div>{/* render users */}</div>;
}

// Mutation example
function CreateUser() {
  const mutation = useMutation({
    mutationFn: createMutationFn<User, CreateUserData>("/users", "post"),
    onSuccess: () => {
      toast.success("User created successfully");
    },
  });

  return (
    <button onClick={() => mutation.mutate({ email: "...", password: "..." })}>
      Create User
    </button>
  );
}
```

#### Manual Query Functions

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiClient, extractApiData } from "@/lib/api";

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["user", userId],
    queryFn: async () => {
      const response = await apiClient.get(`/users/${userId}`);
      return extractApiData<User>(response);
    },
  });
}
```

## Error Handling

Errors are automatically handled by the axios interceptor and displayed via toast notifications:

- **401**: Unauthorized - Shows "Please log in to continue"
- **403**: Forbidden - Shows permission error
- **404**: Not Found - Shows resource not found
- **422**: Validation Error - Shows validation message from API
- **500**: Server Error - Shows generic server error message
- **Network Error**: Shows connection error message

You can still handle errors manually in mutations:

```typescript
const mutation = useMutation({
  mutationFn: createMutationFn<User, CreateUserData>("/users", "post"),
  onError: (error) => {
    // Custom error handling if needed
    console.error("Failed to create user:", error);
  },
});
```

## Environment Variables

Create a `.env.local` file in `apps/web`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4080
```

For production, set the appropriate API URL.
