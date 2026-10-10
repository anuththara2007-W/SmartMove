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

    fetchTrips();

    // Pre-fetch data for selectors
    fetchForeignData();

    document.getElementById('tripForm').addEventListener('submit', handleTripSubmit);
});

let allTrips = [];
let allRoutes = [];
let allVehicles = [];
let allDrivers = [];

let currentSelectorType = null;
let currentTripIdToDelete = null;

let allTickets = [];

async function fetchForeignData() {
    try {
        const [routesRes, vehiclesRes, driversRes, ticketsRes] = await Promise.all([
            fetch('/api/routes').then(r => r.json()),
            fetch('/api/vehicles').then(r => r.json()),
            fetch('/api/drivers').then(r => r.json()),
            fetch('/api/tickets').then(r => r.json())
        ]);
        allRoutes = routesRes || [];
        allVehicles = vehiclesRes || [];
        allDrivers = driversRes || [];
        allTickets = ticketsRes || [];
    } catch (err) {
        console.error("Failed to load lookup data", err);
    }
}

async function fetchTrips() {
    ['Scheduled', 'InProgress', 'Completed', 'Cancelled'].forEach(id => {
        document.getElementById(`list-${id}`).innerHTML = `<div class="skeleton" style="height: 100px; border-radius: 12px; margin-bottom: 1rem;"></div>`;
    });
    
    try {
        allTrips = await SmartMoveUtils.apiRequest('/api/trips');
        renderKanban();
    } catch (err) {
        SmartMoveUtils.showToast(err.message, 'error');
    }
}

function renderKanban() {
    const cols = {
        'Scheduled': [],
        'In Progress': [],
        'Completed': [],
        'Cancelled': []
    };

    allTrips.forEach(t => {
        if (cols[t.TRIPSTATUS]) {
            cols[t.TRIPSTATUS].push(t);
        } else {
            cols['Scheduled'].push(t); // fallback
        }
    });

    Object.keys(cols).forEach(status => {
        const domId = status.replace(' ', '');
        const list = document.getElementById(`list-${domId}`);
        const count = document.getElementById(`count-${domId}`);
        
        count.textContent = `(${cols[status].length})`;
        
        if (cols[status].length === 0) {
            list.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem 0; font-size: 0.9rem;">No trips here</div>`;
            return;
        }

        list.innerHTML = cols[status].map(t => {
            const classMod = status === 'In Progress' ? 'trip-status-in-progress' : 
                             status === 'Completed' ? 'trip-status-completed' : 
                             status === 'Cancelled' ? 'trip-status-cancelled' : '';
            return `
            <div class="trip-card ${classMod}" onclick="editTrip('${t.TRIPID}')">
                <div class="card-route">${SmartMoveUtils.escapeHtml(t.STARTLOCATION)} &rarr; ${SmartMoveUtils.escapeHtml(t.ENDLOCATION)}</div>
                <div class="card-detail">Vehicle: ${SmartMoveUtils.escapeHtml(t.REGNUMBER)}</div>
                <div class="card-detail">Driver: ${SmartMoveUtils.escapeHtml(t.DRIVERFIRSTNAME)} ${SmartMoveUtils.escapeHtml(t.DRIVERLASTNAME)}</div>
                <div class="card-time">Departs: ${SmartMoveUtils.formatDateTime(t.DEPARTUREDATETIME)}</div>
            </div>
            `;
        }).join('');
    });
}

window.openTripForm = function() {
    document.getElementById('formTitle').textContent = 'Schedule Trip';
    document.getElementById('submitBtn').textContent = 'Save Trip';
    document.getElementById('deleteTripBtn').style.display = 'none';
    document.getElementById('tripForm').reset();
    document.getElementById('tripId').value = '';
    
    // Hide passengers section
    const pc = document.getElementById('bookedPassengersContainer');
    if(pc) pc.style.display = 'none';
    
    // Reset selectors
    document.getElementById('routeId').value = '';
    document.getElementById('display-route').textContent = 'Select a Route...';
    
    document.getElementById('vehicleId').value = '';
    document.getElementById('display-vehicle').textContent = 'Select a Vehicle...';
    
    document.getElementById('driverId').value = '';
    document.getElementById('display-driver').textContent = 'Select a Driver...';
    
    SmartMoveUtils.openModal('tripModal');
}

