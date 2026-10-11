document.addEventListener('DOMContentLoaded', () => {
    
    fetchFrequentRoutes();

    const calcBtn = document.getElementById('calcRevenueBtn');
    calcBtn.addEventListener('click', handleCalculateRevenue);
});

async function handleCalculateRevenue() {
    const display = document.getElementById('revenueDisplay');
    const btn = document.getElementById('calcRevenueBtn');
    const msg = document.getElementById('revenueMessage');

    try {
        btn.disabled = true;
        btn.textContent = 'Calculating...';
        
        const response = await fetch('/api/reports/revenue');
        if (!response.ok) {
            throw new Error('Failed to calculate revenue');
        }

        const result = await response.json();
        
        // Format the number to currency
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        });

        const revNumber = result.totalRevenue || 0;
        display.textContent = formatter.format(revNumber);
        
        msg.style.display = 'block';
        msg.style.color = '#fff';
        msg.textContent = 'Successfully executed Oracle PL/SQL Function: CalculateTotalRevenue()';

    } catch (error) {
        console.error('Revenue Error:', error);
        
        display.textContent = 'Error';
        msg.style.display = 'block';
        msg.style.color = '#ef4444';
        msg.textContent = 'Oracle connection failed or revenue calculation error.';
        
    } finally {
        btn.disabled = false;
        btn.textContent = 'Recalculate';
    }
}

async function fetchFrequentRoutes() {
    const tbody = document.getElementById('frequentRoutesTableBody');
    
    try {
        const response = await fetch('/api/reports/routes');
        if (!response.ok) {
            throw new Error('Failed to fetch frequent routes');
        }
        
        const routes = await response.json();
        
        if (!routes || routes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="reports-td-empty">No frequent routes found.</td></tr>';
            return;
        }

        renderFrequentRoutesTable(tbody, routes);

    } catch (error) {
        console.error('Frequent Routes Error:', error);
        
        tbody.innerHTML = '<tr><td colspan="3" class="reports-td-error">Error fetching routes.</td></tr>';
    }
}

function renderFrequentRoutesTable(tbody, routes) {
    tbody.innerHTML = '';
    
    routes.forEach(route => {
        const tr = document.createElement('tr');
        
        const id = Array.isArray(route) ? route[0] : (route.ROUTEID || route.routeId || route.RouteID || 'N/A');
        const name = Array.isArray(route) ? route[1] : (route.ROUTENAME || route.routeName || route.RouteName || 'Unknown');
        const count = Array.isArray(route) ? (route[2] ?? 0) : (route.TRIPCOUNT ?? route.tripCount ?? route.TripCount ?? 0);

        tr.innerHTML = `
            <td><strong>#${id}</strong></td>
            <td>${name}</td>
            <td class="reports-td-right">${count}</td>
        `;
        
        tbody.appendChild(tr);
    });
}
