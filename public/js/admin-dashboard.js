document.addEventListener('DOMContentLoaded', () => {
    if (!SmartMoveUtils.setupAdminAuth()) return;
    
    fetchFrequentRoutes();

    const calcBtn = document.getElementById('calcRevenueBtn');
    calcBtn.addEventListener('click', handleCalculateRevenue);
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
