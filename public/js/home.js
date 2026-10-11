document.addEventListener('DOMContentLoaded', () => {

    // Initial Hero GSAP Animations

    // ScrollTrigger Animations
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('.gsap-section').forEach(section => {
    });

    fetchAnnouncements();
    fetchRoutesPreview();
});

async function fetchAnnouncements() {
    const grid = document.getElementById('announcementsGrid');
    
    try {
        const response = await fetch('/api/announcements');
        if (!response.ok) throw new Error('API Error');
        
        const announcements = await response.json();
        
        if (!announcements || announcements.length === 0) {
            SmartMoveUtils.renderEmptyState(grid, 'No active announcements', 'Everything is running smoothly on our network.');
            return;
        }

        grid.innerHTML = '';

        // Only display top 6 announcements on the homepage
        const displayAnnouncements = announcements.slice(0, 6);
        displayAnnouncements.forEach((ann) => {
            const card = document.createElement('div');
            card.className = 'home-announcement-card';

            let badgeHtml = '';
            let severityClass = 'info';
            if (ann.type === 'warning') {
                severityClass = 'warning';
                badgeHtml = `<span class="ann-badge warning">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Caution
                </span>`;
            } else if (ann.type === 'alert') {
                severityClass = 'danger';
                badgeHtml = `<span class="ann-badge danger">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    Urgent Alert
                </span>`;
            } else {
                severityClass = 'info';
                badgeHtml = `<span class="ann-badge info">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    Notice
                </span>`;
            }

            const dateText = ann.createdAt ? SmartMoveUtils.formatDate(ann.createdAt) : 'Recently';

            card.innerHTML = `
                <div class="ann-top-bar ${severityClass}"></div>
                <div>
                    <div class="ann-header-meta">
                        ${badgeHtml}
                        <span class="ann-date">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            ${dateText}
                        </span>
                    </div>
                    <h3 class="ann-title">${ann.title}</h3>
                    <p class="ann-message">${ann.message}</p>
                </div>
            `;

            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Announcements Error:', error);
        SmartMoveUtils.renderErrorState(grid, 'Unable to connect to MongoDB cluster.');
    }
}

async function fetchRoutesPreview() {
    const container = document.getElementById('routesPreviewContainer');
    
    try {
        const response = await fetch('/api/routes?popular=true');
        if (!response.ok) throw new Error('API Error');
        
        const routes = await response.json();
        
        // Fetch MongoDB images for routes
        let routeImages = [];
        try {
            const imgRes = await fetch('/api/images?type=route');
            if (imgRes.ok) routeImages = await imgRes.json();
        } catch (e) {
            console.error('Failed to fetch MongoDB route images');
        }
        
        if (!routes || routes.length === 0) {
            SmartMoveUtils.renderEmptyState(container, 'No routes available', 'Please add routes from the Admin Panel to display them here.');
            return;
        }

        container.innerHTML = '';
        
        const fallbackImage = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80';

        // Check if admin panel configured a default route image (resourceId === 0 or caption contains 'default')
        const adminDefaultRouteImg = routeImages.find(img => 
            (img.resourceType === 'route' || !img.resourceType) && 
            (Number(img.resourceId) === 0 || (img.caption && img.caption.toLowerCase().includes('default')))
        );
        const defaultRouteUrl = adminDefaultRouteImg?.imageUrl || fallbackImage;

        // Take top 5 featured routes
        routes.slice(0, 5).forEach((route) => {
            const card = document.createElement('div');
            card.className = 'route-mini-card route-card-anim';
            card.style.padding = '0';
            card.style.overflow = 'hidden';
            
            const routeName = route.STARTLOCATION ? `${route.STARTLOCATION} to ${route.ENDLOCATION}` : 'Unknown Route';
            const routeId = route.ROUTEID || route.routeId || 'N/A';
            
            // Match specific route image from admin panel (resourceId === routeId) or fallback to admin/system default
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
                <img src="${imgUrl}" alt="${routeName}" style="width: 100%; height: 160px; object-fit: cover; display: block;" onerror="this.src='${fallbackImage}'">
                <div style="padding: 1.5rem;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">${routeName}</h3>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem;">Route ID: #${routeId} &bull; ${route.DISTANCEKM ? route.DISTANCEKM + ' km' : ''}</p>
                    <a href="book.html?routeId=${routeId}" style="display: block; text-align: center; text-decoration: none; padding: 0.75rem 1rem; border-radius: 12px; font-weight: 700; font-size: 0.9rem; background: var(--primary-accent); color: white; transition: all 0.2s ease;">Book This Route &rarr;</a>
                </div>
            `;
            
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Routes Preview Error:', error);
        SmartMoveUtils.renderErrorState(container, 'Unable to connect to Oracle RDBMS.');
    }
}