window.editTrip = function(id) {
    const trip = allTrips.find(t => t.TRIPID == id);
    if (!trip) return;

    document.getElementById('formTitle').textContent = 'Edit Trip';
    document.getElementById('submitBtn').textContent = 'Update Trip';
    document.getElementById('deleteTripBtn').style.display = 'block';
    
    document.getElementById('tripId').value = trip.TRIPID;
    
    document.getElementById('routeId').value = trip.ROUTEID;
    document.getElementById('display-route').textContent = `${trip.STARTLOCATION} to ${trip.ENDLOCATION}`;
    
    document.getElementById('vehicleId').value = trip.VEHICLEID;
    document.getElementById('display-vehicle').textContent = `${trip.REGNUMBER} (${trip.VEHICLETYPE})`;
    
    document.getElementById('driverId').value = trip.DRIVERID;
    document.getElementById('display-driver').textContent = `${trip.DRIVERFIRSTNAME} ${trip.DRIVERLASTNAME}`;

    document.getElementById('departureTime').value = trip.DEPARTUREDATETIME ? trip.DEPARTUREDATETIME.substring(0, 16) : '';
    document.getElementById('arrivalTime').value = trip.ARRIVALDATETIME ? trip.ARRIVALDATETIME.substring(0, 16) : '';
    
    document.getElementById('baseFare').value = trip.BASEFARE !== undefined ? trip.BASEFARE : '15.00';
    document.getElementById('tripStatus').value = trip.TRIPSTATUS;
    
    // Show Booked Passengers
    const passengersContainer = document.getElementById('bookedPassengersContainer');
    const passengersList = document.getElementById('bookedPassengersList');
    
    const tripTickets = allTickets.filter(tk => {
        const tTripId = tk.TRIPID || tk.tripId || tk.TripID;
        return tTripId == id;
    });

    if (tripTickets.length > 0) {
        passengersContainer.style.display = 'block';
        passengersList.innerHTML = tripTickets.map(tk => {
            const fname = tk.FIRSTNAME || tk.firstName || tk.FirstName || '';
            const lname = tk.LASTNAME || tk.lastName || tk.LastName || '';
            const status = tk.TICKETSTATUS || tk.ticketStatus || tk.TicketStatus || '';
            const seat = tk.SEATNUMBER || tk.seatNumber || tk.SeatNumber || 'N/A';
            return `<div style="padding: 4px 0; border-bottom: 1px solid #eee;">
                <strong>${fname} ${lname}</strong> (Seat: ${seat}) - <span style="color:var(--primary-accent);">${status}</span>
            </div>`;
        }).join('');
    } else {
        passengersContainer.style.display = 'block';
        passengersList.innerHTML = '<div style="color: var(--text-secondary);">No passengers booked yet.</div>';
    }

    SmartMoveUtils.openModal('tripModal');
}

