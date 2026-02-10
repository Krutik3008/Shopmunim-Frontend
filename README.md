# 🏪 ShopMunimApp

A mobile application for shop owners to manage customers, transactions, and business operations.

---

## ️ Tech Stack

- React Native
- Expo SDK 54
- React Navigation

---

## 📦 Prerequisites

- **Node.js** (v18+) - [Download](https://nodejs.org/)
- **Android Studio** with Emulator - [Download](https://developer.android.com/studio)
- **Expo Go App** (for physical device) - Download from Play Store

---

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ShopMunimApp.git
cd Shopmunim-Frontend

# Install dependencies
npm install
```

---

## 📱 Run on Android

### Option 1: Android Emulator

```bash
npx expo start --android
```

### Option 2: Physical Android Device

1. Download **Expo Go** from Play Store
2. Connect phone to same WiFi as computer
3. Run:
```bash
npx expo start
```
4. Scan QR code with Expo Go app

### Option 3: Tunnel Mode (Different Network)

```bash
npx expo start --tunnel
```

---

## ⚡ Commands

| Command | Description |
|---------|-------------|
| `npm run android` | Run on Android |
| `npx expo start --android` | Run on Android emulator |
| `npx expo start --android --clear` | Clear cache and run |

---

## 🐛 Troubleshooting

### Metro Bundler Issues
```bash
npx expo start --android --clear
```

### Module Not Found
```bash
rm -rf node_modules
npm install
```

### Connection Failed
- Ensure phone and computer on same WiFi
- Try: `npx expo start --tunnel`

---

## 👨‍💻 Author

Developed with ❤️ for ShopMunim
