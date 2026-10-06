document.addEventListener('DOMContentLoaded', () => {

    fetchRoutes();
});


async function fetchRoutes() {
    const grid = document.getElementById('routesGrid');
    
    try {
        const response = await fetch('/api/routes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const routes = await response.json();
        
        if (!routes || routes.length === 0) {
            grid.innerHTML = '<p>No routes found in Oracle database.</p>';
            return;
        }

        renderRoutes(grid, routes);

    } catch (error) {
        console.error('Failed to fetch routes from Oracle:', error);
        grid.innerHTML = '<p style="color:var(--error-color);">Error loading routes. Please check backend connection.</p>';
    }
}

function renderRoutes(gridElement, routesList) {
    gridElement.innerHTML = '';
    
    routesList.forEach(route => {
        const card = document.createElement('div');
        card.className = 'glass-panel route-card';
        card.style.padding = '2rem';
        card.style.overflow = 'hidden';
        
        const routeName = route.STARTLOCATION ? `${route.STARTLOCATION} to ${route.ENDLOCATION}` : 'Unknown Route';
        const routeId = route.ROUTEID || 'N/A';
        const status = 'Active';
        const distance = route.DISTANCEKM ? `${route.DISTANCEKM} Km` : 'N/A';
        
        card.innerHTML = `
            <div style="height: 150px; margin: -2rem -2rem 1.5rem -2rem; background: var(--card-bg);"></div>
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <h3 style="font-size: 1.25rem;">${routeName}</h3>
                <span style="background: #e0f2fe; color: #0284c7; padding: 0.25rem 0.75rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600;">
                    ${status}
                </span>
            </div>
            <p style="margin-bottom: 0.5rem; font-size: 0.9rem;">Route ID: <strong>${routeId}</strong></p>
            <p style="margin-bottom: 2rem; font-size: 0.9rem; color: var(--text-secondary);">Distance: ${distance}</p>
            <div>
                <a href="system-portal/book.html?routeId=${routeId}" class="btn-primary" style="text-decoration: none; display: inline-block;">Book This Route</a>
            </div>
        `;
        
        gridElement.appendChild(card);
    });
}
