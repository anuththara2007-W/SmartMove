document.addEventListener('DOMContentLoaded', () => {
    if (!SmartMoveUtils.setupAdminAuth()) return;

    const form = document.getElementById('announcementForm');
    const submitBtn = document.getElementById('submitBtn');

    function checkValidity() {
        const title = document.getElementById('annTitle').value.trim();
        const type = document.getElementById('annType').value;
        const message = document.getElementById('annMessage').value.trim();
        
        if (title && type && message) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    form.addEventListener('input', checkValidity);
    form.addEventListener('change', checkValidity);
    form.addEventListener('submit', handleAnnouncementSubmit);

    // Clear errors
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

async function handleAnnouncementSubmit(event) {
    event.preventDefault();
    
    const title = document.getElementById('annTitle').value.trim();
    const type = document.getElementById('annType').value;
    const message = document.getElementById('annMessage').value.trim();
    
    let isValid = true;
    
    if (!title) { showError('annTitle'); isValid = false; }
    if (!type) { showError('annType'); isValid = false; }
    if (!message) { showError('annMessage'); isValid = false; }
    
    if (!isValid) return;

    const submitButton = document.getElementById('submitBtn');

    try {
        submitButton.disabled = true;
        submitButton.textContent = 'Posting...';
        
        const response = await fetch('/api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, type, message })
        });
        
        if (!response.ok) {
            throw new Error('Failed to post announcement');
        }

        SmartMoveUtils.showToast('Success! The announcement has been posted to MongoDB.', 'success');
        document.getElementById('announcementForm').reset();
        submitButton.disabled = true;
        
    } catch (error) {
        console.error('Error:', error);
        SmartMoveUtils.showToast('Failed to post announcement.', 'error');
    } finally {
        submitButton.textContent = 'Post to Feed';
    }
}
