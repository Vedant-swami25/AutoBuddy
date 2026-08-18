const { mongoose } = require("../config/database");

const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, default: "" },
  mobile: { type: String, required: true, unique: true },
  district: { type: String, default: "" },
  state: { type: String, default: "" },
  role: { type: String, enum: ["user", "garage_owner", "admin"], default: "user" },
  garageId: { type: String, default: null },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
