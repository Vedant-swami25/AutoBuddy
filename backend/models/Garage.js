const { mongoose } = require("../config/database");

const garageSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  address: { type: String, default: null },
  lat: { type: Number, default: 0 },
  lng: { type: Number, default: 0 },
  city: { type: String, default: null },
  verified: { type: Boolean, default: false },
  rating: { type: Number, default: 4.5 },
  etaMinutes: { type: Number, default: 20 },
  phone: { type: String, default: null },
  hours: { type: String, default: null },
  mechanic: { type: String, default: null },
  vehicle: { type: String, default: null },
  services: [{ type: String }],
  vehicleTypes: [{ type: String }],
  image: { type: String, default: null },
  specialties: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Garage", garageSchema);
