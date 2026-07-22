/**
 * Dashboard and service-catalog booking actions.
 *
 * This code was moved out of app.js so this file has one feature-focused
 * responsibility while preserving the original browser behavior.
 */

async function bookService(event) {
  const button = event?.currentTarget;
  const session = getAuthSession();
  setButtonLoading(button, true, "Book Mobile Service");
  setStatus("homeStatus", "Checking mobile service availability...", "neutral");
  showToast("Checking mobile service availability...", "warning");

  const userCoordinates = await requestCurrentLocationForAction("homeStatus", "mobile service tracking");

  const vanAvailable = Math.random() > 0.5;

  if (!vanAvailable) {
    setButtonLoading(button, false, "Book Mobile Service");
    setStatus("homeStatus", "No mobile van is currently available. Switching to nearby garages instead.", "warning");
    showToast("No van available right now. Showing nearby garages instead.", "warning");
    window.setTimeout(() => {
      window.location.href = "map.html";
    }, 650);
    return;
  }

  try {
    const payload = await createBooking({
      user: {
        name: session?.name || "Driver",
        mobile: session?.mobile || ""
      },
      service: "Mobile Repair",
      lat: userCoordinates?.lat ?? null,
      lng: userCoordinates?.lng ?? null,
      time: new Date()
    });

    setActiveBooking(payload.booking);
    setStatus("homeStatus", "Mobile service booked successfully. A service request has been created.", "success");
    showToast("Mobile service booked successfully.", "success");
    window.setTimeout(() => {
      openTrackingForBooking(payload.booking);
    }, 450);
  } catch (error) {
    if (shouldUseLocalBookingFallback(error)) {
      const localBooking = storeBookingLocally({
        id: `BK-${Date.now()}`,
        user: {
          name: session?.name || "Driver",
          mobile: session?.mobile || ""
        },
        service: "Mobile Repair",
        garage: "AutoBuddy Mobile Team",
        city: "",
        rating: 4.7,
        travelMinutes: 28,
        mechanic: "Rahul",
        vehicle: "AutoBuddy Service Van",
        phone: "+91 98765 00000",
        createdAt: new Date().toISOString(),
        garageLocation: {
          lat: null,
          lng: null
        },
        location: {
          lat: userCoordinates?.lat ?? null,
          lng: userCoordinates?.lng ?? null
        }
      });

      const enrichedBooking = enrichStoredBooking(localBooking);
      setActiveBooking(enrichedBooking);
      setStatus("homeStatus", "Mobile service booked successfully. Tracking is ready.", "success");
      showToast("Mobile service booked successfully.", "success");
      window.setTimeout(() => {
        openTrackingForBooking(enrichedBooking);
      }, 450);
      return;
    }

    setStatus("homeStatus", "We could not place the mobile service request. Please try again.", "error");
    showToast("Booking failed. Please try again.", "error");
  } finally {
    setButtonLoading(button, false, "Book Mobile Service");
  }
}

async function bookPricedService(serviceName, price, button) {
  const session = getAuthSession();

  setButtonLoading(button, true, "Book Now");
  setStatus("servicesStatus", `Booking ${serviceName} for you...`, "neutral");

  const userCoordinates = await requestCurrentLocationForAction("servicesStatus", `${serviceName} tracking`);

  try {
    const payload = await createBooking({
      user: {
        name: session?.name || "Driver",
        mobile: session?.mobile || ""
      },
      service: serviceName,
      price,
      lat: userCoordinates?.lat ?? null,
      lng: userCoordinates?.lng ?? null,
      time: new Date()
    });

    const booking = payload.booking || payload;
    setActiveBooking(booking);
    setStatus("servicesStatus", `${serviceName} booked successfully for ₹${price}.`, "success");
    showToast(`${serviceName} booked for ₹${price}.`, "success");
    window.setTimeout(() => {
      openTrackingForBooking(booking);
    }, 450);
  } catch (error) {
    if (shouldUseLocalBookingFallback(error)) {
      const localBooking = storeBookingLocally({
        id: `SRV-${Date.now()}`,
        user: {
          name: session?.name || "Driver",
          mobile: session?.mobile || ""
        },
        service: serviceName,
        price,
        city: session?.district || "Nearby",
        rating: 4.8,
        travelMinutes: 24,
        mechanic: "AutoBuddy Service Expert",
        vehicle: "Garage On Wheels Van",
        phone: "+91 98765 43210",
        createdAt: new Date().toISOString(),
        garageLocation: userCoordinates
          ? {
              lat: userCoordinates.lat + 0.028,
              lng: userCoordinates.lng - 0.024
            }
          : {
              lat: 18.5485,
              lng: 73.8548
            },
        location: {
          lat: userCoordinates?.lat ?? 18.5204,
          lng: userCoordinates?.lng ?? 73.8567
        }
      });

      const enrichedBooking = enrichStoredBooking(localBooking);
      setActiveBooking(enrichedBooking);
      setStatus("servicesStatus", `${serviceName} booked successfully for ₹${price}.`, "success");
      showToast(`${serviceName} booked for ₹${price}.`, "success");
      window.setTimeout(() => {
        openTrackingForBooking(enrichedBooking);
      }, 450);
      return;
    }

    setStatus("servicesStatus", `Could not book ${serviceName}. Please try again.`, "error");
    showToast(`Could not book ${serviceName}.`, "error");
  } finally {
    setButtonLoading(button, false, "Book Now");
  }
}

function emergency(event) {
  const button = event?.currentTarget;
  setButtonLoading(button, true, "Emergency Help");
  setStatus("homeStatus", "Emergency mode activated. Prioritizing nearby help now.", "warning");
  showToast("Emergency mode activated.", "warning");
  getLocation({ currentTarget: button });
}

function goToMap(event) {
  const button = event?.currentTarget;
  setButtonLoading(button, true, "View on Map");
  showToast("Opening the live map...", "success");
  getLocation({ currentTarget: button });
}

