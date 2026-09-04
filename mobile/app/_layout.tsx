import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/auth/auth-context";
import { Loading } from "@/components/ui";
import { colors } from "@/theme";

function RootNavigator() {
  const { status } = useAuth();

  if (status === "loading") {
    return <Loading label="Starting up..." />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text, fontWeight: "700" },
        headerTintColor: colors.primary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={status === "signedIn"}>
        <Stack.Screen name="index" options={{ title: "Orders" }} />
        <Stack.Screen name="orders/new" options={{ title: "New Order" }} />
        <Stack.Screen name="orders/[id]" options={{ title: "Order" }} />
      </Stack.Protected>

      <Stack.Protected guard={status === "signedOut"}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
