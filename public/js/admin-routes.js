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
    tbody.innerHTML = `<tr><td colspan="8"><div class="skeleton route-skeleton-bar"></div></td></tr>`;
    
    try {
        const [routes, images] = await Promise.all([
            SmartMoveUtils.apiRequest('/api/routes'),
            fetch('/api/images?type=route').then(r => r.ok ? r.json() : []).catch(() => [])
        ]);
        renderRoutes(routes, images);
    } catch (err) {
        SmartMoveUtils.renderErrorState(document.getElementById('tableContainer'), err.message);
    }
}

function renderRoutes(routes, images = []) {
    const tbody = document.getElementById('routesBody');
    if (!routes || routes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="route-empty-cell">No routes found.<br><br><button class="btn-primary" onclick="openFormModal()">Add Route</button></td></tr>`;
        return;
    }

    const fallbackDefault = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80';
    const adminDefaultImg = images.find(img => 
        (img.resourceType === 'route' || !img.resourceType) && 
        (Number(img.resourceId) === 0 || (img.caption && img.caption.toLowerCase().includes('default')))
    );
    const defaultRouteUrl = adminDefaultImg?.imageUrl || fallbackDefault;

    tbody.innerHTML = routes.map(r => {
        const isPop = r.ISPOPULAR === 'Y';
        const typeBadge = isPop 
            ? `<span class="route-badge-popular">★ Popular</span>`
            : `<span class="route-badge-custom">Custom Journey</span>`;
        
        // Find matching image or default
        const matched = images.find(img => 
            (img.resourceType === 'route' || !img.resourceType) && 
            (Number(img.resourceId) === Number(r.ROUTEID) || String(img.resourceId) === String(r.ROUTEID))
        );
        const imgUrl = matched?.imageUrl || defaultRouteUrl;
        const isCustomImg = !!matched?.imageUrl;

        const imgBadge = isCustomImg
            ? `<span title="Custom image configured in Media Management" class="route-img-indicator custom"></span>`
            : `<span title="Using default route image" class="route-img-indicator default"></span>`;

        return `
        <tr>
            <td><strong>#${r.ROUTEID}</strong></td>
            <td>
                <div class="route-img-wrap">
                    <img src="${imgUrl}" alt="Route #${r.ROUTEID}" class="route-table-thumbnail" onerror="this.src='${fallbackDefault}'">
                    ${imgBadge}
                </div>
            </td>
            <td>${SmartMoveUtils.escapeHtml(r.STARTLOCATION)}</td>
            <td>${SmartMoveUtils.escapeHtml(r.ENDLOCATION)}</td>
            <td>${r.DISTANCEKM}</td>
            <td>${r.ESTIMATEDDURATION}</td>
            <td>${typeBadge}</td>
            <td>
                <button class="action-btn btn-edit" onclick="editRoute('${r.ROUTEID}', '${SmartMoveUtils.escapeHtml(r.STARTLOCATION)}', '${SmartMoveUtils.escapeHtml(r.ENDLOCATION)}', '${r.DISTANCEKM}', '${r.ESTIMATEDDURATION}', '${r.ISPOPULAR || 'N'}')">Edit</button>
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
    const popCheckbox = document.getElementById('isPopular');
    if (popCheckbox) popCheckbox.checked = true; // Default admin routes to popular
    SmartMoveUtils.openModal('routeModal');
}

window.editRoute = function(id, startLoc, endLoc, dist, duration, isPopular) {
    document.getElementById('formTitle').textContent = 'Edit Route';
    document.getElementById('submitBtn').textContent = 'Update Route';
    
    document.getElementById('routeId').value = id;
    document.getElementById('startLocation').value = startLoc;
    document.getElementById('endLocation').value = endLoc;
    document.getElementById('distanceKm').value = dist;
    document.getElementById('estimatedDuration').value = duration;
    const popCheckbox = document.getElementById('isPopular');
    if (popCheckbox) popCheckbox.checked = (isPopular === 'Y');
    
    SmartMoveUtils.openModal('routeModal');
}

async function handleRouteSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    
    const id = document.getElementById('routeId').value;
    const popCheckbox = document.getElementById('isPopular');
    const payload = {
        startLocation: document.getElementById('startLocation').value.trim(),
        endLocation: document.getElementById('endLocation').value.trim(),
        distanceKm: parseFloat(document.getElementById('distanceKm').value),
        estimatedDuration: parseFloat(document.getElementById('estimatedDuration').value),
        isPopular: popCheckbox ? (popCheckbox.checked ? 'Y' : 'N') : 'Y'
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
