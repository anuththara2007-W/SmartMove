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

    fetchPassengers();

    document.getElementById('passengerForm').addEventListener('submit', handlePassengerSubmit);
});

let currentPassengerIdToDelete = null;

async function fetchPassengers() {
    const tbody = document.getElementById('passengersBody');
    tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton" style="height: 40px; width: 100%;"></div></td></tr>`;
    
    try {
        const data = await SmartMoveUtils.apiRequest('/api/passengers');
        renderPassengers(data);
    } catch (err) {
        SmartMoveUtils.renderErrorState(document.getElementById('tableContainer'), err.message);
    }
}

function renderPassengers(passengers) {
    const tbody = document.getElementById('passengersBody');
    if (!passengers || passengers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-secondary); padding: 2rem;">No passengers found.<br><br><button class="btn-primary" onclick="openFormModal()">Add Passenger</button></td></tr>`;
        return;
    }

    tbody.innerHTML = passengers.map(p => {
        const regDate = SmartMoveUtils.formatDate(p.REGISTEREDDATE);
        
        return `
        <tr>
            <td>${p.PASSENGERID}</td>
            <td>${SmartMoveUtils.escapeHtml(p.FIRSTNAME)} ${SmartMoveUtils.escapeHtml(p.LASTNAME)}</td>
            <td>${SmartMoveUtils.escapeHtml(p.EMAIL)}</td>
            <td>${SmartMoveUtils.escapeHtml(p.PHONE)}</td>
            <td>${regDate}</td>
            <td>
                <button class="action-btn btn-edit" onclick="editPassenger('${p.PASSENGERID}', '${SmartMoveUtils.escapeHtml(p.FIRSTNAME)}', '${SmartMoveUtils.escapeHtml(p.LASTNAME)}', '${SmartMoveUtils.escapeHtml(p.EMAIL)}', '${SmartMoveUtils.escapeHtml(p.PHONE)}')">Edit</button>
                <button class="action-btn btn-delete" onclick="promptDelete('${p.PASSENGERID}', '${SmartMoveUtils.escapeHtml(p.FIRSTNAME)}')">Delete</button>
            </td>
        </tr>
    `}).join('');
}

window.openFormModal = function() {
    document.getElementById('formTitle').textContent = 'Add Passenger';
    document.getElementById('submitBtn').textContent = 'Save Passenger';
    document.getElementById('passengerForm').reset();
    document.getElementById('passengerId').value = '';
    SmartMoveUtils.openModal('passengerModal');
}

window.editPassenger = function(id, fName, lName, email, phone) {
    document.getElementById('formTitle').textContent = 'Edit Passenger';
    document.getElementById('submitBtn').textContent = 'Update Passenger';
    
    document.getElementById('passengerId').value = id;
    document.getElementById('firstName').value = fName;
    document.getElementById('lastName').value = lName;
    document.getElementById('email').value = email;
    document.getElementById('phone').value = phone;
    
    SmartMoveUtils.openModal('passengerModal');
}

async function handlePassengerSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    
    const id = document.getElementById('passengerId').value;
    const payload = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim()
    };

    if (!SmartMoveUtils.validateRequired(payload.firstName) || !SmartMoveUtils.validateRequired(payload.lastName)) {
        return SmartMoveUtils.showToast('Name is required.', 'error');
    }
    if (!SmartMoveUtils.validateEmail(payload.email)) {
        return SmartMoveUtils.showToast('Please enter a valid email address.', 'error');
    }

    const originalText = btn.textContent;
    btn.textContent = id ? 'Updating...' : 'Saving...';
    btn.disabled = true;

    try {
        const url = id ? `/api/passengers/${id}` : '/api/passengers';
        const method = id ? 'PUT' : 'POST';
        
        await SmartMoveUtils.apiRequest(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        SmartMoveUtils.showToast(id ? 'Passenger updated successfully!' : 'Passenger added successfully!');
        SmartMoveUtils.closeModal('passengerModal');
        fetchPassengers();
    } catch (err) {
        SmartMoveUtils.showToast(err.message, 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

window.promptDelete = function(id, name) {
    currentPassengerIdToDelete = id;
    document.getElementById('confirmText').innerHTML = `Are you sure you want to delete <strong>${name}</strong>?<br><br>This action may be restricted if the passenger has booked tickets.`;
    SmartMoveUtils.openModal('confirmModal');
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!currentPassengerIdToDelete) return;
    
    const btn = document.getElementById('confirmDeleteBtn');
    btn.textContent = 'Deleting...';
    btn.disabled = true;
    
    try {
        await SmartMoveUtils.apiRequest(`/api/passengers/${currentPassengerIdToDelete}`, { method: 'DELETE' });
        SmartMoveUtils.showToast('Passenger deleted successfully.');
        SmartMoveUtils.closeModal('confirmModal');
        fetchPassengers();
    } catch (err) {
        SmartMoveUtils.showToast(err.message, 'error');
        SmartMoveUtils.closeModal('confirmModal');
    } finally {
        btn.textContent = 'Delete Passenger';
        btn.disabled = false;
        currentPassengerIdToDelete = null;
    }
});
