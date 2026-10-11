// SmartMove - Help & Support Page Script

document.addEventListener('DOMContentLoaded', () => {
    initSupportPage();
});

function initSupportPage() {
    setupLenisScroll();
    setupFaqAccordion();
    setupFaqFilters();
    setupFaqSearch();
}

// --- Smooth Scroll (Lenis) ---
function setupLenisScroll() {
    if (typeof Lenis !== 'undefined') {
        const lenis = new Lenis({ lerp: 0.08, smooth: true });
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }
}

// --- FAQ Accordion ---
function setupFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const btn = item.querySelector('.faq-question-btn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const isOpen = item.classList.contains('active');

            // Close all
            faqItems.forEach(i => {
                i.classList.remove('active');
                i.querySelector('.faq-question-btn')?.setAttribute('aria-expanded', 'false');
            });

            // Open clicked (if it wasn't open)
            if (!isOpen) {
                item.classList.add('active');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

// --- FAQ Category Filter Chips ---
function setupFaqFilters() {
    const chips    = document.querySelectorAll('.faq-chip');
    const faqItems = document.querySelectorAll('.faq-item');

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const cat = chip.dataset.category;

            faqItems.forEach(item => {
                if (cat === 'all' || item.dataset.category === cat) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                    item.classList.remove('active');
                }
            });

            checkFaqEmpty();
        });
    });
}

// --- FAQ Search ---
function setupFaqSearch() {
    const searchInput = document.getElementById('faqSearchInput');
    const clearBtn    = document.getElementById('searchClearBtn');
    const faqItems    = document.querySelectorAll('.faq-item');

    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();

        clearBtn.style.display = query ? 'block' : 'none';

        if (!query) {
            // Reset: show all visible per current filter
            const activeChip = document.querySelector('.faq-chip.active');
            const cat        = activeChip?.dataset.category || 'all';
            faqItems.forEach(item => {
                item.style.display = (cat === 'all' || item.dataset.category === cat) ? '' : 'none';
            });
            checkFaqEmpty();
            return;
        }

        // Search within question text and answer text
        faqItems.forEach(item => {
            const questionText = item.querySelector('.faq-question-btn')?.textContent.toLowerCase() || '';
            const answerText   = item.querySelector('.faq-answer-body')?.textContent.toLowerCase() || '';
            const match        = questionText.includes(query) || answerText.includes(query);
            item.style.display = match ? '' : 'none';
        });

        checkFaqEmpty();
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.focus();
    });
}

function checkFaqEmpty() {
    const faqItems   = document.querySelectorAll('.faq-item');
    const emptyState = document.getElementById('faqEmptyState');
    const visible    = [...faqItems].filter(i => i.style.display !== 'none');

    if (emptyState) {
        emptyState.style.display = visible.length === 0 ? 'block' : 'none';
    }
}
