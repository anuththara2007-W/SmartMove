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

    fetchRoutes();

    document.getElementById('routeForm').addEventListener('submit', handleRouteSubmit);
});

let currentRouteIdToDelete = null;

async function fetchRoutes() {
    const tbody = document.getElementById('routesBody');
    tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton" style="height: 40px; width: 100%;"></div></td></tr>`;
    
    try {
        const data = await SmartMoveUtils.apiRequest('/api/routes');
        renderRoutes(data);
    } catch (err) {
        SmartMoveUtils.renderErrorState(document.getElementById('tableContainer'), err.message);
    }
}

function renderRoutes(routes) {
    const tbody = document.getElementById('routesBody');
    if (!routes || routes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-secondary); padding: 2rem;">No routes found.<br><br><button class="btn-primary" onclick="openFormModal()">Add Route</button></td></tr>`;
        return;
    }

    tbody.innerHTML = routes.map(r => {
        return `
        <tr>
            <td>${r.ROUTEID}</td>
            <td>${SmartMoveUtils.escapeHtml(r.STARTLOCATION)}</td>
            <td>${SmartMoveUtils.escapeHtml(r.ENDLOCATION)}</td>
            <td>${r.DISTANCEKM}</td>
            <td>${r.ESTIMATEDDURATION}</td>
            <td>
                <button class="action-btn btn-edit" onclick="editRoute('${r.ROUTEID}', '${SmartMoveUtils.escapeHtml(r.STARTLOCATION)}', '${SmartMoveUtils.escapeHtml(r.ENDLOCATION)}', '${r.DISTANCEKM}', '${r.ESTIMATEDDURATION}')">Edit</button>
                <button class="action-btn btn-delete" onclick="promptDelete('${r.ROUTEID}', '${SmartMoveUtils.escapeHtml(r.STARTLOCATION)} to ${SmartMoveUtils.escapeHtml(r.ENDLOCATION)}')">Delete</button>
            </td>
        </tr>
    `}).join('');
}

window.openFormModal = function() {
    document.getElementById('formTitle').textContent = 'Add Route';
    document.getElementById('submitBtn').textContent = 'Save Route';
    document.getElementById('routeForm').reset();
    document.getElementById('routeId').value = '';
    SmartMoveUtils.openModal('routeModal');
}

window.editRoute = function(id, startLoc, endLoc, dist, duration) {
    document.getElementById('formTitle').textContent = 'Edit Route';
    document.getElementById('submitBtn').textContent = 'Update Route';
    
    document.getElementById('routeId').value = id;
    document.getElementById('startLocation').value = startLoc;
    document.getElementById('endLocation').value = endLoc;
    document.getElementById('distanceKm').value = dist;
    document.getElementById('estimatedDuration').value = duration;
    
    SmartMoveUtils.openModal('routeModal');
}

async function handleRouteSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    
    const id = document.getElementById('routeId').value;
    const payload = {
        startLocation: document.getElementById('startLocation').value.trim(),
        endLocation: document.getElementById('endLocation').value.trim(),
        distanceKm: parseFloat(document.getElementById('distanceKm').value),
        estimatedDuration: parseFloat(document.getElementById('estimatedDuration').value)
    };

    if (!SmartMoveUtils.validateRequired(payload.startLocation) || !SmartMoveUtils.validateRequired(payload.endLocation)) {
        return SmartMoveUtils.showToast('Locations are required.', 'error');
    }
    if (isNaN(payload.distanceKm) || isNaN(payload.estimatedDuration)) {
        return SmartMoveUtils.showToast('Distance and Duration must be valid numbers.', 'error');
    }

    const originalText = btn.textContent;
    btn.textContent = id ? 'Updating...' : 'Saving...';
    btn.disabled = true;

    try {
        const url = id ? `/api/routes/${id}` : '/api/routes';
        const method = id ? 'PUT' : 'POST';
        
        await SmartMoveUtils.apiRequest(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        SmartMoveUtils.showToast(id ? 'Route updated successfully!' : 'Route added successfully!');
        SmartMoveUtils.closeModal('routeModal');
        fetchRoutes();
    } catch (err) {
        SmartMoveUtils.showToast(err.message, 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

window.promptDelete = function(id, name) {
    currentRouteIdToDelete = id;
    document.getElementById('confirmText').innerHTML = `Are you sure you want to delete route <strong>${name}</strong>?<br><br>This action may be restricted if trips are scheduled for this route.`;
    SmartMoveUtils.openModal('confirmModal');
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!currentRouteIdToDelete) return;
    
    const btn = document.getElementById('confirmDeleteBtn');
    btn.textContent = 'Deleting...';
    btn.disabled = true;
    
    try {
        await SmartMoveUtils.apiRequest(`/api/routes/${currentRouteIdToDelete}`, { method: 'DELETE' });
        SmartMoveUtils.showToast('Route deleted successfully.');
        SmartMoveUtils.closeModal('confirmModal');
        fetchRoutes();
    } catch (err) {
        SmartMoveUtils.showToast(err.message, 'error');
        SmartMoveUtils.closeModal('confirmModal');
    } finally {
        btn.textContent = 'Delete Route';
        btn.disabled = false;
        currentRouteIdToDelete = null;
    }
});
