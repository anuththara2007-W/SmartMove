// Run when the HTML document has finished loading
document.addEventListener("DOMContentLoaded", () => {
  // Stop if admin authentication setup fails
  if (!SmartMoveUtils.setupAdminAuth()) return;

  fetchFrequentRoutes(); // Fetch frequent routes
  fetchTopDrivers(); // Fetch top-rated drivers from MongoDB
  fetchRecentBookings(); // Fetch recent bookings from Oracle

  const calcBtn = document.getElementById("calcRevenueBtn");
  calcBtn.addEventListener("click", handleCalculateRevenue); // Calculate revenue on click
});

// Calculate and display total revenue
async function handleCalculateRevenue() {
  const display = document.getElementById("revenueDisplay");
  const btn = document.getElementById("calcRevenueBtn");

  try {
    btn.disabled = true; // Prevent repeated clicks
    btn.textContent = "Calculating..."; // Show loading text

    // Send date parameters to the revenue API
    const response = await fetch(
      "/api/reports/revenue?startDate=2020-01-01&endDate=2030-01-01",
    );
    if (!response.ok) {
      throw new Error("Failed to calculate revenue");
    }

    const result = await response.json(); // Convert response to JSON
    const revNumber = result.totalRevenue || 0; // Get total revenue

    // Animate the revenue counter using GSAP
    const obj = { val: 0 };
    gsap.to(obj, {
      val: revNumber,
      duration: 1.5,
      ease: "power2.out",
      onUpdate: function () {
        display.textContent = SmartMoveUtils.formatCurrency(obj.val); // Update displayed amount
      },
    });

    // Show a success notification
    SmartMoveUtils.showToast(
      "Successfully executed Oracle PL/SQL Function: CalculateTotalRevenue()",
      "success",
    );
  } catch (error) {
    console.error("Revenue Error:", error); // Log the error
    SmartMoveUtils.showToast("Oracle connection failed.", "error"); // Show an error notification
  } finally {
    btn.disabled = false; // Re-enable the button
    btn.textContent = "Execute CalculateTotalRevenue()"; // Restore button text
  }
}

// Fetch the most frequently used routes
async function fetchFrequentRoutes() {
  const tbody = document.getElementById("frequentRoutesTableBody");
  const container = document.getElementById("routesTableContainer");

  try {
    const response = await fetch("/api/reports/routes");
    if (!response.ok) {
      throw new Error("Failed to fetch frequent routes");
    }

    const routes = await response.json(); // Convert response to JSON

    // Display an empty state if no routes are returned
    if (!routes || routes.length === 0) {
      SmartMoveUtils.renderEmptyState(
        container,
        "No Data",
        "Oracle PL/SQL returned no frequent routes.",
      );
      return;
    }

    renderFrequentRoutesTable(tbody, routes); // Render the routes table
  } catch (error) {
    console.error("Frequent Routes Error:", error); // Log the error
    SmartMoveUtils.renderErrorState(
      container,
      "Failed to fetch routes from Oracle.",
    ); // Display an error state
  }
}

// --- Recent Bookings Functions ---

// Fetch recent bookings from the tickets API
async function fetchRecentBookings() {
  const tbody = document.getElementById("bookingsTableBody");

  try {
    const response = await fetch("/api/tickets");
    if (!response.ok) throw new Error("Failed to fetch tickets");

    const tickets = await response.json(); // Convert response to JSON

    // Display a message if there are no bookings
    if (!tickets || tickets.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center;">No recent bookings found.</td></tr>';
      return;
    }

    tbody.innerHTML = ""; // Clear existing table rows

    // Display the 10 most recent tickets
    tickets.slice(0, 10).forEach((t) => {
      const tr = document.createElement("tr");

      // Support different property-name formats
      const id = t.TICKETID || t.ticketId || t.TicketID;
      const passengerName =
        `${t.FIRSTNAME || t.firstName || ""} ${t.LASTNAME || t.lastName || ""}`.trim() ||
        "Guest Passenger";
      const contact = t.PHONE || t.phone || "077-1234567";
      const route = `${t.STARTLOCATION || t.startLocation || ""} &rarr; ${t.ENDLOCATION || t.endLocation || ""}`;
      const fare = t.FAREAMOUNT || t.fareAmount || t.FareAmount || 0;
      const status =
        t.TICKETSTATUS || t.ticketStatus || t.TicketStatus || "Booked";

      // Select a CSS class based on the ticket status
      const statusLower = status.toLowerCase();
      let statusBadgeClass = "booked";
      if (statusLower.includes("confirm") || statusLower.includes("complete"))
        statusBadgeClass = "confirmed";
      else if (statusLower.includes("cancel")) statusBadgeClass = "cancelled";

      // Create the ticket row with its details and status options
      tr.innerHTML = `
                <td><span class="route-id-tag">#${id}</span></td>
                <td><span style="font-weight: 600; color: #0f172a;">${passengerName}</span></td>
                <td><span style="color: #64748b; font-size: 0.85rem; font-family: monospace;">${contact}</span></td>
                <td><span style="font-weight: 500; color: #334155;">${route}</span></td>
                <td><strong style="color: #0f172a; font-weight: 700;">${SmartMoveUtils.formatCurrency(fare)}</strong></td>
                <td>
                    <span class="booking-status-badge ${statusBadgeClass}">
                        <span class="status-dot"></span>
                        ${status}
                    </span>
                </td>
                <td>
                    <div class="status-dropdown-wrapper">
                        <select class="status-select-dropdown" onchange="updateTicketStatus(${id}, this.value)">
                            <option value="" disabled selected>Update Status...</option>
                            <option value="Booked" ${status === "Booked" ? "disabled" : ""}>Booked</option>
                            <option value="Completed" ${status === "Completed" ? "disabled" : ""}>Complete</option>
                            <option value="Cancelled" ${status === "Cancelled" ? "disabled" : ""}>Cancel</option>
                        </select>
                    </div>
                </td>
            `;
      tbody.appendChild(tr); // Add the row to the table
    });
  } catch (error) {
    console.error("Bookings Error:", error); // Log the error
    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align: center; color: var(--error-color);">Error fetching bookings. Check Oracle connection.</td></tr>'; // Display an error message
  }
}

