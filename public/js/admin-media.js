document.addEventListener('DOMContentLoaded', () => {
    if (!SmartMoveUtils.setupAdminAuth()) return;

    loadImages();

    document.getElementById('imageForm').addEventListener('submit', handleImageSubmit);
    
    // Listen for Resource Type changes
    document.getElementById('resourceType').addEventListener('change', handleResourceTypeChange);
});

async function handleResourceTypeChange(e) {
    const type = e.target.value;
    const idSelect = document.getElementById('resourceId');
    idSelect.innerHTML = '<option value="">Loading...</option>';
    idSelect.disabled = true;

    if (!type) {
        idSelect.innerHTML = '<option value="">Please select Resource Type first...</option>';
        return;
    }

    try {
        let endpoint = type === 'route' ? '/api/routes' : '/api/vehicles';
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch resources');
        const data = await response.json();
        
        idSelect.innerHTML = '<option value="">Select Resource...</option>';
        
        data.forEach(item => {
            if (type === 'route') {
                const id = Array.isArray(item) ? item[0] : (item.ROUTEID || item.routeId);
                const name = Array.isArray(item) ? `${item[1]} to ${item[2]}` : `${item.STARTLOCATION || ''} to ${item.ENDLOCATION || ''}`;
                idSelect.innerHTML += `<option value="${id}">Route #${id} - ${name}</option>`;
            } else {
                const id = Array.isArray(item) ? item[0] : (item.VEHICLEID || item.vehicleId);
                const reg = Array.isArray(item) ? item[1] : (item.REGNUMBER || item.regNumber);
                const vtype = Array.isArray(item) ? item[2] : (item.VEHICLETYPE || item.vehicleType);
                idSelect.innerHTML += `<option value="${id}">Vehicle #${id} - ${reg} (${vtype})</option>`;
            }
        });
        idSelect.disabled = false;
    } catch(err) {
        console.error(err);
        idSelect.innerHTML = '<option value="">Error loading resources</option>';
    }
}

async function loadImages() {
    const grid = document.getElementById('imagesGrid');
    
    try {
        const response = await fetch('/api/images');
        if (!response.ok) throw new Error('API Error');
        const images = await response.json();

        if (images.length === 0) {
            SmartMoveUtils.renderEmptyState(grid, 'No Images Found', 'Add image links for vehicles or routes.');
            return;
        }

        grid.innerHTML = '';
        images.forEach(img => {
            const card = document.createElement('div');
            card.className = 'image-card';
            
            const cap = img.caption ? `<p style="font-size: 0.9rem; font-style: italic; color: #555; margin-bottom: 0.5rem;">${img.caption}</p>` : '';
            
            card.innerHTML = `
                <img src="${img.imageUrl}" alt="${img.resourceType} ${img.resourceId}" onerror="this.src='https://via.placeholder.com/400x200?text=Invalid+Image+URL'">
                <div class="image-info">
                    <h4 style="font-size: 1rem; margin-bottom: 0.2rem; text-transform: capitalize;">${img.resourceType} #${img.resourceId}</h4>
                    ${cap}
                    <p style="font-size: 0.8rem; color: #888; margin-bottom: 0.8rem; word-break: break-all;">${img.imageUrl}</p>
                    <button class="delete-btn" onclick="deleteImage('${img._id}')">Delete</button>
                </div>
            `;
            grid.appendChild(card);
        });
        
    } catch (error) {
        console.error(error);
        SmartMoveUtils.renderErrorState(grid, 'Failed to fetch images from MongoDB.');
    }
}

async function handleImageSubmit(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button[type="submit"]');
    
    const resourceType = document.getElementById('resourceType').value;
    const resourceId = document.getElementById('resourceId').value;
    const imageUrl = document.getElementById('imageUrl').value;
    const caption = document.getElementById('caption').value;

    try {
        btn.disabled = true;
        btn.textContent = 'Saving...';
        
        const response = await fetch('/api/images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resourceType, resourceId, imageUrl, caption })
        });

        if (!response.ok) {
            throw new Error('Failed to save image link');
        }

        SmartMoveUtils.showToast('Image link saved to MongoDB successfully!', 'success');
        event.target.reset();
        SmartMoveUtils.closeModal('imageModal');
        loadImages();
        
    } catch (error) {
        console.error(error);
        SmartMoveUtils.showToast(error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Image Link';
    }
}

async function deleteImage(id) {
    if (!confirm('Are you sure you want to delete this image link?')) return;
    
    try {
        const response = await fetch(`/api/images/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete image');
        
        SmartMoveUtils.showToast('Image link deleted successfully.', 'success');
        loadImages();
        
    } catch (error) {
        console.error(error);
        SmartMoveUtils.showToast('Failed to delete image link.', 'error');
    }
}
