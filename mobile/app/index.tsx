import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useAuth, useSession } from "@/auth/auth-context";
import { fetchOrders } from "@/api/client";
import type { OrderListItem } from "@/api/types";
import {
  Button,
  EmptyState,
  ErrorNotice,
  Loading,
  StatusBadge,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/format";
import { colors, radius, spacing } from "@/theme";

export default function OrdersScreen() {
  const { baseUrl, token } = useSession();
  const { signOut } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (options: { search?: string; silent?: boolean } = {}) => {
      if (!options.silent) setLoading(true);
      setError(null);
      try {
        const page = await fetchOrders(baseUrl, token, {
          search: options.search,
        });
        setOrders(page.orders);
        setTotal(page.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load orders");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [baseUrl, token]
  );

  // Debounce so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      void load({ search: search.trim() || undefined, silent: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [search, load]);

  // Refresh when returning from the create screen so a new order shows up.
  useFocusEffect(
    useCallback(() => {
      void load({ search: search.trim() || undefined, silent: true });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void load({ search: search.trim() || undefined, silent: true });
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search order number or customer"
          placeholderTextColor={colors.textSubtle}
          style={styles.search}
          autoCorrect={false}
        />
        <Pressable onPress={() => void signOut()} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Text style={styles.count}>
          {total} {total === 1 ? "order" : "orders"}
        </Text>
        <Button
          label="+ New Order"
          onPress={() => router.push("/orders/new")}
          style={styles.newButton}
        />
      </View>

      {loading ? (
        <Loading label="Loading orders..." />
      ) : error ? (
        <View style={styles.errorWrap}>
          <ErrorNotice message={error} onRetry={() => void load()} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              title={search ? "No matching orders" : "No orders yet"}
              description={
                search
                  ? "Try a different order number or customer name."
                  : "Create your first order with the button above."
              }
            />
          }
          renderItem={({ item }) => <OrderCard order={item} />}
        />
      )}
    </View>
  );
}

function OrderCard({ order }: { order: OrderListItem }) {
  return (
    <Link href={`/orders/${order.id}`} asChild>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardHeading}>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.customer} numberOfLines={1}>
              {order.customerName}
            </Text>
          </View>
          <StatusBadge status={order.paymentStatus} />
        </View>

        <View style={styles.cardBottom}>
          <Text style={styles.meta}>
            {formatDate(order.orderDate)} · {order.itemCount}{" "}
            {order.itemCount === 1 ? "item" : "items"}
          </Text>
          <Text style={styles.total}>{formatCurrency(order.total)}</Text>
        </View>

        {order.balance > 0.005 ? (
          <Text style={styles.balance}>
            {formatCurrency(order.balance)} outstanding
          </Text>
        ) : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  search: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 15,
  },
  signOut: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  signOutText: { color: colors.textMuted, fontSize: 14, fontWeight: "500" },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  count: { color: colors.textMuted, fontSize: 14 },
  newButton: { height: 40, paddingHorizontal: spacing.lg },

  errorWrap: { padding: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardPressed: { backgroundColor: colors.primarySoft },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardHeading: { flex: 1, gap: 2 },
  orderNumber: { fontSize: 15, fontWeight: "700", color: colors.text },
  customer: { fontSize: 14, color: colors.textMuted },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  meta: { fontSize: 13, color: colors.textSubtle },
  total: { fontSize: 17, fontWeight: "700", color: colors.text },
  balance: { fontSize: 13, color: colors.warning },
});
