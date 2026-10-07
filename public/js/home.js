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

        announcements.forEach((ann) => {
            const card = document.createElement('div');
            card.className = 'glass-panel announcement-card';
            card.style.padding = '2rem';
            
            let colorIndicator = '#3b82f6';
            if (ann.type === 'warning') colorIndicator = '#f59e0b';
            else if (ann.type === 'alert') colorIndicator = '#ef4444';

            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${colorIndicator};"></div>
                    <h3 style="font-size: 1.1rem; font-weight: 600;">${ann.title}</h3>
                </div>
                <p>${ann.message}</p>
                <small style="color: var(--text-secondary); display: block; margin-top: 1rem;">
                    ${SmartMoveUtils.formatDate(ann.createdAt)}
                </small>
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
        const response = await fetch('/api/routes');
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
        
        const fallbackImage = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80';

        // Take top 5 featured routes
        routes.slice(0, 5).forEach((route) => {
            const card = document.createElement('div');
            card.className = 'route-mini-card route-card-anim';
            card.style.padding = '0';
            card.style.overflow = 'hidden';
            
            const routeName = route.STARTLOCATION ? `${route.STARTLOCATION} to ${route.ENDLOCATION}` : 'Unknown Route';
            const routeId = route.ROUTEID || route.routeId || 'N/A';
            
            const matchedImg = routeImages.find(img => img.resourceId == routeId);
            const imgUrl = matchedImg ? matchedImg.imageUrl : fallbackImage;

            card.innerHTML = `
                <img src="${imgUrl}" alt="${routeName}" style="width: 100%; height: 160px; object-fit: cover; display: block;" onerror="this.src='${fallbackImage}'">
                <div style="padding: 1.5rem;">
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">${routeName}</h3>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem;">Route ID: #${routeId} &bull; ${route.DISTANCEKM ? route.DISTANCEKM + ' km' : ''}</p>
                    <a href="system-portal/book.html?routeId=${routeId}" style="color: var(--primary-accent); font-weight: 600; text-decoration: none;">Book Ticket &rarr;</a>
                </div>
            `;
            
            container.appendChild(card);
        });

    } catch (error) {
        console.error('Routes Preview Error:', error);
        SmartMoveUtils.renderErrorState(container, 'Unable to connect to Oracle RDBMS.');
    }
}
