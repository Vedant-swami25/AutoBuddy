const { mongoose } = require("../config/database");

const bookingSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  userId: { type: String, default: null },
  user: {
    id: { type: String, default: null },
    name: { type: String, required: true },
    mobile: { type: String, required: true }
  },
  service: { type: String, required: true },
  price: { type: Number, default: null },
  garage: { type: String, default: null },
  garageId: { type: String, default: null },
  city: { type: String, default: null },
  rating: { type: Number, default: 4.7 },
  travelMinutes: { type: Number, default: 20 },
  distanceKm: { type: Number, default: null },
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
  acceptedAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "in_progress", "completed", "cancelled"],
    default: "pending"
  },
  vehicleType: {
    type: String,
    enum: ["car", "bike"],
    default: "car"
  },
  vehicleInfo: { type: String, default: null },
  ownerNote: { type: String, default: null }
});

bookingSchema.index({ garageId: 1, createdAt: -1 });
bookingSchema.index({ "user.mobile": 1, createdAt: -1 });
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ "user.id": 1, createdAt: -1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);

