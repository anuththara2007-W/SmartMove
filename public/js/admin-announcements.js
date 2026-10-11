let allAnnouncements = [];
let announcementIdToDelete = null;
window.editingAnnouncementId = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!SmartMoveUtils.setupAdminAuth()) return;

    loadAnnouncements();

    const form = document.getElementById('announcementForm');
    form.addEventListener('submit', handleAnnouncementSubmit);

    document.getElementById('cancelEditBtn')?.addEventListener('click', cancelEditing);
    document.getElementById('refreshAnnBtn')?.addEventListener('click', loadAnnouncements);
    
    // Search filter
    document.getElementById('annSearchInput')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderAnnouncements(allAnnouncements);
            return;
        }
        const filtered = allAnnouncements.filter(a => 
            (a.title && a.title.toLowerCase().includes(query)) ||
            (a.message && a.message.toLowerCase().includes(query)) ||
            (a.type && a.type.toLowerCase().includes(query))
        );
        renderAnnouncements(filtered);
    });

    // Setup delete modal handlers
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => {
        document.getElementById('confirmDeleteModal').style.display = 'none';
        announcementIdToDelete = null;
    });

    document.getElementById('confirmDeleteBtn')?.addEventListener('click', handleConfirmDelete);

    // Clear input errors on typing
    const inputs = form.querySelectorAll('.check-valid');
    inputs.forEach(input => {
        input.addEventListener('input', function () {
            this.classList.remove('invalid');
            const errorElement = document.getElementById(`error-${this.id}`);
            if (errorElement) {
                errorElement.style.opacity = '0';
                setTimeout(() => errorElement.style.display = 'none', 300);
            }
        });
    });
});

async function loadAnnouncements() {
    const listContainer = document.getElementById('announcementsList');
    const totalCountEl = document.getElementById('annTotalCount');

    try {
        const response = await fetch('/api/announcements?all=true');
        if (!response.ok) throw new Error('Failed to fetch announcements');
        
        allAnnouncements = await response.json();
        
        if (totalCountEl) totalCountEl.textContent = allAnnouncements.length;
        renderAnnouncements(allAnnouncements);

    } catch (error) {
        console.error('Error fetching announcements:', error);
        SmartMoveUtils.renderErrorState(listContainer, 'Failed to connect to MongoDB announcements.');
    }
}

