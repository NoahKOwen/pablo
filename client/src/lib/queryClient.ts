import { QueryClient, QueryFunction } from "@tanstack/react-query";
import type { ApiError } from "./authUtils";

// CSRF token storage
let csrfToken: string | null = null;

// Fetch CSRF token on app load
export async function initCSRFToken() {
  try {
    const res = await fetch("/auth/csrf", {
      credentials: "include",
    });
    const data = await res.json();
    csrfToken = data.csrfToken;
  } catch (error) {
    console.error("Failed to fetch CSRF token:", error);
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;

    const error: ApiError = Object.assign(
      new Error(`${res.status}: ${text}`),
      {
        status: res.status,
        code: res.status === 401 ? "UNAUTHORIZED" : undefined,
      }
    );

    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};

  // Add CSRF token for mutations
  if (
    csrfToken &&
    (method === "POST" ||
      method === "PUT" ||
      method === "PATCH" ||
      method === "DELETE")
  ) {
    headers["x-csrf-token"] = csrfToken;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> {
  const { on401: unauthorizedBehavior } = options;

  return async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as T;
    }

    await throwIfResNotOk(res);
    return (await res.json()) as T;
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
