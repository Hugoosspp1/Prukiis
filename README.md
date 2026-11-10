# PRUKIS — Angular Arcade

Proyecto Angular standalone para el videojuego PRUKIS.

## Requisitos
- Node.js LTS
- npm

## Instalación y ejecución
```bash
npm install
npm start
```
Abre la dirección que indique Angular CLI, normalmente http://localhost:4200.

## Compilar
```bash
npm run build
```

## Android APK
Instala Android Studio y el SDK de Android. La primera vez, crea el proyecto nativo y compila:
```bash
npx cap add android
npm run android:apk
```
El APK de depuración se genera en `android/app/build/outputs/apk/debug/app-debug.apk`.
El workflow de GitHub Actions también deja un APK descargable en la ejecución de Build Android APK.

## iOS IPA
El workflow `Build iOS IPA` compila el proyecto en macOS y guarda el resultado como artefacto descargable de GitHub Actions. Si faltan certificados Apple, genera un archivo de proyecto sin firmar; para obtener un IPA instalable, configura estos secretos en **Settings → Secrets and variables → Actions** del repositorio:

- `IOS_DISTRIBUTION_P12_BASE64`: certificado Apple Distribution exportado como `.p12` y codificado en Base64.
- `IOS_DISTRIBUTION_P12_PASSWORD`: contraseña del archivo `.p12`.
- `IOS_APP_STORE_PROFILE_BASE64`: perfil de aprovisionamiento App Store codificado en Base64.
- `IOS_TEAM_ID`: identificador del equipo de Apple Developer.

Con los cuatro secretos configurados, la acción exporta `prukiis-ios-ipa` como `.ipa`. El identificador de la app es `com.prukiis.arcade`.

## Controles
- ← / →: mover
- ↑ o X: girar
- ↓: bajar
- Espacio: caída instantánea
- P o Escape: pausar
- En móvil: controles táctiles bajo el tablero

El récord se guarda en localStorage del navegador.
