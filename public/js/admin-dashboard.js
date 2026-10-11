document.addEventListener('DOMContentLoaded', () => {
    if (!SmartMoveUtils.setupAdminAuth()) return;
    
    fetchFrequentRoutes();
    fetchTopDrivers(); // Fetch MongoDB Aggregation
    fetchRecentBookings(); // Fetch Oracle Tickets

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
            
            // Standard object property access
            const id = t.TICKETID || t.ticketId || t.TicketID;
            const passengerName = `${t.FIRSTNAME || t.firstName || ''} ${t.LASTNAME || t.lastName || ''}`.trim() || 'Guest Passenger';
            const contact = t.PHONE || t.phone || '077-1234567';
            const route = `${t.STARTLOCATION || t.startLocation || ''} &rarr; ${t.ENDLOCATION || t.endLocation || ''}`;
            const fare = t.FAREAMOUNT || t.fareAmount || t.FareAmount || 0;
            const status = t.TICKETSTATUS || t.ticketStatus || t.TicketStatus || 'Booked';

            const statusLower = status.toLowerCase();
            let statusBadgeClass = 'booked';
            if (statusLower.includes('confirm')) statusBadgeClass = 'confirmed';
            else if (statusLower.includes('cancel')) statusBadgeClass = 'cancelled';

            tr.innerHTML = `
                <td><strong style="color: #0f172a; font-family: monospace; font-size: 0.95rem;">#${id}</strong></td>
                <td><span style="font-weight: 600; color: #1e293b;">${passengerName}</span></td>
                <td><span style="color: #64748b; font-size: 0.85rem; font-family: monospace;">${contact}</span></td>
                <td><span style="font-weight: 500; color: #334155;">${route}</span></td>
                <td><strong style="color: #0f172a;">${SmartMoveUtils.formatCurrency(fare)}</strong></td>
                <td>
                    <span class="booking-status-badge ${statusBadgeClass}">
                        <span class="status-dot"></span>
                        ${status}
                    </span>
                </td>
                <td>
                    <div class="status-dropdown-wrapper">
                        <select class="status-select-dropdown" onchange="updateTicketStatus(${id}, this.value)">
                            <option value="" disabled selected>Update Status...</option>
                            <option value="Confirmed" ${status === 'Confirmed' ? 'disabled' : ''}>✓ Confirm</option>
                            <option value="Cancelled" ${status === 'Cancelled' ? 'disabled' : ''}>✕ Cancel</option>
                            <option value="Booked" ${status === 'Booked' ? 'disabled' : ''}>🎫 Booked</option>
                        </select>
                    </div>
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
    
    routes.forEach((route) => {
        const tr = document.createElement('tr');
        
        const id = Array.isArray(route) ? route[0] : (route.ROUTEID || route.routeId || route.RouteID || 'N/A');
        const name = Array.isArray(route) ? route[1] : (route.ROUTENAME || route.routeName || route.RouteName || 'Route');
        const count = Array.isArray(route) ? (route[2] ?? 0) : (route.TRIPCOUNT ?? route.tripCount ?? route.TripCount ?? 0);

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


