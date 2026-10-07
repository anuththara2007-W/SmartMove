document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('bookingForm');
    form.addEventListener('submit', handleBookingSubmit);

    loadVehiclesForSelection();
    prefillRouteFromQuery();

    // Initial check to enable/disable submit button
    validateForm();
});

async function prefillRouteFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const routeId = params.get('routeId');
    if (!routeId) return;

    try {
        const res = await fetch('/api/routes');
        if (!res.ok) return;
        const routes = await res.json();
        const found = routes.find(r => (r.ROUTEID || r.routeId) == routeId);
        if (found) {
            const startInput = document.getElementById('startLocation');
            const endInput = document.getElementById('endLocation');
            if (startInput && found.STARTLOCATION) startInput.value = found.STARTLOCATION;
            if (endInput && found.ENDLOCATION) endInput.value = found.ENDLOCATION;
            validateForm();
        }
    } catch (err) {
        console.error('Error prefilling route:', err);
    }
}

window.validateForm = function() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const startLoc = document.getElementById('startLocation').value.trim();
    const endLoc = document.getElementById('endLocation').value.trim();
    const payment = document.getElementById('paymentMethod').value.trim();
    const selectedVehicle = document.getElementById('selectedVehicleId').value;
    const btn = document.getElementById('submitBtn');
    
    if (firstName && lastName && email && phone && startLoc && endLoc && payment && selectedVehicle) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

async function loadVehiclesForSelection() {
    const grid = document.getElementById('vehicleSelectionGrid');
    try {
        const [vehiclesRes, imagesRes] = await Promise.all([
            fetch('/api/vehicles'),
            fetch('/api/vehicles/documents')
        ]);
        if (!vehiclesRes.ok) throw new Error('Failed to fetch vehicles');
        
        const vehicles = await vehiclesRes.json();
        let images = [];
        if (imagesRes.ok) images = await imagesRes.json();

        if (!vehicles || vehicles.length === 0) {
            grid.innerHTML = '<div style="grid-column: span 2; color: var(--text-secondary);">No vehicles available.</div>';
            return;
        }

        grid.innerHTML = '';
        vehicles.forEach(v => {
            const id = Array.isArray(v) ? v[0] : (v.VEHICLEID || v.vehicleId);
            const reg = Array.isArray(v) ? v[1] : (v.REGNUMBER || v.regNumber);
            const type = Array.isArray(v) ? v[2] : (v.VEHICLETYPE || v.vehicleType);
            const capacity = Array.isArray(v) ? v[3] : (v.CAPACITY || v.capacity);

            const matchedDoc = images.find(doc => doc.vehicleID == id);
            const imgUrl = (matchedDoc && matchedDoc.imageUrls && matchedDoc.imageUrls.length > 0) ? matchedDoc.imageUrls[0] : null;
            const imgHtml = imgUrl ? `<img src="${imgUrl}" alt="Vehicle" style="width: 100%; height: 180px; object-fit: cover; display: block;">` : '';

            const card = document.createElement('div');
            card.className = 'glass-panel vehicle-card';
            card.style.padding = '0';
            card.style.overflow = 'hidden';
            card.style.cursor = 'pointer';
            card.style.border = '2px solid transparent';
            card.style.transition = 'all 0.2s';
            
            card.innerHTML = `
                ${imgHtml}
                <div style="padding: 1rem;">
                    <h4 style="font-size: 1rem; margin-bottom: 0.2rem;">${type}</h4>
                    <p style="font-size: 0.8rem; color: var(--text-secondary);">${reg}</p>
                    <p style="font-size: 0.8rem; color: var(--primary-accent); font-weight: 600; margin-top: 0.5rem;">${capacity} Seats</p>
                </div>
            `;

            card.addEventListener('click', () => {
                document.querySelectorAll('.vehicle-card').forEach(c => c.style.border = '2px solid transparent');
                card.style.border = '2px solid var(--primary-accent)';
                document.getElementById('selectedVehicleId').value = id;
                document.getElementById('vehicleErrorMsg').style.display = 'none';
                window.validateForm();
            });

            grid.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        grid.innerHTML = '<div style="color: var(--error-color);">Error loading vehicles.</div>';
    }
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const startLocation = document.getElementById('startLocation').value.trim();
    const endLocation = document.getElementById('endLocation').value.trim();
    const paymentMethod = document.getElementById('paymentMethod').value.trim();
    const vehicleID = document.getElementById('selectedVehicleId').value;
    
    if (!vehicleID) {
        document.getElementById('vehicleErrorMsg').style.display = 'block';
        return;
    }
    
    try {
        btn.disabled = true;
        btn.textContent = 'Processing...';
        
        // 1. Create Passenger
        const passRes = await fetch('/api/passengers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, phone, email })
        });
        if (!passRes.ok) throw new Error('Failed to create passenger');
        const passData = await passRes.json();
        const passengerID = passData.passengerId;

        // 2. Create Route
        const routeRes = await fetch('/api/routes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startLocation, endLocation, distanceKm: 10, estimatedDuration: 30 })
        });
        if (!routeRes.ok) throw new Error('Failed to create route');
        const routeData = await routeRes.json();
        const routeID = routeData.routeId;

        // 3. Book Ticket
        const ticketRes = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passengerID, routeID, vehicleID, paymentMethod })
        });
        
        if (!ticketRes.ok) throw new Error('Booking failed');
        
        SmartMoveUtils.showToast('Your booking was successful!', 'success');
        
        // Add to Table
        const tbody = document.getElementById('userBookingsTableBody');
        // Clear empty message if it exists
        if (tbody.children.length === 1 && tbody.children[0].textContent.includes('No bookings')) {
            tbody.innerHTML = '';
        }
        
        // Generate a random ticket ID placeholder if backend doesn't return one immediately
        const mockTicketId = Math.floor(Math.random() * 90000) + 10000;
        
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-color)';
        tr.innerHTML = `
            <td style="padding: 1rem;"><strong>#${mockTicketId}</strong></td>
            <td style="padding: 1rem;">${startLocation} &rarr; ${endLocation}</td>
            <td style="padding: 1rem;">${paymentMethod}</td>
            <td style="padding: 1rem;"><span style="background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">Booked</span></td>
        `;
        // Insert at top
        tbody.insertBefore(tr, tbody.firstChild);
        
        // Reset form
        document.getElementById('bookingForm').reset();
        document.getElementById('selectedVehicleId').value = '';
        document.querySelectorAll('.vehicle-card').forEach(c => c.style.border = '2px solid transparent');
        validateForm();
        
    } catch (error) {
        console.error(error);
        SmartMoveUtils.showToast(error.message || 'Failed to connect to Oracle DB. Is it running?', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm Booking';
    }
}
