import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useSession } from "@/auth/auth-context";
import { fetchOrder } from "@/api/client";
import type { OrderDetail } from "@/api/types";
import {
  Card,
  ErrorNotice,
  Loading,
  Row,
  StatusBadge,
} from "@/components/ui";
import {
  formatCurrency,
  formatDate,
  formatQuantity,
  unitLabel,
} from "@/format";
import { colors, spacing } from "@/theme";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { baseUrl, token } = useSession();
  const navigation = useNavigation();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setOrder(await fetchOrder(baseUrl, token, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load order");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (order) navigation.setOptions({ title: order.orderNumber });
  }, [order, navigation]);

  if (loading) return <Loading label="Loading order..." />;

  if (error) {
    return (
      <View style={styles.padded}>
        <ErrorNotice message={error} onRetry={() => void load()} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.padded}>
        <ErrorNotice message="Order not found" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.gap}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.customer}>{order.customerName}</Text>
            <Text style={styles.date}>{formatDate(order.orderDate)}</Text>
          </View>
          <StatusBadge status={order.paymentStatus} />
        </View>
      </Card>

      <Card style={styles.gap}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.lineItem}>
            <Text style={styles.lineName}>{item.productName}</Text>
            <View style={styles.lineDetail}>
              <Text style={styles.lineMeta}>
                {formatQuantity(item.quantity)} {unitLabel(item.unit)} ×{" "}
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={styles.linePrice}>
                {formatCurrency(item.totalPrice)}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <Card style={styles.gap}>
        <Text style={styles.sectionTitle}>Totals</Text>
        <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
        {order.discount > 0 ? (
          <Row label="Discount" value={`- ${formatCurrency(order.discount)}`} />
        ) : null}
        <View style={styles.divider} />
        <Row label="Total" value={formatCurrency(order.total)} emphasis />
        <Row label="Paid" value={formatCurrency(order.paidAmount)} />
        {order.balance > 0.005 ? (
          <Row label="Outstanding" value={formatCurrency(order.balance)} />
        ) : null}
      </Card>

      <Card style={styles.gap}>
        <Text style={styles.sectionTitle}>Profit</Text>
        <Row label="Cost" value={formatCurrency(order.cost)} />
        <Row
          label="Profit"
          value={formatCurrency(order.profit)}
          emphasis
          tone={order.profit >= 0 ? "success" : "default"}
        />
      </Card>

      {order.notes ? (
        <Card style={styles.gap}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notes}>{order.notes}</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  padded: { padding: spacing.lg },
  gap: { gap: spacing.sm },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  customer: { fontSize: 18, fontWeight: "700", color: colors.text },
  date: { fontSize: 14, color: colors.textMuted },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  lineItem: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 2,
  },
  lineName: { fontSize: 15, fontWeight: "600", color: colors.text },
  lineDetail: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lineMeta: { fontSize: 13, color: colors.textMuted },
  linePrice: { fontSize: 15, fontWeight: "600", color: colors.text },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  notes: { fontSize: 14, color: colors.text, lineHeight: 20 },
});
