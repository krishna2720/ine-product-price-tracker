# 🛒 Product Price Tracker & Scraper

A full-stack web application designed to track real-time product prices, stock availability, and historical price trends across online stores. Built with **React (Vite)**, **Node.js (Express)**, **Playwright**, and **Supabase**.

---

## 🚀 Features

- **Live Automated Scraping:** Uses headless Playwright automation to extract real-time pricing and stock status securely.
- **Interactive Dashboard:** View all tracked products, latest prices, custom stock status badges, and precise timestamps.
- **Detailed Price History:** Dedicated view to inspect historical price movements and past scraper execution logs.
- **Asynchronous Sync:** User-triggered refresh mechanism that kicks off background scraping loops without timing out.
- **Robust Error Handling & Logging:** Detailed attempt tracking, error recording, and automatic retry support.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Axios, Lucide Icons
- **Backend:** Node.js, Express, Playwright, Node-Cron
- **Database & Storage:** Supabase (PostgreSQL)
- **Deployment:** Vercel (Frontend) & Render (Backend)

---

## 📁 Project Structure

```text
product-price-tracker/
├── backend/
│   ├── db.js             # Supabase client configuration
│   ├── index.js          # Express server & API routes
│   ├── scraper.js        # Core Playwright scraping logic
│   ├── run-scraper.js    # Local test script for scraping
│   ├── test-db.js        # Database connection test script
│   └── package.json      # Backend dependencies & scripts
└── frontend/
    ├── index.html        # Main HTML entry point
    ├── vite.config.js    # Vite configuration
    ├── tailwind.config.js# Tailwind CSS configuration
    ├── src/
    │   ├── App.jsx       # Root component & routing logic
    │   ├── main.jsx      # React DOM entry point
    │   ├── components/   # UI components (Navbar, etc.)
    │   └── pages/        # Dashboard, ProductDetail, Search
    └── package.json      # Frontend dependencies & scripts
```

---

## ⚙️ Local Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/krishna2720/ine-product-price-tracker.git
cd product-price-tracker
```

### 2. Backend Setup
```bash
cd backend
npm install
npx playwright install chromium
```
Create a `.env` file inside the `backend/` directory:
```env
PORT=10000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key
```
Run the backend server locally:
```bash
npm start
```

### 3. Frontend Setup
Open a separate terminal window:
```bash
cd frontend
npm install
```
Create a `.env` file inside the `frontend/` directory:
```env
VITE_API_URL=http://localhost:10000
```
Run the frontend development server:
```bash
npm run dev
```

---

## 🌐 Deployment Details

- **Frontend (Vercel):** Hosted as a static site with `VITE_API_URL` pointing to the live Render backend URL.
- **Backend (Render):** Hosted as a Web Service.
  - **Build Command:** `npm install && npx playwright install chromium`
  - **Start Command:** `node index.js`

---

## 👤 Author
**Krishna Agarwal**