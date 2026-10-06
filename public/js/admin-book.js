document.addEventListener('DOMContentLoaded', () => {
    if (!SmartMoveUtils.setupAdminAuth()) return;

    // Setup Modals
    setupPassengerModal();
    setupRouteModal();

    // Real-time Form Validation
    const form = document.getElementById('bookingForm');
    const submitBtn = document.getElementById('submitBtn');
    
    function checkValidity() {
        const pId = document.getElementById('passengerId').value;
        const rId = document.getElementById('routeId').value;
        const pMeth = document.getElementById('paymentMethod').value;
        
        if (pId && rId && pMeth) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    form.addEventListener('input', checkValidity);
    form.addEventListener('change', checkValidity); // For select elements and hidden inputs updated by JS

    const observer = new MutationObserver(checkValidity);
    observer.observe(document.getElementById('passengerId'), { attributes: true });
    observer.observe(document.getElementById('routeId'), { attributes: true });

    form.addEventListener('submit', handleBookingSubmit);
    
    // Clear errors on input
    const inputs = form.querySelectorAll('.check-valid');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            this.classList.remove('invalid');
            const errorElement = document.getElementById(`error-${this.id}`);
            if (errorElement) {
                errorElement.style.opacity = '0';
                setTimeout(() => errorElement.style.display = 'none', 300);
            }
        });
    });
});

async function setupPassengerModal() {
    const body = document.getElementById('passengerModalBody');
    try {
        const response = await fetch('/api/passengers');
        if (!response.ok) throw new Error('API Error');
        const passengers = await response.json();
        
        if (!passengers || passengers.length === 0) {
            SmartMoveUtils.renderEmptyState(body, 'No Passengers', 'No passengers currently available.');
            return;
        }

        renderModalTable(body, passengers, ['ID', 'First Name', 'Last Name', 'Email'], ['PASSENGERID', 'FIRSTNAME', 'LASTNAME', 'EMAIL'], selectPassenger);

    } catch (e) {
        SmartMoveUtils.renderErrorState(body, 'Failed to fetch passengers.');
    }
}

async function setupRouteModal() {
    const body = document.getElementById('routeModalBody');
    try {
        const response = await fetch('/api/routes');
        if (!response.ok) throw new Error('API Error');
        const routes = await response.json();
        
        if (!routes || routes.length === 0) {
            SmartMoveUtils.renderEmptyState(body, 'No Routes', 'No routes currently available.');
            return;
        }

        renderModalTable(body, routes, ['ID', 'Start', 'End'], ['ROUTEID', 'STARTLOCATION', 'ENDLOCATION'], selectRoute);

    } catch (e) {
        SmartMoveUtils.renderErrorState(body, 'Failed to fetch routes.');
    }
}

function renderModalTable(container, data, headers, keys, clickHandler) {
    let html = `<table class="selection-table"><thead><tr>`;
    headers.forEach(h => html += `<th>${h}</th>`);
    html += `</tr></thead><tbody>`;
    
    data.forEach(row => {
        // Convert row to JSON string to pass it safely to onclick
        const rowData = encodeURIComponent(JSON.stringify(row));
        html += `<tr data-row="${rowData}">`;
        keys.forEach(k => {
            html += `<td>${row[k] || row[k.toLowerCase()] || ''}</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table>`;
    
    container.innerHTML = html;

    // Attach listeners
    container.querySelectorAll('tr[data-row]').forEach(tr => {
        tr.addEventListener('click', function() {
            const rowData = JSON.parse(decodeURIComponent(this.getAttribute('data-row')));
            clickHandler(rowData);
        });
    });
}

function selectPassenger(data) {
    const pid = data.PASSENGERID || data.id || data.ID;
    const name = data.FIRSTNAME ? `${data.FIRSTNAME} ${data.LASTNAME}` : data.name;
    document.getElementById('passengerId').value = pid;
    document.getElementById('passengerId').dispatchEvent(new Event('change')); // Trigger validation
    document.getElementById('passengerDisplay').value = `${name} (ID: ${pid})`;
    SmartMoveUtils.closeModal('passengerModal');
}

function selectRoute(data) {
    const rid = data.ROUTEID || data.id || data.ID;
    const name = data.STARTLOCATION ? `${data.STARTLOCATION} to ${data.ENDLOCATION}` : (data.name || data.NAME);
    document.getElementById('routeId').value = rid;
    document.getElementById('routeId').dispatchEvent(new Event('change')); // Trigger validation
    document.getElementById('routeDisplay').value = `${name} (ID: ${rid})`;
    SmartMoveUtils.closeModal('routeModal');
}

async function handleBookingSubmit(event) {
    event.preventDefault();
    
    const passengerId = document.getElementById('passengerId').value;
    const routeId = document.getElementById('routeId').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    const submitBtn = document.getElementById('submitBtn');

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        
        const response = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                passengerID: parseInt(passengerId, 10),
                routeID: parseInt(routeId, 10),
                // No hardcoded amount — backend fetches BaseFare from the Trip
                paymentMethod: paymentMethod
            })
        });

        if (!response.ok) throw new Error('Booking failed.');

        SmartMoveUtils.showToast('Ticket successfully booked via Oracle DB!', 'success');
        
        document.getElementById('bookingForm').reset();
        // Manually reset readonly displays
        document.getElementById('passengerDisplay').value = '';
        document.getElementById('routeDisplay').value = '';
        
    } catch (error) {
        console.error('Booking Error:', error);
        SmartMoveUtils.showToast(error.message || 'An error occurred during booking.', 'error');
    } finally {
        submitBtn.textContent = 'Confirm Booking';
        // Form reset clears inputs, so disabled should remain true until filled again
    }
}

// --- SEAT SELECTOR REMOVED ---
