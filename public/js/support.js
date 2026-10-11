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
