// Global Utility Functions for SmartMove

// 1. Toast Notification System
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon based on type
    const icon = type === 'success' 
        ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

    toast.innerHTML = `
        <div style="color: var(--${type}-color)">${icon}</div>
        <div style="font-size: 0.95rem; font-weight: 500;">${message}</div>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after 3.5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 400); // match transition duration
    }, 3500);
}

// 2. Data Formatting Utilities
function formatCurrency(amount) {
    const formatted = new Intl.NumberFormat('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
    return 'Rs. ' + formatted;
}

function formatDate(dateString) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
}

// 3. Graceful Empty States & Error Boundaries
function renderEmptyState(container, title, message) {
    container.innerHTML = `
        <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">${title}</h3>
            <p>${message}</p>
        </div>
    `;
}

function renderErrorState(container, message = 'Connection Lost - Retrying...') {
    container.innerHTML = `
        <div class="empty-state" style="color: var(--error-color);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.8; color: var(--error-color);">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Network Error</h3>
            <p>${message}</p>
        </div>
    `;
}

// 4. Modal Handlers
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// 5. API Request Wrapper
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, options);
        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }

        if (!response.ok) {
            let errorMsg = data?.error || data?.message || 'Request failed';
            
            // Map Oracle Foreign Key / Unique constraint common errors if returned in raw form
            if (errorMsg.includes('ORA-02292')) {
                errorMsg = 'Cannot delete: This record is referenced by other operations (e.g. trips, tickets).';
            } else if (errorMsg.includes('ORA-00001')) {
                errorMsg = 'Duplicate record exists (e.g. same email or license).';
            }
            
            throw new Error(errorMsg);
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// 6. Form Validation Helpers
function validateRequired(value) {
    return value !== null && value !== undefined && value.toString().trim() !== '';
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[\d\+\-\s]{9,15}$/;
    return re.test(phone);
}

function validateDateRange(start, end) {
    if (!start || !end) return false;
    return new Date(end) > new Date(start);
}

// 7. Date Time Formatting
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    const d = new Date(dateTimeString);
    const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return d.toLocaleDateString('en-GB', options);
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Global Event Listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const activeModals = document.querySelectorAll('.modal-overlay.active');
        activeModals.forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

let lastScrollY = window.scrollY;
window.addEventListener('scroll', () => {
    const stdHeader = document.querySelector('.standard-header');
    const heroHeader = document.querySelector('.hero-header');
    
    if (stdHeader) {
        if (window.scrollY > lastScrollY && window.scrollY > 100) {
            stdHeader.style.transform = 'translate(-50%, -150%)';
            stdHeader.style.transition = 'transform 0.3s ease';
        } else {
            stdHeader.style.transform = 'translate(-50%, 0)';
            stdHeader.style.transition = 'transform 0.3s ease';
        }
    }
    
    if (heroHeader) {
        if (window.scrollY > lastScrollY && window.scrollY > 100) {
            heroHeader.style.transform = 'translateY(-150%)';
            heroHeader.style.transition = 'transform 0.3s ease';
        } else {
            heroHeader.style.transform = 'translateY(0)';
            heroHeader.style.transition = 'transform 0.3s ease';
        }
    }
    lastScrollY = window.scrollY;
});

// Global exposure

// 8. Admin Authentication
function setupAdminAuth() {
    if (sessionStorage.getItem('smartmove_admin_token') !== 'true') {
        window.location.href = 'login.html';
        return false;
    }
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('smartmove_admin_token');
            window.location.href = 'login.html';
        });
    }
    return true;
}

window.SmartMoveUtils = {
    setupAdminAuth,
    showToast,
    formatCurrency,
    formatDate,
    renderEmptyState,
    renderErrorState,
    openModal,
    closeModal,
    apiRequest,
    validateRequired,
    validateEmail,
    validatePhone,
    validateDateRange,
    formatDateTime,
    escapeHtml
};
