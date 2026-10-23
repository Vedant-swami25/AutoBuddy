<div align="center">

<img src="https://capsule-render.vercel.app/api?type=venom&height=260&text=AutoBuddy&fontSize=60&color=0:00C896,100:1F2937&stroke=00C896&strokeWidth=2&fontColor=ffffff"/>

<img src="https://readme-typing-svg.demolab.com?font=Poppins&weight=700&size=24&pause=1000&color=00C896&center=true&vCenter=true&width=750&lines=Vehicle+Breakdown+Assistance+Platform;Nearby+Verified+Garages;Real-Time+Mechanic+Tracking;Built+with+Node.js+%7C+Express+%7C+MongoDB"/>

</div>

## ✨ Features

- 🔐 **Multi-Role Authentication**: Dedicated portals for Customer Drivers, Garage Workshop Owners, and Platform Administrators with passwordless mobile OTP verification.
- 🚗 **3D Interactive Vehicle Studio**: Real-time Three.js vehicle viewport with multi-angle camera presets (3/4, side, front, back) and custom finish swatches.
- 🏍️ **Dual Vehicle Mode**: One-tap toggle between Car (Four-Wheeler) and Bike (Two-Wheeler) modes across services, pricing, and dispatch.
- 📍 **Live GPS Location & Geocoding**: Automatic browser geolocation detection with reverse geocoding and fallback pin support.
- 🗺️ **Nearby Garage Finder**: Interactive Leaflet & OpenStreetMap discovery displaying nearby verified workshops, distances, and real-time ETAs.
- ⭐ **Certified Garages Directory**: Searchable directory of verified partner workshops with ratings, operational hours, services, and direct booking.
- 🧰 **Services & Transparent Pricing**: Categorized catalog covering cleaning, scheduled maintenance, and emergency breakdown packages with upfront pricing.
- 🚐 **On-Demand Mobile Dispatch & SOS**: Immediate booking of roadside assistance vans and emergency SOS support.
- 🚗 **Real-Time Live Tracking**: Route rendering on map with moving service technician markers, progress timelines, and live status progression.
- 📦 **My Bookings Dashboard**: History and live status of customer appointments with status filtering (Pending, In Progress, Completed, Cancelled).
- 🛠️ **Garage Owner Portal**: Dedicated partner dashboard to toggle dispatch availability, review incoming user requests, and manage repair lifecycle.
- 🛡️ **Administrator Control Panel**: Comprehensive metrics, workshop verification and onboarding, user account management, and real-time login audit trails.
- 🌓 **Dynamic Theme System**: Sleek modern dark mode and light mode with fluid micro-animations.

---

## 🛠️ Tech Stack

**Frontend**
- HTML5 (Semantic Structure)
- Vanilla CSS3 (Custom design system, glassmorphism, responsive grid & dark/light themes)
- Modern JavaScript (ES6+ Modules, Fetch API, DOM Controllers)
- Three.js (3D Vehicle Studio & Interactive Shaders)
- Leaflet.js & OpenStreetMap (Interactive Mapping & Route Visuals)

**Backend**
- Node.js
- Express.js
- Express Rate Limiting (In-memory abuse prevention)
- CORS Middleware

**Database**
- MongoDB
- Mongoose ODM

---

## 📸 Screenshots

### 🔐 Authentication Portal
![AutoBuddy Login](screenshots/login.png)

### 🏠 User Dashboard & 3D Vehicle Studio
![AutoBuddy User Dashboard](screenshots/user-dashboard.png)

### 🏢 Certified Garages Directory
![AutoBuddy Garage List](screenshots/garage-list.png)

### 🗺️ Nearby Garages & Map Discovery
![AutoBuddy Nearby Garages Map](screenshots/nearby-garages-map.png)

### 🧰 Service Catalog & Transparent Pricing
![AutoBuddy Services](screenshots/services.png)

### 📦 Instant Booking & Dispatch
![AutoBuddy Booking](screenshots/booking.png)

### 📅 My Bookings & Request History
![AutoBuddy My Bookings](screenshots/my-bookings.png)

### 📍 Real-Time Mechanic Live Tracking
![AutoBuddy Live Tracking](screenshots/live-tracking.png)

### 🛠️ Partner Garage Owner Dashboard
![AutoBuddy Garage Owner Dashboard](screenshots/owner-dashboard.png)

### 🛡️ Administrator Control Dashboard
![AutoBuddy Admin Dashboard](screenshots/admin-dashboard.png)

---

## 🚀 Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/Vedant-swami25/AutoBuddy.git
cd AutoBuddy
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
# MongoDB Connection String
# Local MongoDB:
MONGODB_URI=mongodb://localhost:27017/autobuddy
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/autobuddy

# Server Port
PORT=3000

