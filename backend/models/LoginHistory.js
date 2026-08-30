const { mongoose } = require("../config/database");

const loginHistorySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  userId: { type: String, default: null },
  name: { type: String, required: true, default: "Authenticated User" },
  email: { type: String, default: "" },
  mobile: { type: String, required: true, default: "" },
  role: {
    type: String,
    enum: ["user", "garage_owner", "admin", "customer", "owner"],
    default: "user"
  },
  garageId: { type: String, default: null },
  garageName: { type: String, default: null },
  ip: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now }
});

loginHistorySchema.index({ timestamp: -1 });

module.exports = mongoose.model("LoginHistory", loginHistorySchema);
