import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSession } from "@/auth/auth-context";
import {
  createCustomer,
  createOrder,
  fetchCustomers,
  fetchProducts,
} from "@/api/client";
import type { Customer, Product } from "@/api/types";
import {
  Button,
  Card,
  ErrorNotice,
  Field,
  Loading,
  Row,
} from "@/components/ui";
import { PickerModal, type PickerItem } from "@/components/picker-modal";
import { NewCustomerModal } from "@/components/new-customer-modal";
import { formatCurrency, todayISODate, unitLabel } from "@/format";
import { colors, radius, spacing } from "@/theme";

interface DraftLine {
  key: string;
  product: Product;
  quantity: string;
  unitPrice: string;
}

let lineCounter = 0;
const nextLineKey = () => `line-${(lineCounter += 1)}`;

function parseNumber(value: string): number {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function NewOrderScreen() {
  const { baseUrl, token } = useSession();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [discount, setDiscount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [fullyPaid, setFullyPaid] = useState(false);
  const [notes, setNotes] = useState("");

  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [productList, customerList] = await Promise.all([
          fetchProducts(baseUrl, token),
          fetchCustomers(baseUrl, token),
        ]);
        if (cancelled) return;
        setProducts(productList);
        setCustomers(customerList);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Could not load form data"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, token]);

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum + parseNumber(line.quantity) * parseNumber(line.unitPrice),
        0
      ),
    [lines]
  );

  const discountValue = Math.max(0, parseNumber(discount));
  const total = Math.max(0, subtotal - discountValue);

  useEffect(() => {
    if (fullyPaid) setPaidAmount(total > 0 ? String(total) : "");
  }, [fullyPaid, total]);

  const addProduct = (product: Product) => {
    setLines((prev) => [
      ...prev,
      {
        key: nextLineKey(),
        product,
        quantity: "1",
        unitPrice: String(product.sellingPrice),
      },
    ]);
    setProductPickerOpen(false);
  };

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((line) => line.key !== key));
  };

  const handleCreateCustomer = async (input: {
    name: string;
    phone?: string;
  }) => {
    const created = await createCustomer(baseUrl, token, input);
    setCustomers((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
    );
    setCustomer(created);
    setNewCustomerOpen(false);
  };

  const validate = (): string | null => {
    if (!customer) return "Choose a customer";
    if (lines.length === 0) return "Add at least one item";
    for (const line of lines) {
      if (parseNumber(line.quantity) <= 0) {
        return `Enter a quantity for ${line.product.name}`;
      }
      if (parseNumber(line.unitPrice) < 0) {
        return `Enter a valid price for ${line.product.name}`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const problem = validate();
    if (problem) {
      setSubmitError(problem);
      return;
    }

    setSubmitError(null);
    setSubmitting(true);
    try {
      await createOrder(baseUrl, token, {
        customerId: customer!.id,
        orderDate: todayISODate(),
        discount: discountValue,
        paidAmount: Math.max(0, parseNumber(paidAmount)),
        notes: notes.trim() || undefined,
        items: lines.map((line) => ({
          productId: line.product.id,
          quantity: parseNumber(line.quantity),
          unit: line.product.unit,
          unitPrice: parseNumber(line.unitPrice),
        })),
      });
      router.back();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not create the order"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading label="Loading products..." />;

  if (loadError) {
    return (
      <View style={styles.padded}>
        <ErrorNotice message={loadError} />
      </View>
    );
  }

  const customerItems: PickerItem[] = customers.map((item) => ({
    id: item.id,
    title: item.name,
    subtitle: item.phone
      ? `${item.phone} · ${item.orderCount} orders`
      : `${item.orderCount} orders`,
  }));

  const productItems: PickerItem[] = products.map((item) => ({
    id: item.id,
    title: item.name,
    subtitle: `${formatCurrency(item.sellingPrice)} · ${item.currentStock} ${unitLabel(
      item.unit
    )} in stock`,
  }));

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {submitError ? <ErrorNotice message={submitError} /> : null}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Pressable
            onPress={() => setCustomerPickerOpen(true)}
            style={styles.selector}
          >
            <Text
              style={[styles.selectorText, !customer && styles.placeholderText]}
            >
              {customer ? customer.name : "Choose a customer"}
            </Text>
            <Text style={styles.selectorChevron}>›</Text>
          </Pressable>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items</Text>
            <Pressable onPress={() => setProductPickerOpen(true)} hitSlop={8}>
              <Text style={styles.addLink}>+ Add item</Text>
            </Pressable>
          </View>

          {lines.length === 0 ? (
            <Text style={styles.emptyLines}>
              No items yet. Tap &quot;Add item&quot; to start the order.
            </Text>
          ) : (
            lines.map((line) => (
              <View key={line.key} style={styles.lineCard}>
                <View style={styles.lineHeader}>
                  <Text style={styles.lineName} numberOfLines={2}>
                    {line.product.name}
                  </Text>
                  <Pressable onPress={() => removeLine(line.key)} hitSlop={8}>
                    <Text style={styles.removeLink}>Remove</Text>
                  </Pressable>
                </View>

                <View style={styles.lineInputs}>
                  <View style={styles.lineInput}>
                    <Text style={styles.lineInputLabel}>
                      Qty ({unitLabel(line.product.unit)})
                    </Text>
                    <TextInput
                      value={line.quantity}
                      onChangeText={(value) =>
                        updateLine(line.key, { quantity: value })
                      }
                      keyboardType="decimal-pad"
                      style={styles.smallInput}
                      placeholderTextColor={colors.textSubtle}
                    />
                  </View>
                  <View style={styles.lineInput}>
                    <Text style={styles.lineInputLabel}>Unit price</Text>
                    <TextInput
                      value={line.unitPrice}
                      onChangeText={(value) =>
                        updateLine(line.key, { unitPrice: value })
                      }
                      keyboardType="decimal-pad"
                      style={styles.smallInput}
                      placeholderTextColor={colors.textSubtle}
                    />
                  </View>
                </View>

                <Text style={styles.lineTotal}>
                  Line total:{" "}
                  {formatCurrency(
                    parseNumber(line.quantity) * parseNumber(line.unitPrice)
                  )}
                </Text>
              </View>
            ))
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <Field
            label="Discount (Rs.)"
            value={discount}
            onChangeText={setDiscount}
            keyboardType="decimal-pad"
            placeholder="0"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Fully paid</Text>
            <Switch
              value={fullyPaid}
              onValueChange={setFullyPaid}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>

          <Field
            label="Paid amount (Rs.)"
            value={paidAmount}
            onChangeText={(value) => {
              setFullyPaid(false);
              setPaidAmount(value);
            }}
            keyboardType="decimal-pad"
            placeholder="0"
          />

          <Field
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional"
            multiline
            style={styles.notesInput}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Row label="Subtotal" value={formatCurrency(subtotal)} />
          {discountValue > 0 ? (
            <Row label="Discount" value={`- ${formatCurrency(discountValue)}`} />
          ) : null}
          <Row label="Total" value={formatCurrency(total)} emphasis />
        </Card>

        <Button
          label="Create order"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!customer || lines.length === 0}
        />
        <Button
          label="Cancel"
          variant="outline"
          onPress={() => router.back()}
        />
      </ScrollView>

      <PickerModal
        visible={customerPickerOpen}
        title="Choose customer"
        items={customerItems}
        searchPlaceholder="Search customers"
        emptyText="No customers found"
        onClose={() => setCustomerPickerOpen(false)}
        onSelect={(item) => {
          const found = customers.find((c) => c.id === item.id) ?? null;
          setCustomer(found);
          setCustomerPickerOpen(false);
        }}
        footer={
          <Button
            label="+ New customer"
            variant="outline"
            onPress={() => {
              setCustomerPickerOpen(false);
              setNewCustomerOpen(true);
            }}
          />
        }
      />

      <NewCustomerModal
        visible={newCustomerOpen}
        onClose={() => setNewCustomerOpen(false)}
        onCreate={handleCreateCustomer}
      />

      <PickerModal
        visible={productPickerOpen}
        title="Add product"
        items={productItems}
        searchPlaceholder="Search products"
        emptyText="No products found"
        onClose={() => setProductPickerOpen(false)}
        onSelect={(item) => {
          const found = products.find((p) => p.id === item.id);
          if (found) addProduct(found);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  padded: { padding: spacing.lg },
  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addLink: { fontSize: 14, fontWeight: "600", color: colors.primary },

  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  selectorText: { fontSize: 16, color: colors.text },
  placeholderText: { color: colors.textSubtle },
  selectorChevron: { fontSize: 22, color: colors.textSubtle },

  emptyLines: { fontSize: 14, color: colors.textMuted },
  lineCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  lineHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  lineName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
  removeLink: { fontSize: 13, color: colors.danger, fontWeight: "500" },
  lineInputs: { flexDirection: "row", gap: spacing.md },
  lineInput: { flex: 1, gap: 4 },
  lineInputLabel: { fontSize: 12, color: colors.textMuted },
  smallInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
  },
  lineTotal: { fontSize: 13, color: colors.textMuted },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: { fontSize: 14, fontWeight: "500", color: colors.text },
  notesInput: { height: 88, paddingTop: spacing.md, textAlignVertical: "top" },
});
