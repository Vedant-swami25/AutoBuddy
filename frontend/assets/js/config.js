/**
 * Shared application constants and built-in verified garage fallback data.
 */

const API = (() => {
  const configuredApi = typeof window !== "undefined" ? window.AUTO_BUDDY_API : "";
  if (typeof configuredApi === "string" && configuredApi.trim()) {
    return configuredApi.trim().replace(/\/+$/, "");
  }

  if (typeof window === "undefined") {
    return "/api";
  }

  const { protocol, hostname, port } = window.location;
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

  if (protocol === "file:" || (isLocalHost && port && port !== "3000")) {
    return "http://localhost:3000/api";
  }

  return "/api";
})();

const AUTH_STORAGE_KEY = "autobuddyAuth";
const THEME_STORAGE_KEY = "autobuddyTheme";
const BOOKING_STORAGE_KEY = "autobuddyBookings";
const MAP_SELECTED_GARAGE_KEY = "autobuddySelectedMapGarage";
const ACTIVE_BOOKING_KEY = "autobuddyActiveBooking";
const LOCATION_SOURCE_KEY = "autobuddyLocationSource";
const AUTOBUDDY_SUPPORT_PHONE = "+91 1800-889-2889";
const VEHICLE_MODE_KEY = "autobuddyVehicleMode";
const OSM_API_KEY_STORAGE_KEY = "autobuddyOsmApiKey";
const DEFAULT_DEMO_LOCATION = {
  lat: 18.5204,
  lng: 73.8567,
  label: "Pune"
};

function getOpenStreetMapApiKey() {
  if (typeof window !== "undefined") {
    if (window.OPENSTREETMAP_API_KEY) return String(window.OPENSTREETMAP_API_KEY).trim();
    try {
      const stored = localStorage.getItem(OSM_API_KEY_STORAGE_KEY);
      if (stored) return String(stored).trim();
    } catch (e) {}
  }
  return "";
}

function setOpenStreetMapApiKey(key) {
  if (typeof window !== "undefined") {
    const val = key ? String(key).trim() : "";
    window.OPENSTREETMAP_API_KEY = val;
    try {
      if (val) {
        localStorage.setItem(OSM_API_KEY_STORAGE_KEY, val);
      } else {
        localStorage.removeItem(OSM_API_KEY_STORAGE_KEY);
      }
    } catch (e) {}
  }
}

if (typeof window !== "undefined") {
  window.AUTOBUDDY_SUPPORT_PHONE = AUTOBUDDY_SUPPORT_PHONE;
  window.VEHICLE_MODE_KEY = VEHICLE_MODE_KEY;
  window.getOpenStreetMapApiKey = getOpenStreetMapApiKey;
  window.setOpenStreetMapApiKey = setOpenStreetMapApiKey;
}

