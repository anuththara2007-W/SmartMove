document.addEventListener("DOMContentLoaded", () => {
  // Run when the HTML document is parsed
  // Initial Hero GSAP Animations
  // ScrollTrigger Animations
  gsap.registerPlugin(ScrollTrigger); // Register the GSAP scroll animation plugin

  gsap.utils.toArray(".gsap-section").forEach((section) => {
    // Loop through all GSAP sections
  }); // End the empty section loop

  fetchAnnouncements(); // Fetch homepage announcements
  fetchRoutesPreview(); // Fetch popular route previews
});

async function fetchAnnouncements() {
  // Fetch and display announcements asynchronously
  const grid = document.getElementById("announcementsGrid"); // Get the announcements container

  try {
    // Handle request and processing errors
    const response = await fetch("/api/announcements"); // Request announcements from the API
    if (!response.ok) throw new Error("API Error"); // Throw an error for unsuccessful HTTP responses

    const announcements = await response.json(); // Convert the response body to JSON

    if (!announcements || announcements.length === 0) {
      // Check whether announcements are empty
      SmartMoveUtils.renderEmptyState(
        grid,
        "No active announcements",
        "Everything is running smoothly on our network.",
      ); // Display an empty-state message
      return; // Stop when no announcements exist
    }

    grid.innerHTML = ""; // Clear existing announcement cards

    const displayAnnouncements = announcements.slice(0, 6); // Select the first six announcements
    displayAnnouncements.forEach((ann) => {
      // Loop through each announcement
      const card = document.createElement("div"); // Create an announcement card
      card.className = "home-announcement-card"; // Assign the card's CSS class

      let badgeHtml = ""; // Initialize the badge HTML
      let severityClass = "info"; // Set the default severity class

      if (ann.type === "warning") {
        // Check whether the announcement is a warning
        severityClass = "warning"; // Set the warning style
        badgeHtml = `<span class="ann-badge warning">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    Caution
                </span>`; // Create the warning badge
      } else if (ann.type === "alert") {
        // Check whether the announcement is urgent
        severityClass = "danger"; // Set the danger style
        badgeHtml = `<span class="ann-badge danger">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    Urgent Alert
                </span>`; // Create the urgent alert badge
      } else {
        // Handle all other announcement types
        severityClass = "info"; // Set the informational style
        badgeHtml = `<span class="ann-badge info">
                    <i class="fa-solid fa-circle-info"></i>
                    Notice
                </span>`; // Create the notice badge
      }

      const dateText = ann.createdAt
        ? SmartMoveUtils.formatDate(ann.createdAt)
        : "Recently"; // Format the date or use a fallback

      card.innerHTML = `
                <div class="ann-top-bar ${severityClass}"></div>
                <div>
                    <div class="ann-header-meta">
                        ${badgeHtml}
                        <span class="ann-date">
                            <i class="fa-regular fa-clock"></i>
                            ${dateText}
                        </span>
                    </div>
                    <h3 class="ann-title">${ann.title}</h3>
                    <p class="ann-message">${ann.message}</p>
                </div>
            `; // Build the announcement card HTML

      grid.appendChild(card); // Add the card to the announcements grid
    }); // End the announcement loop
  } catch (error) {
    // Handle announcement request errors
    console.error("Announcements Error:", error); // Log the error in the console
    SmartMoveUtils.renderErrorState(
      grid,
      "Unable to connect to MongoDB cluster.",
    ); // Display an error state
  }
}

async function fetchRoutesPreview() {
  // Fetch and display popular routes asynchronously
  const container = document.getElementById("routesPreviewContainer"); // Get the route preview container

  try {
    // Handle route request and processing errors
    const response = await fetch("/api/routes?popular=true"); // Request popular routes
    if (!response.ok) throw new Error("API Error"); // Throw an error for unsuccessful HTTP responses

    const routes = await response.json(); // Convert the route response to JSON

    let routeImages = []; // Initialize the route images array
    try {
      // Handle image fetching separately
      const imgRes = await fetch("/api/images?type=route"); // Request route images
      if (imgRes.ok) routeImages = await imgRes.json(); // Store images if the request succeeds
    } catch (e) {
      // Handle image request failures
      console.error("Failed to fetch MongoDB route images"); // Log the image-fetching error
    }

    if (!routes || routes.length === 0) {
      // Check whether routes are empty
      SmartMoveUtils.renderEmptyState(
        container,
        "No routes available",
        "Please add routes from the Admin Panel to display them here.",
      ); // Display an empty-state message
      return; // Stop when no routes exist
    }

    container.innerHTML = ""; // Clear existing route cards

    const fallbackImage =
      "https://www.yanatourslanka.com/_next/image?url=%2Fhome%2Fcar2.png&w=3840&q=75"; // Define the fallback image URL

    const adminDefaultRouteImg = routeImages.find(
      (
        img, // Search for the default route image
      ) =>
        (img.resourceType === "route" || !img.resourceType) && // Accept route images or records without a resource type
        (Number(img.resourceId) === 0 ||
          (img.caption && img.caption.toLowerCase().includes("default"))), // Match a default image by ID or caption
    );

    const defaultRouteUrl = adminDefaultRouteImg?.imageUrl || fallbackImage; // Use the admin image or fallback image

    routes.slice(0, 5).forEach((route) => {
      // Loop through the first five routes
      const card = document.createElement("div"); // Create a route card
      card.className = "route-mini-card route-card-anim"; // Assign styling and animation classes
      card.style.padding = "0"; // Remove the card's padding
      card.style.overflow = "hidden"; // Hide overflowing content

      const routeName = route.STARTLOCATION
        ? `${route.STARTLOCATION} to ${route.ENDLOCATION}`
        : "Unknown Route"; // Build the route name
      const routeId = route.ROUTEID || route.routeId || "N/A"; // Get the route ID or use a fallback

      let imgUrl = defaultRouteUrl; // Start with the default route image
      const matchedImg = routeImages.find(
        (
          img, // Search for an image matching this route
        ) =>
          (img.resourceType === "route" || !img.resourceType) && // Accept route images or records without a resource type
          (Number(img.resourceId) === Number(routeId) ||
            String(img.resourceId) === String(routeId) ||
            Number(img.referenceId) === Number(routeId) ||
            String(img.referenceId) === String(routeId)), // Match the resource or reference ID
      );

      if (matchedImg && matchedImg.imageUrl) {
        // Check whether a matching image exists
        imgUrl = matchedImg.imageUrl; // Use the matching route image
      }

      if (imgUrl && imgUrl.startsWith("data:image")) {
        // Check whether the image is a data URL
        imgUrl = imgUrl.replace(/[\r\n\s]+/g, ""); // Remove whitespace from the data URL
      }

      card.innerHTML = `
                <img src="${imgUrl}" alt="${routeName}" class="route-mini-card-img" onerror="this.src='${fallbackImage}'">
                <div class="route-mini-card-body">
                    <h3 class="route-mini-card-title">${routeName}</h3>
                    <p class="route-mini-card-meta">Route ID: #${routeId} &bull; ${route.DISTANCEKM ? route.DISTANCEKM + " km" : ""}</p>
                    <a href="book.html?routeId=${routeId}" class="route-mini-card-btn">Book This Route &rarr;</a>
                </div>
            `; // Build the route card HTML

      container.appendChild(card); // Add the route card to the container
    }); // End the route loop
  } catch (error) {
    // Handle route request errors
    console.error("Routes Preview Error:", error); // Log the error in the console
    SmartMoveUtils.renderErrorState(
      container,
      "Unable to connect to Oracle RDBMS.",
    ); // Display an error state
  }
}
