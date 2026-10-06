document.addEventListener('DOMContentLoaded', () => {
    if (!SmartMoveUtils.setupAdminAuth()) return;
    
    fetchFrequentRoutes();
    fetchTopDrivers(); // Fetch MongoDB Aggregation

    const calcBtn = document.getElementById('calcRevenueBtn');
    calcBtn.addEventListener('click', handleCalculateRevenue);
    
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) searchBtn.addEventListener('click', handleSearchComplaints);
});

async function handleCalculateRevenue() {
    const display = document.getElementById('revenueDisplay');
    const btn = document.getElementById('calcRevenueBtn');

    try {
        btn.disabled = true;
        btn.textContent = 'Calculating...';
        
        // Pass date params for Oracle procedure
        const response = await fetch('/api/reports/revenue?startDate=2020-01-01&endDate=2030-01-01');
        if (!response.ok) {
            throw new Error('Failed to calculate revenue');
        }

        const result = await response.json();
        const revNumber = result.totalRevenue || 0;
        
        // Counter animation
        const obj = { val: 0 };
        gsap.to(obj, {
            val: revNumber,
            duration: 1.5,
            ease: "power2.out",
            onUpdate: function() {
                display.textContent = SmartMoveUtils.formatCurrency(obj.val);
            }
        });
        
        SmartMoveUtils.showToast('Successfully executed Oracle PL/SQL Function: CalculateTotalRevenue()', 'success');

    } catch (error) {
        console.error('Revenue Error:', error);
        SmartMoveUtils.showToast('Oracle connection failed.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Execute CalculateTotalRevenue()';
    }
}

async function fetchFrequentRoutes() {
    const tbody = document.getElementById('frequentRoutesTableBody');
    const container = document.getElementById('routesTableContainer');
    
    try {
        const response = await fetch('/api/reports/routes');
        if (!response.ok) {
            throw new Error('Failed to fetch frequent routes');
        }
        
        const routes = await response.json();
        
        if (!routes || routes.length === 0) {
            SmartMoveUtils.renderEmptyState(container, 'No Data', 'Oracle PL/SQL returned no frequent routes.');
            return;
        }

        renderFrequentRoutesTable(tbody, routes);

    } catch (error) {
        console.error('Frequent Routes Error:', error);
        SmartMoveUtils.renderErrorState(container, 'Failed to fetch routes from Oracle.');
    }
}

function renderFrequentRoutesTable(tbody, routes) {
    tbody.innerHTML = '';
    
    routes.forEach((route, i) => {
        const tr = document.createElement('tr');
        tr.className = 'table-row-anim';
        
        // Handle array structure from Oracle cursors or object structure
        const id = Array.isArray(route) ? route[0] : (route.ROUTEID || route.routeId || 'N/A');
        const name = Array.isArray(route) ? route[1] : (route.ROUTENAME || route.routeName || 'Unknown');
        const count = Array.isArray(route) ? route[2] : (route.TRIPCOUNT || route.tripCount || 0);

        tr.innerHTML = `
            <td><strong>#${id}</strong></td>
            <td>${name}</td>
            <td style="text-align: right; font-weight: 600;">${count}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

// --- MongoDB Analytics Functions ---

async function fetchTopDrivers() {
    const tbody = document.getElementById('topDriversTableBody');
    try {
        const res = await fetch('/api/vehicles/top-rated');
        if (!res.ok) throw new Error();
        const drivers = await res.json();
        
        if (drivers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No reviews found in MongoDB.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        drivers.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>Driver #${d._id || 'Unknown'}</td>
                <td style="color: #fbbf24; font-weight: bold;">${(d.averageRating || 0).toFixed(1)} ★</td>
                <td>${d.reviewCount} reviews</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">Failed to fetch MongoDB Top Drivers</td></tr>';
    }
}

async function handleSearchComplaints() {
    const query = document.getElementById('searchInput').value;
    const tbody = document.getElementById('complaintsTableBody');
    if (!query) return;
    
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Searching...</td></tr>';
    
    try {
        const res = await fetch(`/api/reviews/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error();
        const results = await res.json();
        
        if (results.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center;">No reviews matched "${query}".</td></tr>`;
            return;
        }
        
        tbody.innerHTML = '';
        results.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>Route #${r.routeId || 'N/A'}</td>
                <td>${r.feedbackText || 'N/A'}</td>
                <td style="color: #fbbf24;">${r.rating} ★</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: red;">MongoDB search failed.</td></tr>';
    }
}
