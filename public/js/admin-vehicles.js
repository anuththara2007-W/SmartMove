document.addEventListener('DOMContentLoaded', () => {
    if (!SmartMoveUtils.setupAdminAuth()) return;

    let editingVehicleId = null;

    fetchFleetData();

    const form = document.getElementById('addVehicleForm');
    if (form) {
        form.addEventListener('submit', handleAddOrUpdateVehicle);
    }
});

async function handleAddOrUpdateVehicle(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    
    const registrationNumber = document.getElementById('vehRegNum').value;
    const model = document.getElementById('vehModel').value;
    const capacity = document.getElementById('vehCapacity').value;
    const imageUrl = document.getElementById('vehImageUrl').value;
    
    if (!registrationNumber || !model || !capacity) return;
    
    try {
        btn.disabled = true;
        btn.textContent = window.editingVehicleId ? 'Updating...' : 'Adding...';
        
        const payload = { registrationNumber, model, capacity: parseInt(capacity), status: 'Active' };
        let vehicleId = window.editingVehicleId;

        if (window.editingVehicleId) {
            // Update in Oracle
            const oracleRes = await fetch(`/api/vehicles/${window.editingVehicleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!oracleRes.ok) throw new Error('Failed to update vehicle in Oracle');
            SmartMoveUtils.showToast(`Vehicle #${vehicleId} updated successfully!`, 'success');
        } else {
            // Create in Oracle
            const oracleRes = await fetch('/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!oracleRes.ok) throw new Error('Failed to create vehicle in Oracle');
            const oracleData = await oracleRes.json();
            vehicleId = oracleData.vehicleId;
            SmartMoveUtils.showToast(`Vehicle #${vehicleId} added successfully!`, 'success');
        }
        
        // Add Document to MongoDB (always upserts if we pass vehicleID)
        if (imageUrl) {
            await fetch('/api/vehicles/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vehicleID: vehicleId, imageUrl })
            });
        }
        
        e.target.reset();
        window.editingVehicleId = null;
        btn.textContent = 'Add Vehicle';
        fetchFleetData();
        
    } catch (error) {
        console.error('Add Vehicle Error:', error);
        SmartMoveUtils.showToast(error.message || 'Failed to add vehicle', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Vehicle';
    }
}

async function fetchFleetData() {
    const grid = document.getElementById('fleetGrid');
    
    try {
        const [vehiclesRes, docsRes] = await Promise.all([
            fetch('/api/vehicles'),
            fetch('/api/vehicles/documents')
        ]);
        
        if (!vehiclesRes.ok) throw new Error('Failed to fetch Oracle vehicles');
        
        const vehicles = await vehiclesRes.json();
        let docs = [];
        if (docsRes.ok) docs = await docsRes.json();
        
        if (!vehicles || vehicles.length === 0) {
            SmartMoveUtils.renderEmptyState(grid, 'No Fleet Data', 'Database is empty.');
            return;
        }

        renderFleet(grid, vehicles, docs);

    } catch (error) {
        console.error('Admin Error:', error);
        SmartMoveUtils.renderErrorState(grid, 'Failed to fetch vehicles.');
    }
}

function renderFleet(gridElement, vehiclesList, docsList) {
    gridElement.innerHTML = '';
    
    vehiclesList.forEach(v => {
        const id = Array.isArray(v) ? v[0] : (v.VEHICLEID || v.vehicleId);
        const reg = Array.isArray(v) ? v[1] : (v.REGNUMBER || v.regNumber);
        const type = Array.isArray(v) ? v[2] : (v.VEHICLETYPE || v.vehicleType);
        const capacity = Array.isArray(v) ? v[3] : (v.CAPACITY || v.capacity);
        const status = Array.isArray(v) ? v[4] : (v.STATUS || v.status);

        const card = document.createElement('div');
        card.className = 'fleet-card';
        card.style.position = 'relative';
        
        const matchedDoc = docsList.find(doc => doc.vehicleID == id);
        const imageUrl = (matchedDoc && matchedDoc.imageUrls && matchedDoc.imageUrls.length > 0) ? matchedDoc.imageUrls[0] : '';
        const imgHtml = imageUrl ? `<img src="${imageUrl}" alt="Vehicle ${id}" class="fleet-img" onerror="this.style.display='none'">` : `<div style="height: 150px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; color: #94a3b8;">No Image</div>`;
        const docsCount = matchedDoc && matchedDoc.pdfDocumentPaths ? matchedDoc.pdfDocumentPaths.length : 0;
        
        card.innerHTML = `
            ${imgHtml}
            <div class="fleet-info">
                <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">Vehicle #${id}</h3>
                <p style="margin-bottom: 0.2rem; font-size: 0.9rem;"><strong>Reg:</strong> ${reg} | <strong>Type:</strong> ${type}</p>
                <p style="margin-bottom: 1rem; font-size: 0.9rem;">
                    Status: <span style="color: ${status === 'Active' ? '#16a34a' : '#f59e0b'}; font-weight: 600;">${status}</span>
                </p>
                <div style="background: #f1f5f9; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem;">
                    <strong style="font-size: 0.85rem;">Stored Documents:</strong>
                    <span style="float: right; background: #e2e8f0; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">
                        ${docsCount} PDFs
                    </span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-primary edit-btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; flex: 1;">Edit</button>
                    <button class="btn-transparent delete-btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; flex: 1; border: 1px solid var(--error-color); color: var(--error-color);">Delete</button>
                </div>
            </div>
        `;
        
        card.querySelector('.edit-btn').addEventListener('click', () => {
            window.editingVehicleId = id;
            document.getElementById('vehRegNum').value = reg;
            document.getElementById('vehModel').value = type;
            document.getElementById('vehCapacity').value = capacity;
            document.getElementById('vehImageUrl').value = imageUrl;
            
            const btn = document.getElementById('addVehicleForm').querySelector('button[type="submit"]');
            btn.textContent = 'Update Vehicle';
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        card.querySelector('.delete-btn').addEventListener('click', async () => {
            if (confirm(`Are you sure you want to delete Vehicle #${id}?`)) {
                try {
                    const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete');
                    SmartMoveUtils.showToast(`Vehicle #${id} deleted!`, 'success');
                    fetchFleetData();
                } catch(e) {
                    SmartMoveUtils.showToast(e.message, 'error');
                }
            }
        });

        gridElement.appendChild(card);
    });
}
