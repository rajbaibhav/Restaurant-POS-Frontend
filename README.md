# Eat & Park Restaurant POS Webapp

## Overview

Eat & Park is a restaurant point-of-sale web application built with React and Vite. It provides a staff-facing terminal for table management, order taking, billing, and daily sales reporting. Admin users can also manage menu items, staff approvals, and view sales logs.

## Key Features

- Authentication
  - Login with name and PIN
  - Register new accounts
  - Owner/admin role detection
  - PIN change support from the sidebar

- Table management and floor plan
  - View table statuses: Available, Occupied, Pending Payment
  - Quick table actions for opening orders, adding items, and generating bills
  - Real-time table totals and item counts

- Order management
  - Browse active menu items with category filters
  - Search menu items by name
  - Veg / Non-Veg filtering
  - Draft order queue and live cart preview
  - Send orders to the kitchen or prepare a bill

- Billing and payment
  - Review final bill for a selected table
  - Choose payment methods: Cash, Card, UPI
  - Slide-to-confirm checkout flow
  - Direct 80mm Bluetooth ESC/POS thermal receipt printing
  - In-browser thermal receipt print preview and standard print fallback
  - Print & export invoice as PDF
  - Bluetooth device manager with connection status and test slip printing

- Checkout & bill registry
  - Final checkout page for pending bills
  - Bill registry page for daily sales history
  - Daily sales summary and bill export to PDF

- Admin portal (owner only)
  - User/staff management and approvals
  - Reset staff PINs
  - Manage menu items and item availability status
  - Add new menu items and review pending items
  - Access sold items logs

- Sold items logs
  - View historic sales by date and table
  - Retains logs for 30 days
  - Inspect individual bills and item quantities

- Responsive UI
  - Mobile-friendly header and sidebar
  - Adaptive order/cart flow for small screens

## Application Flow (Page by Page)

### 1. Login / Register

- The first page is the `Auth` screen.
- Staff and owner users can log in with name + PIN.
- New users may register and wait for approval.
- After login, owner users are routed to the admin portal.

### 2. Floor Plan Dashboard

- After authentication, users land on the `Dashboard` floor plan.
- Tables are displayed with status badges.
- Available tables show an "Open Order" action.
- Occupied tables show "Add" and "Pay" buttons.
- The table card also shows the current bill total and item count.

### 3. Order Module

- Selecting a table opens the `OrderModule`.
- Menu items can be filtered by category or dietary preference.
- Search lets staff quickly find dishes.
- Staff can add or remove quantities from the draft order.
- Draft items are stored in a live queue and shown in the cart view.
- From here, staff can send the order to the kitchen or view the bill.

### 4. Billing Page

- The `BillingModule` displays the selected table's final bill.
- It calculates subtotal, tax/service charges, and total.
- The staff selects Cash, Card, or UPI.
- A slide-to-confirm payment control finalizes checkout.
- Users may also print or export the invoice as a PDF.

### 5. Checkout Map

- The `CheckoutMap` page lists tables with pending bills.
- It shows payables for tables that still need settlement.
- Staff can choose a table and proceed to finalize payment.

### 6. Bill Registry

- The `SalesHistory` page shows today’s completed transactions.
- It includes total bills, daily revenue, and total items served.
- Daily registry entries can be exported as PDF reports.
- Completed bills are displayed with invoice ID, table, time, payment method, and amount.

### 7. Admin Dashboard

- Owner users access the `AdminDashboard`.
- This page provides revenue overview, active table count, and items sold.
- Admins can review and approve/pause staff accounts.
- Menu items can be moved between Current, Pending, and Not Selling statuses.
- Admins can add new menu items and manage inventory.
- A logs panel opens the sold items history.

### 8. Sold Items Logs

- The `SoldItemsLogs` modal displays sales history by date.
- Users can drill into a specific day.
- Then they can inspect per-table bills and item breakdowns.
- Logs are retained for the last 30 days.

## Running the App

### Frontend

1. Navigate to the webapp folder:
   `cd "d:\backend\Ep Full\eat-and-park-management-webapp"`
2. Install dependencies:
   `npm install`
3. Start the development server:
   `npm run dev`

### Backend

1. Navigate to the backend folder:
   `cd "d:\backend\Ep Full\Ep backend"`
2. Install dependencies:
   `npm install`
3. Start the backend server:
   `npm run dev`

### Environment

- The frontend expects the backend API base URL in `VITE_API_URL`.
- If not set, it defaults to `http://localhost:5000`.

## Notes

- The app uses token-based auth stored in `localStorage`.
- Owner/admin users see the full admin portal and staff controls.
- Staff users operate the floor plan, order flow, checkout, and registry only.
- Payment is finalized with a secure backend transaction call.

## Folder Structure

- `src/` or top-level frontend file layout includes `App.tsx`, `components/`, `services/`, and `types.ts`.
- `components/` contains: `Auth`, `Dashboard`, `OrderModule`, `BillingModule`, `CheckoutMap`, `SalesHistory`, `AdminDashboard`, `SoldItemsLogs`, `Sidebar`, `ChangePinModal`.
- `services/` contains API client calls for auth, menu, tables, transactions, staff, and reports.

---

This README captures the app’s key capabilities and the user journey from login to payment and logging.