// Update a ticket's booking status
async function updateTicketStatus(ticketId, newStatus) {
  if (!newStatus) return; // Ignore empty selections

  try {
    // Send the new status to the API
    const response = await fetch(`/api/tickets/${ticketId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newStatus }), // Convert status to JSON
    });

    if (!response.ok) throw new Error("Failed to update status");

    SmartMoveUtils.showToast(
      `Ticket #${ticketId} status updated to ${newStatus}`,
      "success",
    ); // Show success notification
    fetchRecentBookings(); // Refresh the table
  } catch (error) {
    console.error("Update Status Error:", error); // Log the error
    SmartMoveUtils.showToast(
      "Failed to update ticket status via PL/SQL",
      "error",
    ); // Show error notification
  }
}

// Render frequent routes as table rows
function renderFrequentRoutesTable(tbody, routes) {
  tbody.innerHTML = ""; // Clear existing rows

  routes.forEach((route) => {
    const tr = document.createElement("tr");

    // Support both array-based and object-based route data
    const id = Array.isArray(route)
      ? route[0]
      : route.ROUTEID || route.routeId || route.RouteID || "N/A";
    const name = Array.isArray(route)
      ? route[1]
      : route.ROUTENAME || route.routeName || route.RouteName || "Route";
    const count = Array.isArray(route)
      ? (route[2] ?? 0)
      : (route.TRIPCOUNT ?? route.tripCount ?? route.TripCount ?? 0);

    // Create a row containing the route ID, name, and trip count
    tr.innerHTML = `
            <td><span class="route-id-tag">#${id}</span></td>
            <td><span style="font-weight: 600; color: #0f172a;">${name}</span></td>
            <td style="text-align: right;"><span class="trip-count-badge">${count}</span></td>
        `;

    tbody.appendChild(tr); // Add the row to the table
  });
}

// --- MongoDB Analytics Functions ---

// Fetch drivers with the highest average ratings
async function fetchTopDrivers() {
  const tbody = document.getElementById("topDriversTableBody");

  try {
    const res = await fetch("/api/vehicles/top-rated");
    if (!res.ok) throw new Error();

    const drivers = await res.json(); // Convert response to JSON

    // Display a message if no driver reviews exist
    if (drivers.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" style="text-align: center;">No reviews found in MongoDB.</td></tr>';
      return;
    }

    tbody.innerHTML = ""; // Clear existing rows
    drivers.forEach((d) => {
      const tr = document.createElement("tr");

      // Display driver ID, average rating, and review count
      tr.innerHTML = `
                <td><div class="driver-id-tag"><i class="fa-solid fa-id-badge" style="color: #64748b; font-size: 0.95rem;"></i> <span class="driver-id-badge">Driver #${d._id || "Unknown"}</span></div></td>
                <td><span class="driver-rating-pill">${(d.averageRating || 0).toFixed(1)} <i class="fa-solid fa-star"></i></span></td>
                <td><span class="driver-reviews-pill">${d.reviewCount} reviews</span></td>
            `;
      tbody.appendChild(tr); // Add the row to the table
    });
  } catch (e) {
    // Display an error message if the request fails
    tbody.innerHTML =
      '<tr><td colspan="3" style="text-align: center; color: red;">Failed to fetch MongoDB Top Drivers</td></tr>';
  }
}
