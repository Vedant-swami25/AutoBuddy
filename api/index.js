const express = require("express");
const cors = require("cors");
const { connectDatabase, mongoose } = require("../backend/config/database");
const apiRoutes = require("../backend/routes");

const app = express();

app.use(cors());
app.use(express.json());

// Serverless-friendly database connection handler
// Caches connection state across function warm invocations
app.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDatabase();
    }
  } catch (err) {
    console.error("Database connection middleware error:", err.message);
  }
  next();
});

// Register all existing API routes
apiRoutes.forEach(({ path: routePath, router }) => {
  app.use(routePath, router);
});

// Root API health check
app.get("/api", (_req, res) => {
  res.json({
    status: "online",
    name: "AutoBuddy API",
    version: "1.0.0",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

module.exports = app;
