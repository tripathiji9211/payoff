# OfflinePay: Payments That Work Everywhere. Even Offline.

**Team:** Decoders.AI
**Project:** Offline-first Digital Wallet for Zero-Connectivity Environments

OfflinePay is a revolutionary digital payment application designed to function flawlessly without internet access. Built for rural areas, disaster zones, and high-density events, it ensures that your economy never stops just because your connection does. 

## 🏆 Key Features

- ✅ **Cryptographic Offline Vault**: Securely processes and signs transactions locally using AES-256 and SHA-256. No network connection is needed to finalize a payment.
- ✅ **Dynamic Trust Score Engine**: Intelligently enforces transaction limits based on an automated local Trust Score, protecting against fraud while rewarding consistent user behavior.
- ✅ **Dual-Band Transmission**:
  - **Primary**: Hyper-fast, encrypted QR code generation and scanning using `html5-qrcode`.
  - **Fallback**: Ultra-compressed SMS token protocol using `lz-string` (sub-160 character limit), ensuring money can move over standard cellular networks when cameras or Bluetooth fail.
- ✅ **Optimistic Background Sync**: Advanced `IndexedDB` sync engine that waits for `navigator.onLine` to restore, silently pushing all pending transactions to the network while managing balance reversals on failure.
- ✅ **Progressive Web App (PWA)**: Installable directly to the home screen. Caches all application shells and dependencies for a true 100% offline launch experience.
- ✅ **Live Hackathon Demo Mode**: Built-in presentation orchestrator that spoofs network status and automatically drives the UI to ensure a flawless pitch experience.

## 🏗️ Architecture Diagram Description

1. **Client Layer (PWA)**: React + Tailwind CSS + Framer Motion. Served via Workbox service worker for offline availability.
2. **Security Module**: `crypto-js` handles AES encryption of the payload using a user-derived PIN and signs the payload with SHA-256.
3. **Local Database Engine**: `idb` library managing IndexedDB stores (`users`, `transactions`, `usedTokens`) to securely persist ledgers when disconnected.
4. **Transmission Layer**: Token data is dynamically compressed (`lz-string`) for SMS dispatch or instantly generated as a high-density QR SVG.
5. **Sync Engine**: Event listener hooks to `window.online/offline`. Triggers an asynchronous queue processing pipeline that simulates a 90% network success rate with dynamic rollback capabilities.

## 🚀 Setup & Installation

**Prerequisites:**
- Node.js (v18+)

```bash
# 1. Clone the repository
git clone https://github.com/decoders-ai/offlinepay.git
cd offlinepay/frontend

# 2. Install dependencies (Legacy peer deps required for Vite PWA resolution)
npm install --legacy-peer-deps

# 3. Start the development server
npm run dev
```

## 📱 Mobile UX & Accessibility

OfflinePay is heavily optimized for mobile environments:
- Touch-friendly scaling with `44px` minimum tap targets.
- iOS `viewport-fit=cover` and translucent status bars.
- Custom haptic-feedback CSS scaling on active button presses.
- React Error Boundaries to catch critical crashes gracefully.
- Responsive, dark-themed glassmorphism aesthetic tailored for high-contrast visibility.

---

*Built with ❤️ by Decoders.AI for the future of decentralized offline commerce.*