const GARAGE_FALLBACKS = [
  { id: "garage-001", name: "AutoBuddy Verified - Sai Auto Care", address: "JM Road, Shivajinagar, Pune", lat: 18.5308, lng: 73.8475, city: "Pune", verified: true, rating: 4.8, etaMinutes: 10, phone: "+919876501001", hours: "24x7", mechanic: "Rahul Patil", ownerName: "Rahul Patil", vehicle: "AutoBuddy Service Van", services: ["Engine Repair", "Battery Replacement", "Tyre Change", "Oil Change"], vehicleTypes: ["Car", "Bike"], image: "assets/images/garage-placeholder.svg", specialties: ["Roadside Assistance", "Engine Diagnostics"], available: true },
  { id: "garage-002", name: "AutoBuddy Verified - Metro Auto Works", address: "Baner Road, Baner, Pune", lat: 18.5590, lng: 73.7868, city: "Pune", verified: true, rating: 4.7, etaMinutes: 12, phone: "+919876501002", hours: "8 AM - 10 PM", mechanic: "Amit Jadhav", ownerName: "Amit Jadhav", vehicle: "AutoBuddy Service Van", services: ["AC Repair", "Brake Repair", "Wheel Alignment"], vehicleTypes: ["Car", "SUV"], image: "assets/images/garage-placeholder.svg", specialties: ["AC Service", "Wheel Balancing"], available: true },
  { id: "garage-003", name: "AutoBuddy Verified - Highway Rescue Garage", address: "Phase 1, Hinjewadi, Pune", lat: 18.5912, lng: 73.7389, city: "Pune", verified: true, rating: 4.9, etaMinutes: 9, phone: "+919876501003", hours: "24x7", mechanic: "Sagar Shinde", ownerName: "Sagar Shinde", vehicle: "Emergency Rescue SUV", services: ["Roadside Assistance", "Battery Jump Start", "Tyre Repair"], vehicleTypes: ["Car", "Bike", "SUV"], image: "assets/images/garage-placeholder.svg", specialties: ["Emergency Support", "Breakdown Rescue"], available: true },
  { id: "garage-004", name: "AutoBuddy Verified - Green Motors", address: "Wakad Chowk, Wakad, Pune", lat: 18.5995, lng: 73.7637, city: "Pune", verified: true, rating: 4.6, etaMinutes: 15, phone: "+919876501004", hours: "24x7", mechanic: "Nikhil More", ownerName: "Nikhil More", vehicle: "Service Van", services: ["Engine Repair", "Clutch Repair", "Battery Service"], vehicleTypes: ["Car", "Bike"], image: "assets/images/garage-placeholder.svg", specialties: ["Engine Diagnostics", "Clutch Work"], available: true },
  { id: "garage-005", name: "AutoBuddy Verified - Urban Auto Hub", address: "ITI Road, Aundh, Pune", lat: 18.5606, lng: 73.8078, city: "Pune", verified: true, rating: 4.8, etaMinutes: 11, phone: "+919876501005", hours: "9 AM - 9 PM", mechanic: "Pratik Kulkarni", ownerName: "Pratik Kulkarni", vehicle: "Compact Service Car", services: ["Diagnostics", "Oil Change", "AC Service"], vehicleTypes: ["Car"], image: "assets/images/garage-placeholder.svg", specialties: ["Computer Diagnostics", "Oil Service"], available: true },
  { id: "garage-006", name: "AutoBuddy Verified - Express Garage", address: "Old Mumbai Highway, Pimpri, Pune", lat: 18.6298, lng: 73.7997, city: "Pune", verified: true, rating: 4.7, etaMinutes: 14, phone: "+919876501006", hours: "24x7", mechanic: "Vishal Pawar", ownerName: "Vishal Pawar", vehicle: "Truck & Car Assist Van", services: ["Tyre Repair", "Battery", "General Service"], vehicleTypes: ["Truck", "Car"], image: "assets/images/garage-placeholder.svg", specialties: ["Heavy Vehicle Service", "Highway Support"], available: true },
  { id: "garage-007", name: "AutoBuddy Verified - QuickFix Auto", address: "Magarpatta Road, Hadapsar, Pune", lat: 18.4966, lng: 73.9419, city: "Pune", verified: true, rating: 4.8, etaMinutes: 13, phone: "+919876501007", hours: "8 AM - 11 PM", mechanic: "Kiran Chavan", ownerName: "Kiran Chavan", vehicle: "AutoBuddy Service Van", services: ["Brake Repair", "Suspension", "Engine Repair"], vehicleTypes: ["Car", "SUV"], image: "assets/images/garage-placeholder.svg", specialties: ["Suspension", "Brake System"], available: true },
  { id: "garage-008", name: "AutoBuddy Verified - Prime Garage", address: "EON IT Park Road, Kharadi, Pune", lat: 18.5535, lng: 73.9474, city: "Pune", verified: true, rating: 4.9, etaMinutes: 8, phone: "+919876501008", hours: "24x7", mechanic: "Akash Salunkhe", ownerName: "Akash Salunkhe", vehicle: "Rapid Response Van", services: ["Battery", "Tyre", "Oil Change"], vehicleTypes: ["Car"], image: "assets/images/garage-placeholder.svg", specialties: ["Corporate IT Park Rescue", "Battery Support"], available: true },
  { id: "garage-009", name: "AutoBuddy Verified - Silver Motors", address: "Airport Road, Viman Nagar, Pune", lat: 18.5679, lng: 73.9143, city: "Pune", verified: true, rating: 4.7, etaMinutes: 12, phone: "+919876501009", hours: "8 AM - 10 PM", mechanic: "Dinesh Patil", ownerName: "Dinesh Patil", vehicle: "AutoBuddy Service Van", services: ["Engine Repair", "AC Service", "General Service"], vehicleTypes: ["Car", "SUV"], image: "assets/images/garage-placeholder.svg", specialties: ["Engine Overhaul", "AC Gas Refill"], available: true },
  { id: "garage-010", name: "AutoBuddy Verified - Reliable Auto Care", address: "Anand Nagar, Sinhagad Road, Pune", lat: 18.4784, lng: 73.8257, city: "Pune", verified: true, rating: 4.6, etaMinutes: 16, phone: "+919876501010", hours: "9 AM - 9 PM", mechanic: "Santosh More", ownerName: "Santosh More", vehicle: "Service Van", services: ["Brake Repair", "Tyre Change", "Oil Change"], vehicleTypes: ["Car", "Bike"], image: "assets/images/garage-placeholder.svg", specialties: ["Brake Maintenance", "Quick Service"], available: true },
  { id: "garage-011", name: "AutoBuddy Verified - City Garage", address: "MG Road, Camp, Pune", lat: 18.5167, lng: 73.8783, city: "Pune", verified: true, rating: 4.7, etaMinutes: 11, phone: "+919876501011", hours: "24x7", mechanic: "Aditya Pawar", ownerName: "Aditya Pawar", vehicle: "Car & Bike Assist", services: ["General Service", "Battery Replacement", "Engine Diagnostics"], vehicleTypes: ["Car", "Bike"], image: "assets/images/garage-placeholder.svg", specialties: ["Quick Repairs", "City Assistance"], available: true },
  { id: "garage-012", name: "AutoBuddy Verified - Apex Motors", address: "Bibwewadi Main Road, Pune", lat: 18.4769, lng: 73.8723, city: "Pune", verified: true, rating: 4.6, etaMinutes: 13, phone: "+919876501012", hours: "8 AM - 9 PM", mechanic: "Suhas Patil", ownerName: "Suhas Patil", vehicle: "AutoBuddy Service Van", services: ["Brake Repair", "Clutch Repair", "Oil Change"], vehicleTypes: ["Car", "Bike"], image: "assets/images/garage-placeholder.svg", specialties: ["Brake Service", "Clutch Repair"], available: true },
  { id: "garage-013", name: "AutoBuddy Verified - RoadMaster Garage", address: "Satara Road, Swargate, Pune", lat: 18.5018, lng: 73.8636, city: "Pune", verified: true, rating: 4.8, etaMinutes: 10, phone: "+919876501013", hours: "24x7", mechanic: "Manoj Kale", ownerName: "Manoj Kale", vehicle: "Emergency Van", services: ["Engine Repair", "Battery", "Tyre Change"], vehicleTypes: ["Car", "Bike"], image: "assets/images/garage-placeholder.svg", specialties: ["Emergency Repairs", "Roadside Service"], available: true },
  { id: "garage-014", name: "AutoBuddy Verified - Dynamic Auto Hub", address: "Karve Nagar Main Road, Pune", lat: 18.4902, lng: 73.8072, city: "Pune", verified: true, rating: 4.7, etaMinutes: 12, phone: "+919876501014", hours: "9 AM - 9 PM", mechanic: "Ganesh Shinde", ownerName: "Ganesh Shinde", vehicle: "Compact Service Car", services: ["Diagnostics", "Oil Service", "Brake Repair"], vehicleTypes: ["Car"], image: "assets/images/garage-placeholder.svg", specialties: ["Computer Diagnostics", "Maintenance"], available: true },
  { id: "garage-015", name: "AutoBuddy Verified - FastTrack Garage", address: "Warje Highway, Pune", lat: 18.4868, lng: 73.7980, city: "Pune", verified: true, rating: 4.6, etaMinutes: 15, phone: "+919876501015", hours: "24x7", mechanic: "Abhishek More", ownerName: "Abhishek More", vehicle: "Highway Rescue Van", services: ["Roadside Assistance", "Battery Jump Start", "Tyre Repair"], vehicleTypes: ["Car", "SUV"], image: "assets/images/garage-placeholder.svg", specialties: ["Highway Rescue", "Emergency Support"], available: true },
  { id: "garage-016", name: "AutoBuddy Verified - Victory Motors", address: "Pashan Sus Road, Pune", lat: 18.5413, lng: 73.7925, city: "Pune", verified: true, rating: 4.8, etaMinutes: 11, phone: "+919876501016", hours: "8 AM - 10 PM", mechanic: "Kunal Jagtap", ownerName: "Kunal Jagtap", vehicle: "AutoBuddy Service Van", services: ["AC Repair", "Engine Repair", "Battery"], vehicleTypes: ["Car", "Bike"], image: "assets/images/garage-placeholder.svg", specialties: ["Engine Tuning", "AC Service"], available: true },
  { id: "garage-017", name: "AutoBuddy Verified - Smart Auto Garage", address: "Bavdhan Main Road, Pune", lat: 18.5152, lng: 73.7789, city: "Pune", verified: true, rating: 4.7, etaMinutes: 13, phone: "+919876501017", hours: "24x7", mechanic: "Sachin Chavan", ownerName: "Sachin Chavan", vehicle: "AutoBuddy Service Van", services: ["Oil Change", "Engine Repair", "Brake Repair"], vehicleTypes: ["Car", "Bike"], image: "assets/images/garage-placeholder.svg", specialties: ["Quick Service", "Preventive Maintenance"], available: true },
  { id: "garage-018", name: "AutoBuddy Verified - Precision Garage", address: "NIBM Road, Kondhwa, Pune", lat: 18.4655, lng: 73.9015, city: "Pune", verified: true, rating: 4.8, etaMinutes: 12, phone: "+919876501018", hours: "9 AM - 10 PM", mechanic: "Ajinkya Patil", ownerName: "Ajinkya Patil", vehicle: "Service SUV", services: ["Suspension", "Engine Diagnostics", "Wheel Alignment"], vehicleTypes: ["Car", "SUV"], image: "assets/images/garage-placeholder.svg", specialties: ["Suspension", "Steering"], available: true },
  { id: "garage-019", name: "AutoBuddy Verified - Highway Wheels", address: "Airport Road, Yerawada, Pune", lat: 18.5531, lng: 73.8856, city: "Pune", verified: true, rating: 4.6, etaMinutes: 14, phone: "+919876501019", hours: "24x7", mechanic: "Rakesh Shinde", ownerName: "Rakesh Shinde", vehicle: "Emergency Van", services: ["Tyre Replacement", "Battery", "Emergency Repair"], vehicleTypes: ["Car", "Bike"], image: "assets/images/garage-placeholder.svg", specialties: ["Airport Assistance", "Tyre Service"], available: true },
  { id: "garage-020", name: "AutoBuddy Verified - Reliable Motors", address: "Dhanori Road, Pune", lat: 18.5817, lng: 73.8992, city: "Pune", verified: true, rating: 4.5, etaMinutes: 16, phone: "+919876501020", hours: "9 AM - 8 PM", mechanic: "Deepak Bhosale", ownerName: "Deepak Bhosale", vehicle: "Service Van", services: ["General Service", "Oil Change", "Battery"], vehicleTypes: ["Car", "Bike"], image: "assets/images/garage-placeholder.svg", specialties: ["Routine Maintenance", "Affordable Service"], available: true },
  { id: "garage-021", name: "AutoBuddy Verified - Elite Garage Hub", address: "Mundhwa Road, Pune", lat: 18.5302, lng: 73.9335, city: "Pune", verified: true, rating: 4.9, etaMinutes: 8, phone: "+919876501021", hours: "24x7", mechanic: "Omkar Patil", ownerName: "Omkar Patil", vehicle: "Premium Service Van", services: ["Engine Repair", "Battery Replacement", "Wheel Alignment"], vehicleTypes: ["Car", "SUV"], image: "assets/images/garage-placeholder.svg", specialties: ["Premium Service", "Engine Diagnostics"], available: true },
  { id: "garage-022", name: "AutoBuddy Verified - AutoCare Express", address: "Narhe Road, Pune", lat: 18.4582, lng: 73.8218, city: "Pune", verified: true, rating: 4.7, etaMinutes: 15, phone: "+919876501022", hours: "24x7", mechanic: "Sanket Shinde", ownerName: "Sanket Shinde", vehicle: "Night Patrol Van", services: ["Roadside Assistance", "Tyre Repair", "Battery Jump Start"], vehicleTypes: ["Car", "Bike"], image: "assets/images/garage-placeholder.svg", specialties: ["Emergency Support", "Night Service"], available: true },
  { id: "garage-023", name: "AutoBuddy Verified - Platinum Auto Works", address: "Katraj Main Road, Pune", lat: 18.4516, lng: 73.8580, city: "Pune", verified: true, rating: 4.8, etaMinutes: 13, phone: "+919876501023", hours: "8 AM - 11 PM", mechanic: "Yash Deshmukh", ownerName: "Yash Deshmukh", vehicle: "AutoBuddy Service Van", services: ["Engine Repair", "Brake Repair", "Suspension"], vehicleTypes: ["Car", "SUV", "Bike"], image: "assets/images/garage-placeholder.svg", specialties: ["Complete Vehicle Care", "Suspension"], available: true },
  { id: "garage-024", name: "AutoBuddy Verified - Elite Car Clinic", address: "Balewadi High Street, Pune", lat: 18.5703, lng: 73.7752, city: "Pune", verified: true, rating: 4.9, etaMinutes: 9, phone: "+919876501024", hours: "24x7", mechanic: "Pranav Kulkarni", ownerName: "Pranav Kulkarni", vehicle: "Luxury Vehicle Specialist Van", services: ["Premium Service", "AC Repair", "Diagnostics"], vehicleTypes: ["Luxury Car", "SUV"], image: "assets/images/garage-placeholder.svg", specialties: ["Luxury Vehicles", "Computer Diagnostics"], available: true },
  { id: "garage-025", name: "AutoBuddy Verified - Guardian Auto Point", address: "Mumbai Pune Highway, Ravet", lat: 18.6510, lng: 73.7457, city: "Pune", verified: true, rating: 4.6, etaMinutes: 17, phone: "+919876501025", hours: "24x7", mechanic: "Akshay Jagtap", ownerName: "Akshay Jagtap", vehicle: "Highway Rescue Truck", services: ["Roadside Assistance", "Battery Replacement", "Tyre Replacement"], vehicleTypes: ["Car", "Bike", "Truck"], image: "assets/images/garage-placeholder.svg", specialties: ["Highway Rescue", "24x7 Emergency"], available: true },
  { id: "garage-026", name: "AutoBuddy Verified - SpeedTech Motors", address: "Chakan MIDC Road, Chakan, Pune", lat: 18.7567, lng: 73.8580, city: "Pune", verified: true, rating: 4.8, etaMinutes: 15, phone: "+919876501026", hours: "24x7", mechanic: "Mahesh Gaikwad", ownerName: "Mahesh Gaikwad", vehicle: "Industrial Area Support Van", services: ["Engine Diagnostics", "Transmission Repair", "Battery Service", "Brake Overhaul"], vehicleTypes: ["Car", "SUV", "Commercial Van"], image: "assets/images/garage-placeholder.svg", specialties: ["Commercial & Industrial Fleet", "Engine Diagnostics"], available: true },
  { id: "garage-027", name: "AutoBuddy Verified - Apex Highway Care", address: "Talegaon Toll Plaza, Talegaon Dabhade, Pune", lat: 18.7345, lng: 73.6821, city: "Pune", verified: true, rating: 4.9, etaMinutes: 10, phone: "+919876501027", hours: "24x7", mechanic: "Tanaji Shinde", ownerName: "Tanaji Shinde", vehicle: "Expressway Patrol Van", services: ["Emergency Roadside Help", "Towing Coordination", "Tyre Puncture & Replacement", "Battery Jumpstart"], vehicleTypes: ["Car", "SUV", "Bike", "Truck"], image: "assets/images/garage-placeholder.svg", specialties: ["Expressway Breakdown Support", "24x7 Emergency Rescue"], available: true },
  { id: "garage-028", name: "AutoBuddy Verified - Matrix Automotive", address: "Megapolis Circle, Hinjewadi Phase 3, Pune", lat: 18.5832, lng: 73.6974, city: "Pune", verified: true, rating: 4.8, etaMinutes: 12, phone: "+919876501028", hours: "8:00 AM - 10:00 PM", mechanic: "Devendra Rathod", ownerName: "Devendra Rathod", vehicle: "Tech Park Mobile Unit", services: ["General Inspection", "Synthetic Oil Change", "AC Disinfection & Gas Top-up", "Electronic Scanning"], vehicleTypes: ["Car", "SUV", "EV / Hybrid"], image: "assets/images/garage-placeholder.svg", specialties: ["EV & Hybrid Support", "Modern ECU Diagnostics"], available: true }
];
