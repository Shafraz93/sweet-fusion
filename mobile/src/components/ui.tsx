import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { colors, paymentStatusStyle, radius, spacing } from "@/theme";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "outline" && styles.buttonOutline,
        variant === "danger" && styles.buttonDanger,
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" ? colors.text : "#ffffff"}
        />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === "outline" && styles.buttonLabelOutline,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  ...inputProps
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        {...inputProps}
        style={[styles.input, inputProps.style]}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatusBadge({ status }: { status: string }) {
  const style = paymentStatusStyle[status] ?? {
    bg: colors.border,
    fg: colors.textMuted,
    label: status,
  };
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.fg }]}>{style.label}</Text>
    </View>
  );
}

export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.errorRetry}>
          <Text style={styles.errorRetryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? (
        <Text style={styles.emptyDescription}>{description}</Text>
      ) : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

export function Row({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "default" | "success";
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, emphasis && styles.rowLabelEmphasis]}>
        {label}
      </Text>
      <Text
        style={[
          styles.rowValue,
          emphasis && styles.rowValueEmphasis,
          tone === "success" && { color: colors.success },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonOutline: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDanger: { backgroundColor: colors.danger },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  buttonLabelOutline: { color: colors.text },

  field: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "500", color: colors.text },
  fieldHint: { fontSize: 12, color: colors.textMuted },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },

  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 12, fontWeight: "600" },

  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  errorText: { color: colors.danger, fontSize: 14 },
  errorRetry: { alignSelf: "flex-start" },
  errorRetryText: {
    color: colors.danger,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  empty: { alignItems: "center", paddingVertical: 48, gap: spacing.xs },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  emptyDescription: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },

  loading: { paddingVertical: 48, alignItems: "center", gap: spacing.md },
  loadingLabel: { color: colors.textMuted, fontSize: 14 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 3,
  },
  rowLabel: { fontSize: 14, color: colors.textMuted },
  rowLabelEmphasis: { color: colors.text, fontWeight: "600" },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: "500" },
  rowValueEmphasis: { fontSize: 16, fontWeight: "700" },
});
