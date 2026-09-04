/**
 * Exercises the mobile API against a running dev server.
 * Usage: npx tsx scripts/smoke-test-api.ts [baseUrl]
 */

const BASE = process.argv[2] ?? "http://localhost:3000";

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  const status = condition ? "PASS" : "FAIL";
  if (!condition) failures += 1;
  console.log(`[${status}] ${label}`);
  if (!condition && detail !== undefined) {
    console.log("        got:", JSON.stringify(detail).slice(0, 300));
  }
}

async function main() {
  const password = process.env.APP_PASSWORD ?? "";

  const pageRes = await fetch(`${BASE}/`, { redirect: "manual" });
  check(
    "unauthenticated page redirects to /login",
    pageRes.status === 307 || pageRes.status === 302,
    pageRes.status
  );

  const noAuth = await fetch(`${BASE}/api/orders`);
  check("unauthenticated API returns 401", noAuth.status === 401, noAuth.status);

  const badLogin = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "definitely-wrong" }),
  });
  check("wrong password rejected", badLogin.status === 401, badLogin.status);

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const loginBody = (await login.json()) as { token?: string; error?: string };
  check("correct password returns token", Boolean(loginBody.token), loginBody);
  if (!loginBody.token) {
    console.log("\nCannot continue without a token.");
    process.exit(1);
  }

  const auth = { Authorization: `Bearer ${loginBody.token}` };

  const session = await fetch(`${BASE}/api/auth/session`, { headers: auth });
  check("session check accepts token", session.status === 200, session.status);

  const orders = await fetch(`${BASE}/api/orders?limit=3`, { headers: auth });
  const ordersBody = (await orders.json()) as {
    orders?: Array<Record<string, unknown>>;
    total?: number;
  };
  check("orders list returns array", Array.isArray(ordersBody.orders), ordersBody);
  console.log(
    `        ${ordersBody.orders?.length ?? 0} of ${ordersBody.total ?? 0} orders`
  );
  if (ordersBody.orders?.[0]) {
    const first = ordersBody.orders[0];
    check(
      "order total is a number, not a Decimal object",
      typeof first.total === "number",
      first.total
    );
    console.log("        sample:", JSON.stringify(first).slice(0, 220));

    const detail = await fetch(`${BASE}/api/orders/${first.id}`, {
      headers: auth,
    });
    const detailBody = (await detail.json()) as {
      order?: { items?: unknown[] };
    };
    check(
      "order detail includes items",
      Array.isArray(detailBody.order?.items),
      detailBody
    );
  }

  const products = await fetch(`${BASE}/api/products`, { headers: auth });
  const productsBody = (await products.json()) as { products?: unknown[] };
  check(
    "products list returns array",
    Array.isArray(productsBody.products),
    productsBody
  );
  console.log(`        ${productsBody.products?.length ?? 0} products`);

  const customers = await fetch(`${BASE}/api/customers`, { headers: auth });
  const customersBody = (await customers.json()) as { customers?: unknown[] };
  check(
    "customers list returns array",
    Array.isArray(customersBody.customers),
    customersBody
  );
  console.log(`        ${customersBody.customers?.length ?? 0} customers`);

  const invalidOrder = await fetch(`${BASE}/api/orders`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ customerId: "", items: [] }),
  });
  check(
    "invalid order payload rejected with 422",
    invalidOrder.status === 422,
    invalidOrder.status
  );

  console.log(
    failures === 0
      ? "\nAll checks passed."
      : `\n${failures} check(s) failed.`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Smoke test crashed:", error);
  process.exit(1);
});
