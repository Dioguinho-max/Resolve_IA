import React from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

const APP_URL = "https://resolve-ia.vercel.app";

export default function App() {
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: APP_URL }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        setSupportMultipleWindows={false}
        startInLoadingState
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  webview: {
    flex: 1,
  },
});
