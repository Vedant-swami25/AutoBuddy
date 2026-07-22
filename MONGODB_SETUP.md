# AutoBuddy MongoDB Setup Guide

Your AutoBuddy application has been migrated from JSON file storage to MongoDB. Follow these steps to set up your database:

## Option 1: Local MongoDB Installation

### Windows
1. Download MongoDB from: https://www.mongodb.com/try/download/community
2. Run the installer and follow the installation wizard
3. MongoDB will start as a Windows Service automatically
4. Verify installation by opening Command Prompt and running:
   ```
   mongosh
   ```

### macOS
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

## Option 2: MongoDB Atlas (Cloud)

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for a free account
3. Create a new cluster
4. Get your connection string (it will look like):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/autobuddy
   ```
5. Update the `.env` file with your connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/autobuddy
   ```

## Setup Steps

### 1. Create .env File
The `.env` file already exists in the root directory. Verify it contains:
```
MONGODB_URI=mongodb://localhost:27017/autobuddy
PORT=3000
NODE_ENV=development
```

### 2. Start MongoDB (if local)
If using local MongoDB, ensure the service is running:
- **Windows**: MongoDB runs as a service automatically
- **macOS/Linux**: Run `brew services start mongodb-community` or `sudo systemctl start mongodb`

### 3. Install Dependencies
```bash
npm install
```

### 4. Migrate Data (Optional)
If you have existing data in JSON files, migrate it to MongoDB:
```bash
npm run migrate
```

This will:
- Read data from `backend/data/logindata.json`
- Read data from `backend/data/booking.json`
- Read data from `backend/data/garages.json`
- Import all records into MongoDB

### 5. Start the Server
```bash
npm start
```

The server will run on `http://localhost:3000`

## Database Structure

### Collections

#### Users
- Stores login information
- Fields: id, name, mobile, district, state, lat, lng, createdAt, updatedAt

#### Bookings
- Stores booking/service request data
- Fields: id, user, service, price, garage, city, location, garageLocation, etc.

#### Garages
- Stores garage/partner information
- Fields: id, name, lat, lng, city, verified, rating, phone, mechanic, vehicle, specialties

## Troubleshooting

### Connection Error: "connect ECONNREFUSED 127.0.0.1:27017"
- MongoDB is not running locally
- Solution: Start MongoDB service or use MongoDB Atlas connection string

### "Authentication failed" (MongoDB Atlas)
- Check your username and password in the connection string
- Ensure your IP is whitelisted in MongoDB Atlas security settings

### Port Already in Use
- Change PORT in `.env` file to an available port
- Or kill the process using the current port

## Verifying Setup

To verify MongoDB is set up correctly:

1. Open MongoDB shell:
   ```bash
   mongosh
   ```

2. Switch to autobuddy database:
   ```
   use autobuddy
   ```

3. Check collections:
   ```
   show collections
   ```

4. View sample data:
   ```
   db.users.find()
   db.bookings.find()
   db.garages.find()
   ```

## Backup and Migration

### Backup Database
```bash
mongodump --uri="mongodb://localhost:27017/autobuddy" --out=./backups
```

### Restore Database
```bash
mongorestore --uri="mongodb://localhost:27017/autobuddy" ./backups/autobuddy
```

## Next Steps

- All frontend code remains unchanged
- API endpoints are the same
- Start making requests to the server
- User, booking, and garage data will be automatically saved to MongoDB

For more information on MongoDB, visit: https://docs.mongodb.com/
