import type {
  Customer,
  NewOrderPayload,
  OrderDetail,
  OrderListItem,
  Product,
} from "@/api/types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Trailing slashes break path joins, so normalize once here. */
export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

async function request<T>(
  baseUrl: string,
  path: string,
  { method = "GET", body, token, signal }: RequestOptions = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      signal,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "Cannot reach the server. Check the server URL and your connection.",
      0
    );
  }

  const text = await response.text();
  const payload = text ? safeParse(text) : null;

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function login(
  baseUrl: string,
  password: string
): Promise<string> {
  const data = await request<{ token: string }>(baseUrl, "/api/auth/login", {
    method: "POST",
    body: { password },
  });
  return data.token;
}

export async function verifySession(
  baseUrl: string,
  token: string
): Promise<boolean> {
  try {
    await request(baseUrl, "/api/auth/session", { token });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return false;
    throw error;
  }
}

export interface OrdersPage {
  orders: OrderListItem[];
  total: number;
  limit: number;
  offset: number;
}

export function fetchOrders(
  baseUrl: string,
  token: string,
  options: { search?: string; limit?: number; offset?: number } = {}
): Promise<OrdersPage> {
  const params = new URLSearchParams();
  if (options.search) params.set("q", options.search);
  params.set("limit", String(options.limit ?? 30));
  params.set("offset", String(options.offset ?? 0));
  return request<OrdersPage>(baseUrl, `/api/orders?${params}`, { token });
}

export async function fetchOrder(
  baseUrl: string,
  token: string,
  id: string
): Promise<OrderDetail> {
  const data = await request<{ order: OrderDetail }>(
    baseUrl,
    `/api/orders/${id}`,
    { token }
  );
  return data.order;
}

export async function fetchProducts(
  baseUrl: string,
  token: string
): Promise<Product[]> {
  const data = await request<{ products: Product[] }>(
    baseUrl,
    "/api/products",
    { token }
  );
  return data.products;
}

export async function fetchCustomers(
  baseUrl: string,
  token: string
): Promise<Customer[]> {
  const data = await request<{ customers: Customer[] }>(
    baseUrl,
    "/api/customers",
    { token }
  );
  return data.customers;
}

export async function createOrder(
  baseUrl: string,
  token: string,
  payload: NewOrderPayload
): Promise<OrderListItem> {
  const data = await request<{ order: OrderListItem }>(
    baseUrl,
    "/api/orders",
    { method: "POST", body: payload, token }
  );
  return data.order;
}

export async function createCustomer(
  baseUrl: string,
  token: string,
  payload: { name: string; phone?: string; type?: string }
): Promise<Customer> {
  const data = await request<{ customer: Customer }>(
    baseUrl,
    "/api/customers",
    { method: "POST", body: payload, token }
  );
  return data.customer;
}