async function handleTripSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    
    const id = document.getElementById('tripId').value;
    const payload = {
        routeID: document.getElementById('routeId').value,
        vehicleID: document.getElementById('vehicleId').value,
        driverID: document.getElementById('driverId').value,
        departureDateTime: document.getElementById('departureTime').value,
        arrivalDateTime: document.getElementById('arrivalTime').value,
        baseFare: parseFloat(document.getElementById('baseFare').value) || 15.00,
        tripStatus: document.getElementById('tripStatus').value
    };

    if (!SmartMoveUtils.validateRequired(payload.routeID) || 
        !SmartMoveUtils.validateRequired(payload.vehicleID) || 
        !SmartMoveUtils.validateRequired(payload.driverID)) {
        return SmartMoveUtils.showToast('Route, Vehicle, and Driver must be selected.', 'error');
    }

    if (!SmartMoveUtils.validateDateRange(payload.departureDateTime, payload.arrivalDateTime)) {
        return SmartMoveUtils.showToast('Arrival time must be after Departure time.', 'error');
    }

    const originalText = btn.textContent;
    btn.textContent = id ? 'Updating...' : 'Saving...';
    btn.disabled = true;

    try {
        const url = id ? `/api/trips/${id}` : '/api/trips';
        const method = id ? 'PUT' : 'POST';
        
        await SmartMoveUtils.apiRequest(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        SmartMoveUtils.showToast(id ? 'Trip updated successfully!' : 'Trip scheduled successfully!');
        SmartMoveUtils.closeModal('tripModal');
        fetchTrips();
    } catch (err) {
        SmartMoveUtils.showToast(err.message, 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

window.promptDeleteTrip = function() {
    currentTripIdToDelete = document.getElementById('tripId').value;
    SmartMoveUtils.openModal('confirmModal');
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!currentTripIdToDelete) return;
    
    const btn = document.getElementById('confirmDeleteBtn');
    btn.textContent = 'Deleting...';
    btn.disabled = true;
    
    try {
        await SmartMoveUtils.apiRequest(`/api/trips/${currentTripIdToDelete}`, { method: 'DELETE' });
        SmartMoveUtils.showToast('Trip deleted successfully.');
        SmartMoveUtils.closeModal('confirmModal');
        SmartMoveUtils.closeModal('tripModal');
        fetchTrips();
    } catch (err) {
        SmartMoveUtils.showToast(err.message, 'error');
        SmartMoveUtils.closeModal('confirmModal');
    } finally {
        btn.textContent = 'Delete';
        btn.disabled = false;
        currentTripIdToDelete = null;
    }
});

// --- SELECTOR LOGIC ---
window.openSelector = function(type) {
    currentSelectorType = type;
    document.getElementById('selectorSearch').value = '';
    
    const titleMap = {
        'route': 'Select Route',
        'vehicle': 'Select Vehicle',
        'driver': 'Select Driver'
    };
    
    document.getElementById('selectorTitle').textContent = titleMap[type];
    renderSelectorList();
    SmartMoveUtils.openModal('selectorModal');
}

function renderSelectorList(filter = '') {
    const list = document.getElementById('selectorList');
    filter = filter.toLowerCase();
    
    let items = [];
    if (currentSelectorType === 'route') {
        items = allRoutes.filter(r => 
            (r.STARTLOCATION || '').toLowerCase().includes(filter) || 
            (r.ENDLOCATION || '').toLowerCase().includes(filter)
        ).map(r => ({
            id: r.ROUTEID,
            display: `${r.STARTLOCATION} to ${r.ENDLOCATION}`,
            sub: `${r.DISTANCEKM} Km, ${r.ESTIMATEDDURATION} Hrs`
        }));
    } else if (currentSelectorType === 'vehicle') {
        items = allVehicles.filter(v => v.STATUS === 'Active').filter(v => 
            (v.REGNUMBER || '').toLowerCase().includes(filter) || 
            (v.VEHICLETYPE || '').toLowerCase().includes(filter)
        ).map(v => ({
            id: v.VEHICLEID,
            display: `${v.REGNUMBER} (${v.VEHICLETYPE})`,
            sub: `Capacity: ${v.CAPACITY} | Status: ${v.STATUS}`
        }));
    } else if (currentSelectorType === 'driver') {
        items = allDrivers.filter(d => d.STATUS === 'Active').filter(d => 
            (d.FIRSTNAME || '').toLowerCase().includes(filter) || 
            (d.LASTNAME || '').toLowerCase().includes(filter)
        ).map(d => ({
            id: d.DRIVERID,
            display: `${d.FIRSTNAME} ${d.LASTNAME}`,
            sub: `License: ${d.LICENSENUMBER} | Status: ${d.STATUS}`
        }));
    }

    if (items.length === 0) {
        list.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">No active matches found.</div>`;
        return;
    }

    list.innerHTML = items.map(item => `
        <div class="selector-item" onclick="selectItem('${item.id}', '${item.display.replace(/'/g, "\\'")}')">
            <div style="font-weight: 600;">${SmartMoveUtils.escapeHtml(item.display)}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">${SmartMoveUtils.escapeHtml(item.sub)}</div>
        </div>
    `).join('');
}

window.filterSelector = function() {
    renderSelectorList(document.getElementById('selectorSearch').value);
}

window.selectItem = function(id, display) {
    document.getElementById(`${currentSelectorType}Id`).value = id;
    document.getElementById(`display-${currentSelectorType}`).textContent = display;
    SmartMoveUtils.closeModal('selectorModal');
}