function renderAnnouncements(items) {
    const listContainer = document.getElementById('announcementsList');
    listContainer.innerHTML = '';

    if (!items || items.length === 0) {
        listContainer.innerHTML = `
            <div class="glass-panel" style="padding: 3rem; text-align: center; color: #64748b;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1rem; color: #94a3b8;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <h4 style="font-size: 1.1rem; color: #1e293b; margin-bottom: 0.35rem;">No Announcements Found</h4>
                <p style="font-size: 0.9rem; margin: 0;">Create a new announcement using the form to publish live updates.</p>
            </div>
        `;
        return;
    }

    items.forEach(ann => {
        const card = document.createElement('div');
        card.className = 'ann-card-item';
        card.id = `ann-card-${ann._id}`;

        const type = ann.type || 'info';
        const isActive = ann.active !== false;

        let typeIcon = '';
        if (type === 'warning') {
            typeIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
        } else if (type === 'alert') {
            typeIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        } else {
            typeIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }

        const dateStr = ann.createdAt ? SmartMoveUtils.formatDate(ann.createdAt) : 'Recently';

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span class="ann-badge ${type}">
                        ${typeIcon}
                        ${type}
                    </span>
                    <span class="ann-status-pill ${isActive ? 'active' : 'inactive'}">
                        ${isActive ? '🟢 Active' : '⚪ Hidden Draft'}
                    </span>
                </div>
                <small style="color: #94a3b8; font-size: 0.78rem; font-weight: 500;">
                    ${dateStr}
                </small>
            </div>

            <h3 style="font-size: 1.15rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem; line-height: 1.35;">${ann.title}</h3>
            <p style="font-size: 0.9rem; color: #475569; line-height: 1.55; margin: 0;">${ann.message}</p>

            <div class="ann-actions-bar">
                <button type="button" class="btn-edit-ann" data-id="${ann._id}" style="padding: 0.45rem 1rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600; background: #f8fafc; border: 1px solid #cbd5e1; color: #1e293b; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Edit
                </button>
                <button type="button" class="btn-delete-ann" data-id="${ann._id}" data-title="${encodeURIComponent(ann.title)}" style="padding: 0.45rem 1rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600; background: #fff1f2; border: 1px solid #fecdd3; color: #e11d48; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Delete
                </button>
            </div>
        `;

        // Wire Edit button
        card.querySelector('.btn-edit-ann').addEventListener('click', () => startEditAnnouncement(ann._id));

        // Wire Delete button
        card.querySelector('.btn-delete-ann').addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const title = decodeURIComponent(e.currentTarget.getAttribute('data-title'));
            promptDeleteAnnouncement(id, title);
        });

        listContainer.appendChild(card);
    });
}

function startEditAnnouncement(id) {
    const ann = allAnnouncements.find(a => a._id === id);
    if (!ann) return;

    window.editingAnnouncementId = id;

    document.getElementById('annTitle').value = ann.title || '';
    document.getElementById('annType').value = ann.type || 'info';
    document.getElementById('annStatus').value = ann.active !== false ? 'true' : 'false';
    document.getElementById('annMessage').value = ann.message || '';

    document.getElementById('formHeading').textContent = 'Edit Announcement';
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.textContent = 'Save Changes';
    submitBtn.disabled = false;

    document.getElementById('editingBadge').style.display = 'inline-block';
    document.getElementById('cancelEditBtn').style.display = 'block';

    // Scroll to form smoothly
    document.getElementById('announcementForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('annTitle').focus();
}

function cancelEditing() {
    window.editingAnnouncementId = null;
    document.getElementById('announcementForm').reset();
    document.getElementById('formHeading').textContent = 'New Announcement';
    document.getElementById('submitBtn').textContent = 'Post to Feed';
    document.getElementById('editingBadge').style.display = 'none';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

function promptDeleteAnnouncement(id, title) {
    announcementIdToDelete = id;
    const msgEl = document.getElementById('deleteModalMessage');
    if (msgEl) {
        msgEl.textContent = `Are you sure you want to delete "${title}" from MongoDB? It will be removed from all live feeds.`;
    }
    const modal = document.getElementById('confirmDeleteModal');
    modal.style.display = 'flex';
}

async function handleConfirmDelete() {
    if (!announcementIdToDelete) return;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Deleting...';

        const response = await fetch(`/api/announcements/${announcementIdToDelete}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to delete announcement');
        }

        SmartMoveUtils.showToast('Announcement removed from MongoDB successfully!', 'success');
        document.getElementById('confirmDeleteModal').style.display = 'none';

        if (window.editingAnnouncementId === announcementIdToDelete) {
            cancelEditing();
        }

        announcementIdToDelete = null;
        await loadAnnouncements();

    } catch (error) {
        console.error('Delete error:', error);
        SmartMoveUtils.showToast(error.message || 'Failed to delete announcement.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Delete';
    }
}

async function handleAnnouncementSubmit(event) {
    event.preventDefault();

    const title = document.getElementById('annTitle').value.trim();
    const type = document.getElementById('annType').value;
    const active = document.getElementById('annStatus').value === 'true';
    const message = document.getElementById('annMessage').value.trim();

    let isValid = true;
    if (!title) { showError('annTitle'); isValid = false; }
    if (!type) { showError('annType'); isValid = false; }
    if (!message) { showError('annMessage'); isValid = false; }

    if (!isValid) return;

    const submitButton = document.getElementById('submitBtn');

    try {
        submitButton.disabled = true;
        submitButton.textContent = window.editingAnnouncementId ? 'Saving...' : 'Posting...';

        let url = '/api/announcements';
        let method = 'POST';

        if (window.editingAnnouncementId) {
            url = `/api/announcements/${window.editingAnnouncementId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, type, message, active })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to save announcement');
        }

        if (window.editingAnnouncementId) {
            SmartMoveUtils.showToast('Announcement updated successfully in MongoDB!', 'success');
            cancelEditing();
        } else {
            SmartMoveUtils.showToast('New announcement posted to MongoDB feed!', 'success');
            document.getElementById('announcementForm').reset();
        }

        await loadAnnouncements();

    } catch (error) {
        console.error('Error:', error);
        SmartMoveUtils.showToast(error.message || 'Failed to save announcement.', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = window.editingAnnouncementId ? 'Save Changes' : 'Post to Feed';
    }
}

function showError(inputId) {
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(`error-${inputId}`);
    if (input && errorElement) {
        input.classList.add('invalid');
        errorElement.style.display = 'block';
        void errorElement.offsetWidth;
        errorElement.style.opacity = '1';
    }
}
