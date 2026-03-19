# ResolveAI Mobile

Versao mobile simplificada para gerar APK no Android Studio com um WebView nativo.

## Como abrir no Android Studio

Abra esta pasta no Android Studio:

```text
mobile/android
```

## Como gerar o APK

No Android Studio:

1. Abra `mobile/android`
2. Aguarde a sincronizacao do Gradle
3. Clique em `Build`
4. Clique em `Build APK(s)`

O app abre a URL:

```text
https://resolve-ia.vercel.app
```

Se a URL do frontend mudar, atualize:

```text
mobile/android/app/src/main/java/com/dioguinhomax/resolveai/MainActivity.kt
```
