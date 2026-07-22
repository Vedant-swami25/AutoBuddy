require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { connectDatabase } = require("./config/database");
const { pageRoutes } = require("./config/pageRoutes");
const apiRoutes = require("./routes");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const frontendRoot = path.join(__dirname, "..", "frontend");

// Global middleware used by every page and API route.
app.use(cors());
app.use(express.json());
app.use(express.static(frontendRoot));

connectDatabase();

apiRoutes.forEach(({ path: routePath, router }) => {
  app.use(routePath, router);
});

Object.entries(pageRoutes).forEach(([route, file]) => {
  app.get(route, (_req, res) => {
    res.sendFile(path.join(frontendRoot, file));
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
