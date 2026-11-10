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

## Controles
- ← / →: mover
- ↑ o X: girar
- ↓: bajar
- Espacio: caída instantánea
- P o Escape: pausar
- En móvil: controles táctiles bajo el tablero

El récord se guarda en localStorage del navegador.

## Android APK
Instala Android Studio y el SDK de Android. La primera vez, crea el proyecto nativo y compila:
```bash
npx cap add android
npm run android:apk
```
El APK de depuración se genera en `android/app/build/outputs/apk/debug/app-debug.apk`.
