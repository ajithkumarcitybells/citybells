import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  // Read response body now so we can provide clearer parse errors later.
  // We'll consume the body and attach safe helpers on the Response object.
  const raw = await res.text();

  // attach safe text/json methods
  // attach safe text/json methods on a casted object to avoid TS complaints
  (res as any)._bodyText = raw;
  // override text()
  (res as any).text = async () => (res as any)._bodyText;
  // override json() to provide a better error when parsing fails
  (res as any).json = async () => {
    try {
      return JSON.parse((res as any)._bodyText || "");
    } catch (err) {
      const snippet = ((res as any)._bodyText || "").slice(0, 200);
      throw new Error(`Failed to parse JSON response (first 200 chars): ${snippet}`);
    }
  };

  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

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
