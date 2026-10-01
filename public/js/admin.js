/**
 * File: admin.js
 * Purpose: Handles client-side logic for displaying fleet data on the admin HTML page.
 * What it has: Functions to fetch fleet documents from the server and render them as cards.
 * Why it exists: To make the admin page interactive and dynamically display database information.
 * Technologies used: Vanilla JavaScript, Fetch API, HTML DOM manipulation.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Start fetching data as soon as the page loads
    loadVehicleFleetData();
});

/**
 * Fetches vehicle data from the backend API and updates the UI.
 */
async function loadVehicleFleetData() {
    const fleetGridContainer = document.getElementById('fleetGrid');
    
    try {
        const serverResponse = await fetch('/api/vehicles/documents');
        
        if (!serverResponse.ok) {
            throw new Error('Failed to fetch fleet documents from server');
        }
        
        const vehicleList = await serverResponse.json();
        
        if (!vehicleList || vehicleList.length === 0) {
            fleetGridContainer.innerHTML = '<p>No fleet data found in the database.</p>';
            return;
        }

        // Draw the vehicles on the screen
        displayVehiclesInGrid(fleetGridContainer, vehicleList);

    } catch (error) {
        console.error('Admin Error:', error);
        fleetGridContainer.innerHTML = '<p style="color:#ef4444;">Error occurred while fetching fleet documents. Please try again later.</p>';
    } // FIXED: This closing brace was missing in the original code!
}

/**
 * Creates HTML elements for each vehicle and adds them to the grid.
 * @param {HTMLElement} gridElement - The container element.
 * @param {Array} vehiclesList - The array of vehicle objects.
 */
function displayVehiclesInGrid(gridElement, vehiclesList) {
    // Clear any existing content
    gridElement.innerHTML = '';
    
    vehiclesList.forEach(vehicle => {
        const vehicleCard = document.createElement('div');
        vehicleCard.className = 'fleet-card';
        
        // Determine the image to show, or use a placeholder if none exists
        const displayImageUrl = (vehicle.imageUrls && vehicle.imageUrls.length > 0) 
            ? vehicle.imageUrls[0] 
            : 'https://via.placeholder.com/500x300?text=No+Image+Available';
            
        // Count how many PDF documents are attached to this vehicle
        const documentCount = vehicle.pdfDocumentPaths ? vehicle.pdfDocumentPaths.length : 0;
        
        // Construct the HTML for the card
        vehicleCard.innerHTML = `
            <img src="${displayImageUrl}" alt="Vehicle ${vehicle.vehicleID}" class="fleet-img">
            <div class="fleet-info">
                <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">Vehicle #${vehicle.vehicleID}</h3>
                <p style="margin-bottom: 1rem; font-size: 0.9rem;">
                    Status: <span style="color: #16a34a; font-weight: 600;">Active</span>
                </p>
                <div style="background: #f1f5f9; padding: 0.75rem; border-radius: 8px;">
                    <strong style="font-size: 0.85rem;">Stored Documents:</strong>
                    <span style="float: right; background: #e2e8f0; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">
                        ${documentCount} PDFs
                    </span>
                </div>
            </div>
        `;
        
        // Add the finished card to the grid
        gridElement.appendChild(vehicleCard);
    });
}
