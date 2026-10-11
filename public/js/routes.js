document.addEventListener('DOMContentLoaded', () => {
    fetchRoutes();
});

const DEFAULT_ROUTE_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80';

async function fetchRoutes() {
    const grid = document.getElementById('routesGrid');

    try {
        const [routesRes, imagesRes] = await Promise.all([
            fetch('/api/routes'),
            fetch('/api/images?type=route').catch(() => null)
        ]);

        if (!routesRes.ok) {
            throw new Error(`HTTP error! status: ${routesRes.status}`);
        }

        const routes = await routesRes.json();

        let routeImages = [];
        if (imagesRes && imagesRes.ok) {
            routeImages = await imagesRes.json().catch(() => []);
        }

        if (!routes || routes.length === 0) {
            grid.innerHTML = '<p>No routes found in Oracle database.</p>';
            return;
        }

        renderRoutes(grid, routes, routeImages);

    } catch (error) {
        console.error('Failed to fetch routes from Oracle:', error);
        grid.innerHTML = '<p style="color:var(--error-color);">Error loading routes. Please check backend connection.</p>';
    }
}

function renderRoutes(gridElement, routesList, routeImages = []) {
    gridElement.innerHTML = '';

    // Check if admin panel configured a default route image (resourceId === 0 or caption contains 'default')
    const adminDefaultRouteImg = routeImages.find(img =>
        (img.resourceType === 'route' || !img.resourceType) &&
        (Number(img.resourceId) === 0 || (img.caption && img.caption.toLowerCase().includes('default')))
    );
    const defaultRouteUrl = adminDefaultRouteImg?.imageUrl || DEFAULT_ROUTE_IMAGE;

    routesList.forEach(route => {
        const card = document.createElement('div');
        card.className = 'glass-panel route-card';

        const routeName = route.STARTLOCATION ? `${route.STARTLOCATION} to ${route.ENDLOCATION}` : 'Unknown Route';
        const routeId = route.ROUTEID || route.routeId || 'N/A';
        const isPopular = route.ISPOPULAR === 'Y';
        const status = isPopular ? '<i class="fa-solid fa-star"></i> Popular' : 'Active';
        const badgeClass = isPopular ? 'popular' : 'standard';
        const distance = route.DISTANCEKM ? `${route.DISTANCEKM} Km` : 'N/A';
        const duration = route.ESTIMATEDDURATION || '';

        // Match specific route image
        let imgUrl = defaultRouteUrl;
        const matchedImg = routeImages.find(img =>
            (img.resourceType === 'route' || !img.resourceType) &&
            (Number(img.resourceId) === Number(routeId) || String(img.resourceId) === String(routeId) ||
                Number(img.referenceId) === Number(routeId) || String(img.referenceId) === String(routeId))
        );
        if (matchedImg && matchedImg.imageUrl) {
            imgUrl = matchedImg.imageUrl;
        }
        if (imgUrl && imgUrl.startsWith('data:image')) {
            imgUrl = imgUrl.replace(/[\r\n\s]+/g, '');
        }

        card.innerHTML = `
            <div class="route-card-img-wrap">
                <img src="${imgUrl}" alt="${routeName}" class="route-card-img" onerror="this.src='${DEFAULT_ROUTE_IMAGE}'">
                <span class="route-card-badge ${badgeClass}">
                    ${status}
                </span>
            </div>
            <div class="route-card-header">
                <h3 class="route-card-title">${routeName}</h3>
            </div>
            <p class="route-card-id">Route ID: <strong>#${routeId}</strong></p>
            <p class="route-card-meta">
                <span><i class="fa-solid fa-location-dot"></i> ${distance}</span>
                ${duration ? `<span class="route-card-meta-dot">&bull;</span> <span><i class="fa-solid fa-clock"></i> ${duration}</span>` : ''}
            </p>
            <div class="route-card-footer">
                <a href="book.html?routeId=${routeId}" class="btn-primary route-card-book-btn">Book This Route &rarr;</a>
            </div>
        `;

        gridElement.appendChild(card);
    });
}
