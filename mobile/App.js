import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { WebView } from "react-native-webview";

const APP_URL = "https://resolve-ia.vercel.app";
const ALLOWED_ORIGIN = "https://resolve-ia.vercel.app";

export default function App() {
  const webViewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [statusText, setStatusText] = useState("Preparando sua area de estudo...");

  const splashVisible = useMemo(() => isLoading && !hasError, [isLoading, hasError]);

  function retryLoad() {
    setHasError(false);
    setIsLoading(true);
    setStatusText("Tentando carregar novamente...");
    webViewRef.current?.reload();
  }

  function shouldAllowNavigation(request) {
    const url = request?.url || "";
    if (!url) {
      return false;
    }

    if (url === "about:blank" || url === ALLOWED_ORIGIN || url.startsWith(`${ALLOWED_ORIGIN}/`)) {
      return true;
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      Linking.openURL(url).catch(() => {});
    }

    return false;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ uri: APP_URL }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={[ALLOWED_ORIGIN]}
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={shouldAllowNavigation}
          onLoadStart={() => {
            setIsLoading(true);
            setHasError(false);
            setStatusText("Sincronizando sua experiencia...");
          }}
          onLoadEnd={() => {
            setIsLoading(false);
          }}
          onHttpError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
        />

        {splashVisible ? (
          <View style={styles.overlay}>
            <View style={styles.splashCard}>
              <Text style={styles.eyebrow}>ResolveAI Mobile</Text>
              <Text style={styles.title}>Carregando seu ambiente de estudo</Text>
              <Text style={styles.subtitle}>{statusText}</Text>
              <ActivityIndicator size="large" color="#d75f39" style={styles.spinner} />
            </View>
          </View>
        ) : null}

        {hasError ? (
          <View style={styles.overlay}>
            <View style={styles.offlineCard}>
              <Text style={styles.offlineTitle}>Sem conexao com o app</Text>
              <Text style={styles.offlineText}>
                Nao consegui abrir o ResolveAI agora. Confira sua internet ou tente novamente em alguns segundos.
              </Text>
              <Pressable style={styles.retryButton} onPress={retryLoad}>
                <Text style={styles.retryLabel}>Tentar novamente</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4ead8",
  },
  container: {
    flex: 1,
    backgroundColor: "#f4ead8",
  },
  webview: {
    flex: 1,
    backgroundColor: "#f4ead8",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244, 234, 216, 0.96)",
    padding: 24,
  },
  splashCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    padding: 28,
    backgroundColor: "rgba(255, 251, 245, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(24, 32, 28, 0.08)",
    shadowColor: "#38291a",
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  eyebrow: {
    color: "#2f6c54",
    fontSize: 12,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    marginBottom: 10,
    fontWeight: "700",
  },
  title: {
    color: "#18201c",
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 10,
    color: "#5b645d",
    fontSize: 15,
    lineHeight: 22,
  },
  spinner: {
    marginTop: 24,
  },
  offlineCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    padding: 28,
    backgroundColor: "#fffaf4",
    borderWidth: 1,
    borderColor: "rgba(179, 62, 45, 0.12)",
  },
  offlineTitle: {
    color: "#18201c",
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "800",
  },
  offlineText: {
    marginTop: 12,
    color: "#5b645d",
    fontSize: 15,
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 20,
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#d75f39",
  },
  retryLabel: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
});
