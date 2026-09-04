import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "@/theme";

export interface PickerItem {
  id: string;
  title: string;
  subtitle?: string;
}

export function PickerModal({
  visible,
  title,
  items,
  onSelect,
  onClose,
  searchPlaceholder = "Search",
  emptyText = "Nothing to show",
  footer,
}: {
  visible: boolean;
  title: string;
  items: PickerItem[];
  onSelect: (item: PickerItem) => void;
  onClose: () => void;
  searchPlaceholder?: string;
  emptyText?: string;
  footer?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(needle) ||
        item.subtitle?.toLowerCase().includes(needle)
    );
  }, [items, query]);

  const handleClose = () => {
    setQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textSubtle}
          style={styles.search}
          autoCorrect={false}
        />

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setQuery("");
                onSelect(item);
              }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Text style={styles.rowTitle}>{item.title}</Text>
              {item.subtitle ? (
                <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
              ) : null}
            </Pressable>
          )}
        />

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  close: { fontSize: 15, color: colors.primary, fontWeight: "600" },
  search: {
    height: 44,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 15,
  },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 2,
  },
  rowPressed: { backgroundColor: colors.primarySoft },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowSubtitle: { fontSize: 13, color: colors.textMuted },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    paddingVertical: spacing.xl,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
});
