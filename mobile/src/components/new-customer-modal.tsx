import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, ErrorNotice, Field } from "@/components/ui";
import { colors, spacing } from "@/theme";

export function NewCustomerModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; phone?: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setPhone("");
    setError(null);
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Enter a customer name");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), phone: phone.trim() || undefined });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add customer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.content}>
            <Text style={styles.title}>New customer</Text>

            {error ? <ErrorNotice message={error} /> : null}

            <Field
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Customer name"
              autoFocus
            />
            <Field
              label="Phone (optional)"
              value={phone}
              onChangeText={setPhone}
              placeholder="07X XXX XXXX"
              keyboardType="phone-pad"
            />

            <Button label="Add customer" onPress={handleSave} loading={busy} />
            <Button label="Cancel" variant="outline" onPress={handleClose} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
});
