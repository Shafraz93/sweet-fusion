import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/auth/auth-context";
import { Button, ErrorNotice, Field } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";

export default function LoginScreen() {
  const { signIn, suggestedBaseUrl } = useAuth();
  const [serverUrl, setServerUrl] = useState(suggestedBaseUrl);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn(serverUrl, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>SF</Text>
          </View>
          <Text style={styles.title}>Sweet Fusion</Text>
          <Text style={styles.subtitle}>Sign in to manage orders</Text>
        </View>

        {error ? <ErrorNotice message={error} /> : null}

        <Field
          label="Server address"
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="https://your-app.vercel.app"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          hint="The address where the Sweet Fusion web app is running."
        />

        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your app password"
          secureTextEntry
          autoCapitalize="none"
          onSubmitEditing={handleSubmit}
          returnKeyType="go"
        />

        <Button
          label="Sign in"
          onPress={handleSubmit}
          loading={busy}
          disabled={!password.trim() || !serverUrl.trim()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  brand: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#ffffff", fontSize: 22, fontWeight: "800" },
  title: { fontSize: 24, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted },
});
