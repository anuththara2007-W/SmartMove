document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('smartmove_admin_token') !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('smartmove_admin_token');
        window.location.href = 'login.html';
    });

    fetchData();
});

async function fetchData() {
    const tbody = document.getElementById('ticketsBody');
    tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton" style="height: 40px; width: 100%;"></div></td></tr>`;
    
    try {
        const tickets = await SmartMoveUtils.apiRequest('/api/tickets');
        renderDashboard(tickets);
    } catch (err) {
        SmartMoveUtils.renderErrorState(document.getElementById('tableContainer'), err.message);
    }
}

function renderDashboard(tickets) {
    // 1. Calculate Summaries
    let totalTickets = tickets.length;
    let completedRevenue = 0;
    let pendingCount = 0;
    let cancelledCount = 0;

    tickets.forEach(t => {
        if (t.TICKETSTATUS === 'Booked' || t.TICKETSTATUS === 'Completed') {
            completedRevenue += t.FAREAMOUNT;
        } else if (t.TICKETSTATUS === 'Pending') {
            pendingCount++;
        } else if (t.TICKETSTATUS === 'Cancelled' || t.TICKETSTATUS === 'Refunded') {
            cancelledCount++;
        }
    });

    // Update DOM
    document.getElementById('summary-tickets').textContent = totalTickets;
    document.getElementById('summary-revenue').textContent = SmartMoveUtils.formatCurrency(completedRevenue);
    document.getElementById('summary-pending').textContent = pendingCount;
    document.getElementById('summary-cancelled').textContent = cancelledCount;

    // 2. Render Table
    const tbody = document.getElementById('ticketsBody');
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-secondary); padding: 2rem;">No tickets generated yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = tickets.map(t => {
        const id = t.TICKETID || t.ticketId || t.TicketID;
        const fname = t.FIRSTNAME || t.firstName || t.FirstName || '';
        const lname = t.LASTNAME || t.lastName || t.LastName || '';
        const startLoc = t.STARTLOCATION || t.startLocation || '';
        const endLoc = t.ENDLOCATION || t.endLocation || '';
        const fare = t.FAREAMOUNT || t.fareAmount || t.FareAmount || 0;
        const status = t.TICKETSTATUS || t.ticketStatus || t.TicketStatus || 'Booked';
        const date = t.DEPARTUREDATETIME || t.departureDateTime || '';

        return `
        <tr>
            <td><strong>#${id}</strong></td>
            <td>${fname} ${lname}</td>
            <td>${startLoc} -> ${endLoc}</td>
            <td>${date}</td>
            <td>${fare}</td>
            <td><span>${status}</span></td>
        </tr>
    `}).join('');
}
