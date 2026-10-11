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
        card.style.padding = '1.75rem';
        card.style.overflow = 'hidden';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

        const routeName = route.STARTLOCATION ? `${route.STARTLOCATION} to ${route.ENDLOCATION}` : 'Unknown Route';
        const routeId = route.ROUTEID || route.routeId || 'N/A';
        const isPopular = route.ISPOPULAR === 'Y';
        const status = isPopular ? '★ Popular' : 'Active';
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
            <div style="height: 180px; margin: -1.75rem -1.75rem 1.5rem -1.75rem; overflow: hidden; position: relative;">
                <img src="${imgUrl}" alt="${routeName}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.src='${DEFAULT_ROUTE_IMAGE}'">
                <span style="position: absolute; top: 12px; right: 12px; background: ${isPopular ? '#0284c7' : 'rgba(15, 23, 42, 0.75)'}; color: #ffffff; padding: 0.25rem 0.75rem; border-radius: 99px; font-size: 0.75rem; font-weight: 700; backdrop-filter: blur(8px); box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                    ${status}
                </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                <h3 style="font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0;">${routeName}</h3>
            </div>
            <p style="margin-bottom: 0.4rem; font-size: 0.85rem; color: #64748b;">Route ID: <strong style="color: #0f172a;">#${routeId}</strong></p>
            <p style="margin-bottom: 1.5rem; font-size: 0.9rem; color: #475569; display: flex; align-items: center; gap: 0.4rem;">
                <span>📍 ${distance}</span>
                ${duration ? `<span style="color: #94a3b8;">&bull;</span> <span>⏱️ ${duration}</span>` : ''}
            </p>
            <div style="margin-top: auto;">
                <a href="book.html?routeId=${routeId}" class="btn-primary" style="text-decoration: none; display: block; text-align: center; width: 100%; padding: 0.75rem 1rem; border-radius: 12px; font-weight: 700;">Book This Route &rarr;</a>
            </div>
        `;

        gridElement.appendChild(card);
    });
}
