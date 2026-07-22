const { mongoose } = require("../config/database");

const userSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true, unique: true },
  district: { type: String, required: true },
  state: { type: String, required: true },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
