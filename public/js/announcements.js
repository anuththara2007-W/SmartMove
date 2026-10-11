document.addEventListener('DOMContentLoaded', () => {
    initAnnouncementsPage();
});

let announcementsData = [];
let currentFilter = 'all';
let searchQuery = '';

async function initAnnouncementsPage() {
    const grid = document.getElementById('allAnnouncementsGrid');
    const searchInput = document.getElementById('searchInput');
    const filterChips = document.querySelectorAll('.filter-chip');

    // Event listener for search
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderFilteredAnnouncements();
        });
    }

    // Event listeners for filter chips
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.getAttribute('data-filter');
            renderFilteredAnnouncements();
        });
    });

    try {
        const response = await fetch('/api/announcements');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        announcementsData = await response.json();

        if (!announcementsData || announcementsData.length === 0) {
            SmartMoveUtils.renderEmptyState(grid, 'No active announcements', 'Everything is running smoothly on our network.');
            return;
        }

        renderFilteredAnnouncements();

    } catch (error) {
        console.error('Failed to load announcements:', error);
        if (grid) {
            SmartMoveUtils.renderErrorState(grid, 'Unable to connect to MongoDB cluster.');
        }
    }
}

function renderFilteredAnnouncements() {
    const grid = document.getElementById('allAnnouncementsGrid');
    if (!grid) return;

    let filtered = announcementsData;

    // Filter by type
    if (currentFilter !== 'all') {
        filtered = filtered.filter(a => a.type === currentFilter);
    }

    // Filter by search query
    if (searchQuery) {
        filtered = filtered.filter(a => 
            (a.title && a.title.toLowerCase().includes(searchQuery)) ||
            (a.message && a.message.toLowerCase().includes(searchQuery))
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; background: #ffffff; border-radius: 20px; border: 1px dashed #cbd5e1;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="margin-bottom: 1rem;">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h3 style="font-size: 1.15rem; color: #1e293b; margin-bottom: 0.25rem;">No matching announcements</h3>
                <p style="color: #64748b; font-size: 0.9rem;">Try adjusting your search terms or filter.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = '';

    filtered.forEach(ann => {
        const card = document.createElement('div');
        card.style.cssText = `
            background: #ffffff;
            border-radius: 20px;
            padding: 1.75rem;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            overflow: hidden;
        `;

        let badgeHtml = '';
        let accentBorderColor = '#3b82f6';
        if (ann.type === 'warning') {
            accentBorderColor = '#f59e0b';
            badgeHtml = `<span style="background: #fffbeb; color: #b45309; border: 1px solid #fde68a; padding: 4px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; display: inline-flex; align-items: center; gap: 5px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                Caution
            </span>`;
        } else if (ann.type === 'alert') {
            accentBorderColor = '#ef4444';
            badgeHtml = `<span style="background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; padding: 4px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; display: inline-flex; align-items: center; gap: 5px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                Urgent Alert
            </span>`;
        } else {
            accentBorderColor = '#3b82f6';
            badgeHtml = `<span style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; display: inline-flex; align-items: center; gap: 5px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Notice
            </span>`;
        }

        const dateText = ann.createdAt ? SmartMoveUtils.formatDate(ann.createdAt) : 'Recently';

        card.innerHTML = `
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: ${accentBorderColor};"></div>
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                    ${badgeHtml}
                    <span style="font-size: 0.78rem; color: #64748b; font-weight: 500; display: inline-flex; align-items: center; gap: 4px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        ${dateText}
                    </span>
                </div>
                <h3 style="font-size: 1.2rem; font-weight: 700; color: #0f172a; margin-bottom: 0.6rem; line-height: 1.35;">${ann.title}</h3>
                <p style="font-size: 0.92rem; color: #475569; line-height: 1.6; margin: 0;">${ann.message}</p>
            </div>
        `;

        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-6px)';
            card.style.boxShadow = '0 20px 35px -5px rgba(0, 0, 0, 0.08)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.03)';
        });

        grid.appendChild(card);
    });
}
