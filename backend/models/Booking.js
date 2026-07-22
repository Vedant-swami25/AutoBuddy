const { mongoose } = require("../config/database");

const bookingSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  user: {
    name: { type: String, required: true },
    mobile: { type: String, required: true }
  },
  service: { type: String, required: true },
  price: { type: Number, default: null },
  garage: { type: String, default: null },
  garageId: { type: String, default: null },
  city: { type: String, default: null },
  rating: { type: Number, default: 4.7 },
  travelMinutes: { type: Number, default: 28 },
  mechanic: { type: String, default: null },
  vehicle: { type: String, default: null },
  phone: { type: String, default: null },
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  garageLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  garageLat: { type: Number, default: null },
  garageLng: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  status: { type: String, default: "confirmed" }
});

module.exports = mongoose.model("Booking", bookingSchema);
