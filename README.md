<div align="center">

<img src="https://capsule-render.vercel.app/api?type=venom&height=260&text=AutoBuddy&fontSize=60&color=0:00C896,100:1F2937&stroke=00C896&strokeWidth=2&fontColor=ffffff"/>

<img src="https://readme-typing-svg.demolab.com?font=Poppins&weight=700&size=24&pause=1000&color=00C896&center=true&vCenter=true&width=750&lines=Vehicle+Breakdown+Assistance+Platform;Nearby+Verified+Garages;Real-Time+Mechanic+Tracking;Built+with+Node.js+%7C+Express+%7C+MongoDB"/>

</div>

✨ Features

- 🔐 User Authentication
- 📍 Live GPS Location
- 🗺️ Nearby Garage Finder
- 🚐 Mobile Mechanic Booking
- 📦 Booking History
- 🚗 Live Tracking
- ⭐ Verified Garages
- 📱 Responsive UI

---

🛠️ Tech Stack

**Frontend**
- HTML
- CSS
- JavaScript

**Backend**
- Node.js
- Express.js

**Database**
- MongoDB
- Mongoose

**Maps**
- Leaflet.js
- OpenStreetMap

---

📸 Screenshots

🏠 Home Page

<img width="1496" height="1017" alt="image" src="https://github.com/user-attachments/assets/7e8d7b3c-457c-4021-b700-7ffbd347cf51" />

🔐 Login Page

<img width="1503" height="1021" alt="image" src="https://github.com/user-attachments/assets/395e0e15-3b84-434e-9730-34db208a9675" />


🚗 Garage List

<img width="1551" height="1012" alt="image" src="https://github.com/user-attachments/assets/6e80201c-0610-46ea-b022-6ae76e49ce76" />


🗺️ Live Map

<img width="1677" height="998" alt="image" src="https://github.com/user-attachments/assets/0b7a5ae4-a9b7-4d97-8120-39514f8d7859" />


📦 Booking


<img width="817" height="517" alt="image" src="https://github.com/user-attachments/assets/e6a263ff-0aeb-46e4-abfb-43a63219150f" />


🚐 Live Tracking


<img width="1447" height="1001" alt="image" src="https://github.com/user-attachments/assets/a2449330-7266-4a0d-bca4-fdf715107812" />


🛠️ Services


<img width="1451" height="1006" alt="image" src="https://github.com/user-attachments/assets/30d11a06-a82b-4fb0-89bd-bedbf5397012" />


🚀 Installation

Clone the repository

```bash
git clone https://github.com/Vedant-swami25/AutoBuddy.git
```

Install dependencies

```bash
npm install
```

Create `.env`

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

Import demo data

```bash
npm run migrate
```

Run project

```bash
npm start
```

📂 Project Structure

```text
AutoBuddy
│
├── backend
│   ├── config
│   │   ├── database.js
│   │   └── pageRoutes.js
│   │
│   ├── controllers
│   │   ├── bookingController.js
│   │   ├── garageController.js
│   │   ├── locationController.js
│   │   ├── loginController.js
│   │   └── pincodeController.js
│   │
│   ├── data
│   │   ├── garages.json
│   │   └── pincode-cache.json
│   │
│   ├── models
│   │   ├── Booking.js
│   │   ├── Garage.js
│   │   └── User.js
│   │
│   ├── routes
│   │   ├── booking.js
│   │   ├── garage.js
│   │   ├── location.js
│   │   ├── login.js
│   │   ├── pincode.js
│   │   └── index.js
│   │
│   ├── scripts
│   │   └── migrate.js
│   │
│   ├── services
│   │   ├── bookingTracking.js
│   │   └── pincodeCache.js
│   │
│   ├── utils
│   │   └── coordinates.js
│   │
│   └── server.js
│
├── frontend
│   ├── assets
│   │   ├── css
│   │   └── js
│   │
│   ├── garage.html
│   ├── index.html
│   ├── login.html
│   ├── map.html
│   ├── partner.html
│   ├── services.html
│   └── tracking.html
│
├── .env.example
├── .gitignore
├── MONGODB_SETUP.md
├── package.json
├── package-lock.json
└── README.md
```



🚀 Future Improvements

- Online Payments
- Push Notifications
- AI Vehicle Diagnosis
- Ratings & Reviews
- Admin Dashboard

---

👨‍💻 Author

"Vedant Swami"

GitHub: https://github.com/Vedant-swami25

---

⭐ If you like this project, don't forget to star the repository!
