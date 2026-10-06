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

    fetchDrivers();

    document.getElementById('driverForm').addEventListener('submit', handleDriverSubmit);
});

let currentDriverIdToDelete = null;

async function fetchDrivers() {
    const tbody = document.getElementById('driversBody');
    tbody.innerHTML = `<tr><td colspan="7"><div class="skeleton" style="height: 40px; width: 100%;"></div></td></tr>`;
    
    try {
        const data = await SmartMoveUtils.apiRequest('/api/drivers');
        renderDrivers(data);
    } catch (err) {
        SmartMoveUtils.renderErrorState(document.getElementById('tableContainer'), err.message);
    }
}

function renderDrivers(drivers) {
    const tbody = document.getElementById('driversBody');
    if (!drivers || drivers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-secondary); padding: 2rem;">No drivers registered yet.<br><br><button class="btn-primary" onclick="openFormModal()">Add Driver</button></td></tr>`;
        return;
    }

    tbody.innerHTML = drivers.map(d => {
        const statusClass = d.STATUS === 'Active' ? 'status-active' : d.STATUS === 'On Leave' ? 'status-leave' : 'status-resigned';
        const hireDate = SmartMoveUtils.formatDate(d.HIREDATE);
        
        return `
        <tr>
            <td>${d.DRIVERID}</td>
            <td>${SmartMoveUtils.escapeHtml(d.FIRSTNAME)} ${SmartMoveUtils.escapeHtml(d.LASTNAME)}</td>
            <td>${SmartMoveUtils.escapeHtml(d.LICENSENUMBER)}</td>
            <td>${SmartMoveUtils.escapeHtml(d.PHONE)}</td>
            <td>${hireDate}</td>
            <td><span class="status-pill ${statusClass}">${d.STATUS}</span></td>
            <td>
                <button class="action-btn btn-edit" onclick="editDriver('${d.DRIVERID}', '${SmartMoveUtils.escapeHtml(d.FIRSTNAME)}', '${SmartMoveUtils.escapeHtml(d.LASTNAME)}', '${SmartMoveUtils.escapeHtml(d.LICENSENUMBER)}', '${SmartMoveUtils.escapeHtml(d.PHONE)}', '${d.HIREDATE}', '${d.STATUS}')">Edit</button>
                <button class="action-btn btn-delete" onclick="promptDelete('${d.DRIVERID}', '${SmartMoveUtils.escapeHtml(d.FIRSTNAME)}')">Delete</button>
            </td>
        </tr>
    `}).join('');
}

window.openFormModal = function() {
    document.getElementById('formTitle').textContent = 'Register Driver';
    document.getElementById('submitBtn').textContent = 'Save Driver';
    document.getElementById('driverForm').reset();
    document.getElementById('driverId').value = '';
    SmartMoveUtils.openModal('driverModal');
}

window.editDriver = function(id, fName, lName, license, phone, hireDate, status) {
    document.getElementById('formTitle').textContent = 'Edit Driver';
    document.getElementById('submitBtn').textContent = 'Update Driver';
    
    document.getElementById('driverId').value = id;
    document.getElementById('firstName').value = fName;
    document.getElementById('lastName').value = lName;
    document.getElementById('licenseNumber').value = license;
    document.getElementById('phone').value = phone;
    document.getElementById('status').value = status;
    
    // Format date for <input type="date"> (YYYY-MM-DD)
    if (hireDate) {
        const d = new Date(hireDate);
        document.getElementById('hireDate').value = d.toISOString().split('T')[0];
    }
    
    SmartMoveUtils.openModal('driverModal');
}

async function handleDriverSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    
    const id = document.getElementById('driverId').value;
    const payload = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        licenseNumber: document.getElementById('licenseNumber').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        hireDate: document.getElementById('hireDate').value,
        status: document.getElementById('status').value
    };

    if (!SmartMoveUtils.validateRequired(payload.firstName) || !SmartMoveUtils.validateRequired(payload.lastName)) {
        return SmartMoveUtils.showToast('Name is required.', 'error');
    }
    if (!SmartMoveUtils.validatePhone(payload.phone)) {
        return SmartMoveUtils.showToast('Please enter a valid phone number.', 'error');
    }

    const originalText = btn.textContent;
    btn.textContent = id ? 'Updating...' : 'Registering...';
    btn.disabled = true;

    try {
        const url = id ? `/api/drivers/${id}` : '/api/drivers';
        const method = id ? 'PUT' : 'POST';
        
        await SmartMoveUtils.apiRequest(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        SmartMoveUtils.showToast(id ? 'Driver updated successfully!' : 'Driver registered successfully!');
        SmartMoveUtils.closeModal('driverModal');
        fetchDrivers();
    } catch (err) {
        SmartMoveUtils.showToast(err.message, 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

window.promptDelete = function(id, name) {
    currentDriverIdToDelete = id;
    document.getElementById('confirmText').innerHTML = `Are you sure you want to delete <strong>${name}</strong>?<br><br>This action may be restricted if the driver is referenced by existing trips.`;
    SmartMoveUtils.openModal('confirmModal');
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!currentDriverIdToDelete) return;
    
    const btn = document.getElementById('confirmDeleteBtn');
    btn.textContent = 'Deleting...';
    btn.disabled = true;
    
    try {
        await SmartMoveUtils.apiRequest(`/api/drivers/${currentDriverIdToDelete}`, { method: 'DELETE' });
        SmartMoveUtils.showToast('Driver deleted successfully.');
        SmartMoveUtils.closeModal('confirmModal');
        fetchDrivers();
    } catch (err) {
        SmartMoveUtils.showToast(err.message, 'error');
        SmartMoveUtils.closeModal('confirmModal'); // still close modal to let them see table
    } finally {
        btn.textContent = 'Delete Driver';
        btn.disabled = false;
        currentDriverIdToDelete = null;
    }
});
