document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('bookingForm');
    form.addEventListener('submit', handleBookingSubmit);

    // Initial check to enable/disable submit button
    validateForm();
});

window.validateForm = function() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const startLoc = document.getElementById('startLocation').value.trim();
    const endLoc = document.getElementById('endLocation').value.trim();
    const payment = document.getElementById('paymentMethod').value.trim();
    const btn = document.getElementById('submitBtn');
    
    if (firstName && lastName && email && phone && startLoc && endLoc && payment) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
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
            body: JSON.stringify({ passengerID, routeID, paymentMethod })
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
        validateForm();
        
    } catch (error) {
        console.error(error);
        SmartMoveUtils.showToast(error.message || 'Failed to connect to Oracle DB. Is it running?', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm Booking';
    }
}
