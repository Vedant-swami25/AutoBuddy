const { mongoose } = require("../config/database");

const serviceSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true },
  vehicleType: {
    type: String,
    enum: ["car", "bike", "both"],
    default: "both"
  },
  durationMinutes: { type: Number, default: 45 },
  popular: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Service", serviceSchema);
