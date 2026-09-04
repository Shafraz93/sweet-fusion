import Constants from "expo-constants";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as api from "@/api/client";
import { getStored, removeStored, setStored } from "@/storage";

const TOKEN_KEY = "sf_token";
const BASE_URL_KEY = "sf_base_url";

function defaultBaseUrl(): string {
  const configured = (Constants.expoConfig?.extra as { apiUrl?: string })
    ?.apiUrl;
  return configured ?? "";
}

type Status = "loading" | "signedOut" | "signedIn";

interface AuthValue {
  status: Status;
  baseUrl: string;
  token: string | null;
  /** Base URL last used, shown as the prefilled value on the login screen. */
  suggestedBaseUrl: string;
  signIn: (baseUrl: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [suggestedBaseUrl, setSuggestedBaseUrl] = useState(defaultBaseUrl);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [storedToken, storedBaseUrl] = await Promise.all([
        getStored(TOKEN_KEY),
        getStored(BASE_URL_KEY),
      ]);

      if (cancelled) return;

      if (storedBaseUrl) setSuggestedBaseUrl(storedBaseUrl);

      if (!storedToken || !storedBaseUrl) {
        setStatus("signedOut");
        return;
      }

      try {
        const valid = await api.verifySession(storedBaseUrl, storedToken);
        if (cancelled) return;
        if (valid) {
          setToken(storedToken);
          setBaseUrl(storedBaseUrl);
          setStatus("signedIn");
          return;
        }
        await removeStored(TOKEN_KEY);
        setStatus("signedOut");
      } catch {
        // Server unreachable at launch: keep the session and let screens show
        // the connection error instead of forcing the user to log in again.
        if (cancelled) return;
        setToken(storedToken);
        setBaseUrl(storedBaseUrl);
        setStatus("signedIn");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (rawBaseUrl: string, password: string) => {
    const url = api.normalizeBaseUrl(rawBaseUrl);
    if (!url) throw new api.ApiError("Enter the server address", 0);

    const nextToken = await api.login(url, password);
    await Promise.all([
      setStored(TOKEN_KEY, nextToken),
      setStored(BASE_URL_KEY, url),
    ]);
    setToken(nextToken);
    setBaseUrl(url);
    setSuggestedBaseUrl(url);
    setStatus("signedIn");
  }, []);

  const signOut = useCallback(async () => {
    await removeStored(TOKEN_KEY);
    setToken(null);
    setStatus("signedOut");
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ status, baseUrl, token, suggestedBaseUrl, signIn, signOut }),
    [status, baseUrl, token, suggestedBaseUrl, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

/** For screens that only render when signed in. */
export function useSession(): { baseUrl: string; token: string } {
  const { baseUrl, token } = useAuth();
  return { baseUrl, token: token ?? "" };
}
