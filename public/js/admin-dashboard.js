document.addEventListener('DOMContentLoaded', () => {
    if (!SmartMoveUtils.setupAdminAuth()) return;
    
    fetchFrequentRoutes();
    fetchTopDrivers(); // Fetch MongoDB Aggregation
    fetchRecentBookings(); // Fetch Oracle Tickets

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

// --- Recent Bookings Functions ---

async function fetchRecentBookings() {
    const tbody = document.getElementById('bookingsTableBody');
    try {
        const response = await fetch('/api/tickets');
        if (!response.ok) throw new Error('Failed to fetch tickets');
        
        const tickets = await response.json();
        
        if (!tickets || tickets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No recent bookings found.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        
        // Show top 10 most recent
        tickets.slice(0, 10).forEach(t => {
            const tr = document.createElement('tr');
            tr.className = 'table-row-anim';
            
            // Extract from array or object structure based on Oracle fetch mode
            const id = Array.isArray(t) ? t[0] : (t.TICKETID || t.ticketId);
            const passengerName = Array.isArray(t) ? `${t[6]} ${t[7]}` : `${t.FIRSTNAME || ''} ${t.LASTNAME || ''}`;
            const contact = Array.isArray(t) ? t[8] : (t.CONTACTNUMBER || t.contactNumber || 'N/A');
            const route = Array.isArray(t) ? `${t[9]} &rarr; ${t[10]}` : `${t.STARTLOCATION || ''} &rarr; ${t.ENDLOCATION || ''}`;
            const fare = Array.isArray(t) ? t[4] : (t.FAREAMOUNT || t.fareAmount || 0);
            const status = Array.isArray(t) ? t[5] : (t.TICKETSTATUS || t.ticketStatus || 'Booked');

            const statusColors = {
                'Booked': '#3b82f6',
                'Confirmed': '#10b981',
                'Cancelled': '#ef4444'
            };
            const color = statusColors[status] || '#64748b';

            tr.innerHTML = `
                <td><strong>#${id}</strong></td>
                <td>${passengerName}</td>
                <td>${contact}</td>
                <td>${route}</td>
                <td>${SmartMoveUtils.formatCurrency(fare)}</td>
                <td><span style="background: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">${status}</span></td>
                <td>
                    <select onchange="updateTicketStatus(${id}, this.value)" class="form-control" style="padding: 4px; font-size: 0.85rem; border-radius: 4px;">
                        <option value="">Update...</option>
                        <option value="Confirmed">Confirm</option>
                        <option value="Cancelled">Cancel</option>
                        <option value="Booked">Mark as Booked</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Bookings Error:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--error-color);">Error fetching bookings. Check Oracle connection.</td></tr>';
    }
}

async function updateTicketStatus(ticketId, newStatus) {
    if (!newStatus) return;
    try {
        const response = await fetch(`/api/tickets/${ticketId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newStatus })
        });
        
        if (!response.ok) throw new Error('Failed to update status');
        
        SmartMoveUtils.showToast(`Ticket #${ticketId} status updated to ${newStatus}`, 'success');
        fetchRecentBookings(); // Refresh the table
    } catch (error) {
        console.error('Update Status Error:', error);
        SmartMoveUtils.showToast('Failed to update ticket status via PL/SQL', 'error');
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
