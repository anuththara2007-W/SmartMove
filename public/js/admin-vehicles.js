document.addEventListener('DOMContentLoaded', () => {
    if (!SmartMoveUtils.setupAdminAuth()) return;

    fetchFleetData();
});

async function fetchFleetData() {
    const grid = document.getElementById('fleetGrid');
    
    try {
        const response = await fetch('/api/vehicles/documents');
        if (!response.ok) {
            throw new Error('Failed to fetch fleet documents');
        }
        
        const vehicles = await response.json();
        
        if (!vehicles || vehicles.length === 0) {
            SmartMoveUtils.renderEmptyState(grid, 'No Fleet Data', 'MongoDB collection is empty.');
            return;
        }

        renderFleet(grid, vehicles);

    } catch (error) {
        console.error('Admin Error:', error);
        SmartMoveUtils.renderErrorState(grid, 'MongoDB connection failed.');
    }
}

function renderFleet(gridElement, vehiclesList) {
    gridElement.innerHTML = '';
    
    vehiclesList.forEach(vehicle => {
        const card = document.createElement('div');
        card.className = 'fleet-card';
        
        const imageUrl = (vehicle.imageUrls && vehicle.imageUrls.length > 0) 
            ? vehicle.imageUrls[0] 
            : 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&q=80'; // high-end fallback
            
        const docsCount = vehicle.pdfDocumentPaths ? vehicle.pdfDocumentPaths.length : 0;
        
        card.innerHTML = `
            <img src="${imageUrl}" alt="Vehicle ${vehicle.vehicleID}" class="fleet-img" onerror="this.src='https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&q=80'">
            <div class="fleet-info">
                <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">Vehicle #${vehicle.vehicleID}</h3>
                <p style="margin-bottom: 1rem; font-size: 0.9rem;">
                    Status: <span style="color: #16a34a; font-weight: 600;">Active</span>
                </p>
                <div style="background: #f1f5f9; padding: 0.75rem; border-radius: 8px;">
                    <strong style="font-size: 0.85rem;">Stored Documents:</strong>
                    <span style="float: right; background: #e2e8f0; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">
                        ${docsCount} PDFs
                    </span>
                </div>
            </div>
        `;
        
        gridElement.appendChild(card);
    });
}
