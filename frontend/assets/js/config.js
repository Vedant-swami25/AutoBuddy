/**
 * Shared application constants and built-in garage fallback data.
 *
 * This code was moved out of app.js so this file has one feature-focused
 * responsibility while preserving the original browser behavior.
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
const DEFAULT_DEMO_LOCATION = {
  lat: 18.5204,
  lng: 73.8567,
  label: "Pune"
};
const GARAGE_FALLBACKS = [
  { id: "GAR-101", name: "Bavdhan Auto Care", address: "Shop 7, NDA Pashan Road, Bavdhan, Pune", lat: 18.5119, lng: 73.7787, city: "Pune", verified: true, rating: 4.8, etaMinutes: 18, phone: "+91 98220 11001", hours: "8:00 AM - 9:00 PM", services: ["General Service", "Diagnostics", "Brake Repair", "Battery Support"], vehicleTypes: ["Car", "SUV", "Bike"], image: "assets/images/garage-placeholder.svg", mechanic: "Rakesh Patil", vehicle: "AutoBuddy Service Van" },
  { id: "GAR-102", name: "Kothrud Motor Works", address: "Paud Road, near MIT College, Kothrud, Pune", lat: 18.5074, lng: 73.8077, city: "Pune", verified: true, rating: 4.7, etaMinutes: 14, phone: "+91 98220 11002", hours: "8:30 AM - 8:30 PM", services: ["Oil Change", "AC Service", "Suspension", "Wheel Alignment"], vehicleTypes: ["Car", "SUV"], image: "assets/images/garage-placeholder.svg", mechanic: "Amit Kulkarni", vehicle: "Quick Response Bike" },
  { id: "GAR-103", name: "Shivajinagar Garage Hub", address: "Jangali Maharaj Road, Shivajinagar, Pune", lat: 18.5308, lng: 73.8475, city: "Pune", verified: true, rating: 4.6, etaMinutes: 12, phone: "+91 98220 11003", hours: "9:00 AM - 9:00 PM", services: ["Roadside Assistance", "Diagnostics", "Puncture Repair", "Battery Jumpstart"], vehicleTypes: ["Car", "Bike", "Scooter"], image: "assets/images/garage-placeholder.svg", mechanic: "Sagar Jadhav", vehicle: "Compact Repair Van" },
  { id: "GAR-104", name: "Hadapsar Auto Clinic", address: "Magarpatta Road, Hadapsar, Pune", lat: 18.5089, lng: 73.9259, city: "Pune", verified: true, rating: 4.5, etaMinutes: 20, phone: "+91 98220 11004", hours: "8:00 AM - 10:00 PM", services: ["Engine Repair", "Clutch Work", "Brake Service", "Emergency Visit"], vehicleTypes: ["Car", "SUV", "Commercial Van"], image: "assets/images/garage-placeholder.svg", mechanic: "Nitin Shinde", vehicle: "Roadside Assist Van" },
  { id: "GAR-105", name: "Viman Nagar Pitstop", address: "Sakore Nagar, Viman Nagar, Pune", lat: 18.5679, lng: 73.9143, city: "Pune", verified: true, rating: 4.9, etaMinutes: 16, phone: "+91 98220 11005", hours: "8:00 AM - 9:30 PM", services: ["Premium Detailing", "AC Gas Top-up", "OBD Scanning", "Tyre Service"], vehicleTypes: ["Car", "SUV", "Premium Car"], image: "assets/images/garage-placeholder.svg", mechanic: "Vikram More", vehicle: "Premium Service Van" },
  { id: "GAR-106", name: "Baner Road Auto Solutions", address: "Baner Road, near Balewadi High Street, Pune", lat: 18.559, lng: 73.7868, city: "Pune", verified: true, rating: 4.7, etaMinutes: 22, phone: "+91 98220 11006", hours: "9:00 AM - 8:30 PM", services: ["General Service", "Dent Removal", "Paint Touch-up", "Inspection"], vehicleTypes: ["Car", "SUV"], image: "assets/images/garage-placeholder.svg", mechanic: "Dhanesh Pawar", vehicle: "Emergency Support Jeep" },
  { id: "GAR-107", name: "Wakad Express Garage", address: "Datta Mandir Road, Wakad, Pune", lat: 18.5977, lng: 73.7707, city: "Pune", verified: true, rating: 4.4, etaMinutes: 26, phone: "+91 98220 11007", hours: "8:30 AM - 9:00 PM", services: ["Breakdown Assistance", "Battery Check", "Puncture Repair", "Minor Engine Repair"], vehicleTypes: ["Car", "SUV", "Bike"], image: "assets/images/garage-placeholder.svg", mechanic: "Kiran Sathe", vehicle: "Tyre Service Van" },
  { id: "GAR-108", name: "Kharadi Service Point", address: "EON Free Zone Road, Kharadi, Pune", lat: 18.5515, lng: 73.9347, city: "Pune", verified: true, rating: 4.6, etaMinutes: 21, phone: "+91 98220 11008", hours: "8:00 AM - 10:00 PM", services: ["Diagnostics", "Brake Check", "Engine Health Check", "Air Pressure Check"], vehicleTypes: ["Car", "SUV", "Bike", "Scooter"], image: "assets/images/garage-placeholder.svg", mechanic: "Yash Deshmukh", vehicle: "Urban Repair Van" },
  { id: "GAR-109", name: "Sinhagad Road Motors", address: "Anand Nagar, Sinhagad Road, Pune", lat: 18.4784, lng: 73.8257, city: "Pune", verified: true, rating: 4.5, etaMinutes: 19, phone: "+91 98220 11009", hours: "9:00 AM - 8:00 PM", services: ["General Service", "Tire Change", "Oil Change", "Battery Jumpstart"], vehicleTypes: ["Car", "Bike", "Scooter"], image: "assets/images/garage-placeholder.svg", mechanic: "Sameer Bhosale", vehicle: "Long Route Support Van" },
  { id: "GAR-110", name: "Pimpri Auto Service Centre", address: "Old Mumbai Pune Highway, Pimpri Colony, Pune", lat: 18.6298, lng: 73.7997, city: "Pune", verified: true, rating: 4.6, etaMinutes: 28, phone: "+91 98220 11010", hours: "8:00 AM - 9:00 PM", services: ["Commercial Vehicle Service", "Truck Inspection", "Clutch Work", "Suspension"], vehicleTypes: ["Car", "SUV", "Commercial Van", "Truck"], image: "assets/images/garage-placeholder.svg", mechanic: "Pratik Chavan", vehicle: "Heavy Support Van" },
  { id: "GAR-111", name: "Aundh Wheel & Wrench", address: "DP Road, Aundh, Pune", lat: 18.5602, lng: 73.8079, city: "Pune", verified: true, rating: 4.7, etaMinutes: 17, phone: "+91 98220 11011", hours: "8:30 AM - 8:30 PM", services: ["Wheel Alignment", "Tyre Service", "Diagnostics", "Brake Repair"], vehicleTypes: ["Car", "SUV"], image: "assets/images/garage-placeholder.svg", mechanic: "Harsh Joshi", vehicle: "Rapid Assist Van" },
  { id: "GAR-112", name: "Camp Auto Rescue", address: "MG Road, Camp, Pune", lat: 18.5165, lng: 73.8792, city: "Pune", verified: true, rating: 4.8, etaMinutes: 13, phone: "+91 98220 11012", hours: "24 Hours", services: ["Emergency Roadside Help", "Battery Jumpstart", "Puncture Repair", "Towing Coordination"], vehicleTypes: ["Car", "Bike", "Scooter", "SUV"], image: "assets/images/garage-placeholder.svg", mechanic: "Manoj Shaikh", vehicle: "24x7 Rescue Van" }
];

