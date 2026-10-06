document.addEventListener('DOMContentLoaded', () => {

    fetchRecentReviews();
    
    const reviewForm = document.getElementById('reviewForm');
    reviewForm.addEventListener('submit', handleReviewSubmit);
    
    const submitBtn = document.getElementById('submitBtn');

    // Real-time validation
    function checkValidity() {
        const pId = document.getElementById('reviewPassengerId').value;
        const rId = document.getElementById('reviewRouteId').value;
        const text = document.getElementById('reviewText').value.trim();
        
        if (pId && rId && text) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    // Attach to hidden inputs change
    const observer = new MutationObserver(checkValidity);
    observer.observe(document.getElementById('reviewPassengerId'), { attributes: true, attributeFilter: ['value'] });
    observer.observe(document.getElementById('reviewRouteId'), { attributes: true, attributeFilter: ['value'] });

    reviewForm.addEventListener('input', checkValidity);

    // Clear errors on input
    const inputs = reviewForm.querySelectorAll('.check-valid');
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

async function handleReviewSubmit(event) {
    event.preventDefault();
    
    const passengerId = document.getElementById('reviewPassengerId').value;
    const routeId = document.getElementById('reviewRouteId').value;
    const driverElement = document.getElementById('reviewDriverId');
    const driverId = driverElement ? driverElement.value : null;
    const rating = document.getElementById('reviewRating').value;
    const feedback = document.getElementById('reviewText').value.trim();
    
    let isValid = true;

    if (!passengerId || isNaN(passengerId) || Number(passengerId) <= 0) { showError('reviewPassengerId'); isValid = false; }
    if (!routeId || isNaN(routeId) || Number(routeId) <= 0) { showError('reviewRouteId'); isValid = false; }
    if (!feedback) { showError('reviewText'); isValid = false; }

    if (!isValid) return;

    const submitBtn = document.getElementById('submitBtn');

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        
        const response = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                passengerId: parseInt(passengerId, 10),
                routeId: parseInt(routeId, 10),
                driverId: parseInt(driverId || 999, 10),
                rating: parseInt(rating, 10),
                feedbackText: feedback
            })
        });

        if (!response.ok) throw new Error('Failed to submit review.');

        SmartMoveUtils.showToast('Thank you! Your feedback has been saved to MongoDB.', 'success');
        
        document.getElementById('reviewForm').reset();
        submitBtn.disabled = true;
        
        fetchRecentReviews();
        
    } catch (error) {
        console.error('Review Error:', error);
        SmartMoveUtils.showToast(error.message || 'An error occurred. Please try again.', 'error');
    } finally {
        submitBtn.textContent = 'Submit Review';
    }
}

async function fetchRecentReviews() {
    const feed = document.getElementById('reviewsFeed');
    
    try {
        const response = await fetch('/api/reviews'); // Fetch all reviews
        if (!response.ok) throw new Error('Network response was not ok');
        
        const reviews = await response.json();
        
        if (!reviews || reviews.length === 0) {
            SmartMoveUtils.renderEmptyState(feed, 'No Reviews Found', 'Be the first to share your experience.');
            return;
        }

        feed.innerHTML = '';
        
        reviews.forEach((review) => {
            const card = document.createElement('div');
            card.className = 'masonry-item review-card';
            
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            
            card.innerHTML = `
                <div class="stars">${stars}</div>
                <p style="font-weight: 500; margin-bottom: 0.5rem; color: var(--text-main); font-size: 0.95rem;">
                    " ${review.feedbackText} "
                </p>
                <small style="color: var(--text-secondary); font-size: 0.8rem;">
                    Passenger #${review.passengerId} • Route #${review.routeId} <br>
                    ${SmartMoveUtils.formatDate(review.createdAt)}
                </small>
            `;
            
            feed.appendChild(card);
        });

    } catch (error) {
        console.error('Reviews Error:', error);
        SmartMoveUtils.renderErrorState(feed, 'Unable to load reviews from MongoDB.');
    }
}

// --- MODAL LOGIC ---
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
        renderModalTable(body, routes, ['ID', 'Start Location', 'End Location'], ['ROUTEID', 'STARTLOCATION', 'ENDLOCATION'], selectRoute);
    } catch (e) {
        SmartMoveUtils.renderErrorState(body, 'Failed to fetch routes.');
    }
}

function renderModalTable(container, data, headers, keys, clickHandler) {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '1rem';
    
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>${headers.map(h => `<th style="text-align: left; padding: 0.75rem; border-bottom: 1px solid var(--border-color); color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">${h}</th>`).join('')}</tr>`;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.style.transition = 'background 0.2s ease';
        tr.onmouseenter = () => tr.style.background = '#f1f5f9';
        tr.onmouseleave = () => tr.style.background = 'transparent';
        
        tr.innerHTML = keys.map(k => `<td style="padding: 1rem 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.95rem;">${row[k] || 'N/A'}</td>`).join('');
        
        tr.setAttribute('data-row', JSON.stringify(row));
        tr.addEventListener('click', function() {
            const rowData = JSON.parse(this.getAttribute('data-row'));
            clickHandler(rowData);
        });
        
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    
    container.innerHTML = '';
    container.appendChild(table);
}

window.selectPassenger = function(passenger) {
    const pid = passenger.PASSENGERID || passenger.id;
    const name = passenger.FIRSTNAME ? `${passenger.FIRSTNAME} ${passenger.LASTNAME}` : passenger.name;
    const email = passenger.EMAIL || passenger.email;
    document.getElementById('passengerDisplay').value = `${name} (${email})`;
    const hidden = document.getElementById('reviewPassengerId');
    hidden.value = pid;
    hidden.dispatchEvent(new Event('input', { bubbles: true })); // trigger validation
    SmartMoveUtils.closeModal('passengerModal');
    SmartMoveUtils.showToast(`Selected ${name}`, 'success');
}

window.selectRoute = function(route) {
    const rid = route.ROUTEID || route.ID;
    const name = route.STARTLOCATION ? `${route.STARTLOCATION} to ${route.ENDLOCATION}` : (route.ROUTENAME || route.NAME || `Route ${rid}`);
    document.getElementById('routeDisplay').value = name;
    const hidden = document.getElementById('reviewRouteId');
    hidden.value = rid;
    hidden.dispatchEvent(new Event('input', { bubbles: true })); // trigger validation
    SmartMoveUtils.closeModal('routeModal');
    SmartMoveUtils.showToast(`Selected Route`, 'success');
}

document.addEventListener('DOMContentLoaded', () => {
    setupPassengerModal();
    setupRouteModal();
});