# Node Environment
NODE_ENV=development
```

### 4. Seed database presets

Import verified garage seed records and demo datasets into MongoDB:

```bash
npm run migrate
```

### 5. Start the application

```bash
npm start
```

Open your browser and visit:
```
http://localhost:3000
```

---

## 📂 Project Structure

```text
AutoBuddy
│
├── backend
│   ├── config
│   │   ├── database.js          # MongoDB connection via Mongoose
│   │   └── pageRoutes.js        # Static page route bindings
│   │
│   ├── controllers
│   │   ├── adminController.js    # Platform metrics, workshop & user controls
│   │   ├── authController.js     # Multi-role OTP generation & verification
│   │   ├── bookingController.js  # Dispatch creation, status lifecycle & lookup
│   │   ├── garageController.js   # Workshop retrieval, filtering & verification
│   │   ├── locationController.js # Reverse geocoding & coordinates lookup
│   │   ├── loginController.js    # User authentication & session helpers
│   │   └── pincodeController.js  # Pincode geographic caching
│   │
│   ├── data
│   │   ├── garages.json          # Pre-configured verified workshop records
│   │   └── pincode-cache.json    # Local postal code geodata cache
│   │
│   ├── middleware
│   │   ├── adminAuth.js          # Administrator authorization guard
│   │   ├── auth.js               # User role authorization middleware
│   │   └── rateLimiter.js        # OTP rate limiter & request throttling
│   │
│   ├── models
│   │   ├── Booking.js            # Booking schema, status stages & coordinates
│   │   ├── Garage.js             # Garage schema, services & verification flags
│   │   ├── LoginHistory.js       # Real-time login audit log schema
│   │   └── User.js               # Multi-role user account schema
│   │
│   ├── routes
│   │   ├── admin.js              # Admin API routes (/api/admin/*)
│   │   ├── auth.js               # Authentication & OTP routes (/api/auth/*)
│   │   ├── booking.js            # Booking lifecycle routes (/api/bookings/*)
│   │   ├── garage.js             # Workshop directory routes (/api/garages/*)
│   │   ├── index.js              # Express router aggregator
│   │   ├── location.js           # Geocoding routes (/api/location/*)
│   │   ├── login.js              # Legacy login compatibility route
│   │   └── pincode.js            # Pincode query routes (/api/pincode/*)
│   │
│   ├── scripts
│   │   └── migrate.js            # Seed data migration script
│   │
│   ├── services
│   │   ├── bookingTracking.js    # ETA & progression calculation
│   │   ├── otpService.js         # Mobile OTP generation & verification
│   │   └── pincodeCache.js       # Postal code resolution service
│   │
│   ├── utils
│   │   └── coordinates.js        # Distance calculation & coordinate validation
│   │
│   └── server.js                 # Express application entry point
│
├── frontend
│   ├── assets
│   │   ├── css/                  # Styling (style.css, admin.css, owner.css, sidebar.css)
│   │   ├── images/               # Logos, icons & brand assets
│   │   ├── js/                   # Client controllers (map, 3D, auth, tracking, admin)
│   │   └── models/               # 3D vehicle assets (GLTF/GLB)
│   │
│   ├── admin-dashboard.html      # Administrator control dashboard
│   ├── garage.html               # Verified garage directory & search
│   ├── index.html                # Main customer home & 3D vehicle studio
│   ├── login.html                # Multi-role sign in & registration
│   ├── map.html                  # Interactive garage finder & live route tracking
│   ├── owner-dashboard.html      # Garage owner partner portal
│   ├── partner.html              # Workshop partner onboarding landing
│   ├── services.html             # Categorized service catalog & pricing
│   └── tracking.html             # User booking history & status feed
│
├── screenshots                   # Genuine application UI captures
│   ├── admin-dashboard.png
│   ├── booking.png
│   ├── garage-list.png
│   ├── live-tracking.png
│   ├── login.png
│   ├── my-bookings.png
│   ├── nearby-garages-map.png
│   ├── owner-dashboard.png
│   ├── services.png
│   └── user-dashboard.png
│
├── .env.example
├── .gitignore
├── MONGODB_SETUP.md
├── package.json
├── package-lock.json
└── README.md
```

---

## 🚀 Future Improvements

- 💳 Online Payment Gateway Integration (UPI, Cards, NetBanking)
- 📲 Native SMS & WhatsApp OTP Gateway Integration
- 🔔 Real-Time Browser Push & SMS Status Notifications
- 🤖 AI-Powered Vehicle Breakdown Diagnostics
- 🌟 Direct Customer Review & Workshop Rating Submission

---

## 👨‍💻 Author

**Vedant Swami**

GitHub: [https://github.com/Vedant-swami25](https://github.com/Vedant-swami25)

---

⭐ If you like this project, don't forget to star the repository!
