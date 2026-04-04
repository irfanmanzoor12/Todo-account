// API client — sends session token as Bearer to backend
// [Spec: specs/api/rest-endpoints.md]

const BASE_URL = "/backend";

async function getToken(): Promise<string | null> {
  const res = await fetch("/api/auth/get-session", { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json();
  // Better Auth session token is in data.session.token
  return data?.session?.token || null;
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  entries: {
    list: (userId: string, params?: { type?: string }) => {
      const query = new URLSearchParams();
      if (params?.type) query.set("type", params.type);
      const qs = query.toString();
      return apiFetch(`/api/${userId}/entries${qs ? `?${qs}` : ""}`);
    },
    create: (userId: string, data: object) =>
      apiFetch(`/api/${userId}/entries`, { method: "POST", body: JSON.stringify(data) }),
    update: (userId: string, id: number, data: object) =>
      apiFetch(`/api/${userId}/entries/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (userId: string, id: number) =>
      apiFetch(`/api/${userId}/entries/${id}`, { method: "DELETE" }),
    reconcile: (userId: string, id: number) =>
      apiFetch(`/api/${userId}/entries/${id}/reconcile`, { method: "PATCH" }),
    summary: (userId: string) => apiFetch(`/api/${userId}/summary`),
  },
};
