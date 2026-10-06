document.addEventListener('DOMContentLoaded', () => {
    // Check if routeId was passed in URL (from homepage "Book Ticket" buttons)
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedRouteId = urlParams.get('routeId');

    fetchPassengers();
    fetchRoutes(preselectedRouteId);

    const form = document.getElementById('bookingForm');
    form.addEventListener('submit', handleBookingSubmit);

    // Initial check to enable/disable submit button
    validateForm();
});

async function fetchPassengers() {
    const modalBody = document.getElementById('passengerModalBody');
    try {
        const res = await fetch('/api/passengers');
        if (!res.ok) throw new Error('Failed to fetch passengers');
        const passengers = await res.json();
        
        modalBody.innerHTML = '';
        passengers.forEach(p => {
            const pid = Array.isArray(p) ? p[0] : (p.PASSENGERID || p.passengerId);
            const name = Array.isArray(p) ? p[1] : (p.FULLNAME || p.fullName);
            
            const btn = document.createElement('button');
            btn.className = 'btn-transparent';
            btn.style.display = 'block';
            btn.style.width = '100%';
            btn.style.textAlign = 'left';
            btn.style.padding = '1rem';
            btn.style.borderBottom = '1px solid var(--border-color)';
            btn.style.color = 'black';
            btn.innerHTML = `<strong>${name}</strong> (ID: ${pid})`;
            
            btn.onclick = () => {
                document.getElementById('bookingPassengerId').value = pid;
                document.getElementById('passengerDisplay').value = name;
                SmartMoveUtils.closeModal('passengerModal');
                validateForm();
            };
            modalBody.appendChild(btn);
        });
    } catch (e) {
        modalBody.innerHTML = '<p style="color: red;">Error fetching passengers from Oracle.</p>';
    }
}

async function fetchRoutes(preselectedRouteId) {
    const modalBody = document.getElementById('routeModalBody');
    try {
        const res = await fetch('/api/routes');
        if (!res.ok) throw new Error('Failed to fetch routes');
        const routes = await res.json();
        
        modalBody.innerHTML = '';
        routes.forEach(r => {
            const rid = Array.isArray(r) ? r[0] : (r.ROUTEID || r.routeId);
            const start = Array.isArray(r) ? r[1] : (r.STARTLOCATION || r.startLocation);
            const end = Array.isArray(r) ? r[2] : (r.ENDLOCATION || r.endLocation);
            const routeName = `${start} &rarr; ${end}`;
            
            // Auto-select if URL parameter matches
            if (preselectedRouteId && String(rid) === String(preselectedRouteId)) {
                document.getElementById('bookingRouteId').value = rid;
                document.getElementById('routeDisplay').value = `${start} to ${end}`;
                validateForm();
            }
            
            const btn = document.createElement('button');
            btn.className = 'btn-transparent';
            btn.style.display = 'block';
            btn.style.width = '100%';
            btn.style.textAlign = 'left';
            btn.style.padding = '1rem';
            btn.style.borderBottom = '1px solid var(--border-color)';
            btn.style.color = 'black';
            btn.innerHTML = `<strong>${start}</strong> to <strong>${end}</strong> (ID: ${rid})`;
            
            btn.onclick = () => {
                document.getElementById('bookingRouteId').value = rid;
                document.getElementById('routeDisplay').value = `${start} to ${end}`;
                SmartMoveUtils.closeModal('routeModal');
                validateForm();
            };
            modalBody.appendChild(btn);
        });
    } catch (e) {
        modalBody.innerHTML = '<p style="color: red;">Error fetching routes from Oracle.</p>';
    }
}

function validateForm() {
    const passId = document.getElementById('bookingPassengerId').value;
    const routeId = document.getElementById('bookingRouteId').value;
    const btn = document.getElementById('submitBtn');
    
    if (passId && routeId) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    
    const passengerID = document.getElementById('bookingPassengerId').value;
    const routeID = document.getElementById('bookingRouteId').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    if (!passengerID || !routeID) return;
    
    const payload = {
        passengerID,
        routeID,
        paymentMethod
    };
    
    try {
        btn.disabled = true;
        btn.textContent = 'Processing Booking...';
        
        const res = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) throw new Error('Booking failed');
        
        SmartMoveUtils.showToast('Your booking was successful!', 'success');
        
        // Reset form
        document.getElementById('bookingPassengerId').value = '';
        document.getElementById('passengerDisplay').value = '';
        document.getElementById('bookingRouteId').value = '';
        document.getElementById('routeDisplay').value = '';
        validateForm();
        
    } catch (error) {
        console.error(error);
        SmartMoveUtils.showToast('Failed to connect to Oracle DB. Is it running?', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm Booking';
    }
}
