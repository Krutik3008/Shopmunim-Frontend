# 🏪 ShopMunimApp

A full-featured mobile application for managing shop-customer relationships — with dedicated interfaces for **Customers**, **Shop Owners**, and **Admins**. Built with React Native & Expo.

---

## ⚙️ Tech Stack

- **React Native** (Expo SDK 54)
- **React Navigation** (Tab + Stack navigation)
- **Expo Print / Sharing / FileSystem** (PDF & Excel exports)
- **XLSX** (Excel spreadsheet generation)
- **DateTimePicker** (Date range filters)
- **QR Code** (react-native-qrcode-svg)
- **Expo Clipboard** (Copy links)

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

## 🌟 Features

### � Authentication
- Phone number + OTP based login
- Phone validation & OTP verification
- Role-based navigation (auto-redirects to Customer / Shop Owner / Admin)

---

### 👤 Customer Side

#### 📊 Dashboard
- Overview of connected shops and balances
- Pull-to-refresh for latest data

#### 📒 Ledger Tab
- View full transaction ledger per shop
- Summary stats (total credit, payments, balance)
- Expandable transaction details with product items

#### 💳 Payments Tab
- View payment history
- Track all payments made to shops

#### 📜 History Tab
- Complete transaction history (credits & payments)
- Color-coded entries (green = payment, red = credit)

#### 👤 Account Tab
- View profile info (name, phone, role)
- Role switch button (switch to Shop Owner / Admin if eligible)

---

### 🏪 Shop Owner Side

#### 🏠 Home Dashboard
- Shop stats overview (total customers, revenue, pending balance)
- Recent transactions list
- Quick action buttons
- Create new shop option

#### 📦 Products Management
- Add, edit, and delete products
- Product name, price, unit fields
- Toggle product active/inactive status
- Pull-to-refresh product list

#### 👥 Customers Management
- View all shop customers with balances
- Add new customer (by phone number)
- Search customers by name
- Customer cards with balance status (color-coded: green/red/neutral)
- Tap customer to view detailed transactions

#### 📋 Customer Detail Screen
- Customer info header with balance display
- Transaction history with filters (All / Credits / Payments)
- Add new transaction (credit or payment)
- Send UPI payment link
- Send payment request via WhatsApp

#### 💰 Add Transaction Modal
- Select transaction type (Credit / Payment)
- Pick products from product list
- Enter quantity and amount
- Add optional note
- Auto-calculate totals

#### 📊 Transactions Tab
- View all shop transactions
- Transaction cards with customer name, amount, date

#### 📱 QR Code & Sharing
- Auto-generated QR code for shop
- Share QR code image
- Download QR code
- Copy shop link to clipboard
- Share via WhatsApp / other apps

#### 👤 Account Tab
- Shop info & owner details
- Role switch (switch to Customer / Admin)
- Shop settings

---

### 🔐 Admin Panel

#### 📊 Admin Dashboard
- Overview stats (total users, shops, transactions, revenue)
- Stat cards with icons and colors
- Pull-to-refresh

#### 👥 User Management
- Paginated user table (searchable)
- View user details (name, phone, role, status, join date)
- Verify / Unverify users
- Flag / Unflag users
- Role badges with colors

#### 🏪 Shop Management
- Paginated shop list (searchable)
- Shop cards with category badges
- View shop details (name, owner, category, customers, revenue)

#### 🛒 Customer Management
- View all customers across all shops
- Search by customer name or shop name
- Filter by shop
- Customer cards with balance, transaction count
- Stats cards (total customers, total balance, active shops)
- Tap customer → opens detailed transaction view

#### 📋 Admin Customer Detail Screen
- Customer info (name, phone, balance, status)
- Purchase analytics (total transactions, credits, payments, items purchased)
- Transaction history with filters:
  - **Date range filter** with "Set" & "Clear" buttons
  - **Type filter** — All / Credits / Payments
- **PDF Export** — Styled admin report:
  - Header with lock icon & admin badge
  - Shop & customer info sections
  - Analytics summary boxes
  - Color-coded transaction table
  - Filename: `{customer_name}.pdf`
- **Excel Export** — `.xlsx` file:
  - Header rows (Shop, Customer, Report Generated date)
  - Transaction table (Date, Type, Items, Quantity, Amount, Note)
  - Filename: `{customer_name}.xlsx`

#### 👥 Role Management
- Search users by name or phone
- **Show Test Users** toggle (hides default "User" named accounts)
- User cards with role badges:
  - 🛡️ **Admin** — Blue solid badge with shield icon (View only)
  - 🏅 **Super Admin** — Amber solid badge with ribbon icon (Full management)
  - 🏪 **Shop Owner** — Green outlined badge with storefront icon
  - 🛒 **Customer** — Orange outlined badge with cart icon
  - ✅ **Verified** — Green solid badge with checkmark icon
- **Manage Roles** modal:
  - **Super Admin**: Can grant/revoke admin access and promote users.
  - **Admin**: Can view current roles but management actions are disabled.
- **Role Management Guidelines** card with usage instructions

#### 🧭 Admin Bottom Navigation
- Home | Users | Shops | Customers | Roles | Logout

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
