// Seawater.io Website JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    initSmoothScrolling();
    
    // Waitlist form handling
    initWaitlistForm();
    
    // Demo interactions
    initDemoFeatures();
    
    // CTA button interactions
    initCTAButtons();
    
    // Scroll animations
    initScrollAnimations();
});

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Waitlist form handling
function initWaitlistForm() {
    const waitlistForms = document.querySelectorAll('.waitlist-form');
    
    waitlistForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = form.querySelector('input[type="email"]').value;
            const userType = form.querySelector('select').value;
            
            if (!email || !userType) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            // Simulate form submission
            showNotification('Thanks for joining our waitlist! We\'ll be in touch soon.', 'success');
            
            // Reset form
            form.reset();
            
            // In a real implementation, you would send this data to your backend
            console.log('Waitlist signup:', { email, userType });
        });
    });
}

// Demo features
function initDemoFeatures() {
    const demoSearch = document.querySelector('.demo-search');
    const addressInput = document.querySelector('.address-input');
    const searchButton = document.querySelector('.search-button');
    
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const address = addressInput.value.trim();
            
            if (!address) {
                showNotification('Please enter an address', 'error');
                return;
            }
            
            // Simulate loading state
            searchButton.textContent = 'Analyzing...';
            searchButton.disabled = true;
            
            setTimeout(() => {
                showNotification('Demo coming soon! Join our waitlist to be notified when we launch.', 'info');
                searchButton.textContent = 'Analyze Risk';
                searchButton.disabled = false;
            }, 2000);
        });
    }
    
    // Address input enter key support
    if (addressInput) {
        addressInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });
    }
}

// CTA button interactions
function initCTAButtons() {
    const ctaButtons = document.querySelectorAll('.cta-button, .cta-primary, .pricing-cta');
    
    ctaButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.textContent.includes('Waitlist') || this.textContent.includes('Early Access')) {
                // Scroll to waitlist signup
                const waitlistSection = document.querySelector('.waitlist-signup');
                if (waitlistSection) {
                    waitlistSection.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'center'
                    });
                    
                    // Focus on email input after scrolling
                    setTimeout(() => {
                        const emailInput = waitlistSection.querySelector('input[type="email"]');
                        if (emailInput) emailInput.focus();
                    }, 1000);
                }
            }
        });
    });
    
    // Watch Demo button
    const watchDemoButton = document.querySelector('.cta-secondary');
    if (watchDemoButton) {
        watchDemoButton.addEventListener('click', function() {
            const demoSection = document.querySelector('#demo');
            if (demoSection) {
                demoSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        });
    }
}

// Scroll animations
function initScrollAnimations() {
    // Intersection Observer for fade-in animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.feature, .use-case, .pricing-card, .stat');
    animateElements.forEach(el => observer.observe(el));
    
    // Header background on scroll
    const header = document.querySelector('.header');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add/remove header background based on scroll position
        if (scrollTop > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScrollTop = scrollTop;
    });
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1);
        z-index: 1001;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 400px;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Close button functionality
    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
        closeNotification(notification);
    });
    
    // Auto-close after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            closeNotification(notification);
        }
    }, 5000);
}

function closeNotification(notification) {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.remove();
        }
    }, 300);
}

function getNotificationIcon(type) {
    const icons = {
        success: '✓',
        error: '✗',
        info: 'ℹ',
        warning: '⚠'
    };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = {
        success: '#059669',
        error: '#dc2626',
        info: '#0891b2',
        warning: '#d97706'
    };
    return colors[type] || colors.info;
}

// Risk score animation for mockup
function animateRiskScores() {
    const riskScores = document.querySelectorAll('.risk-score');
    
    riskScores.forEach((score, index) => {
        setTimeout(() => {
            score.style.opacity = '0';
            score.style.transform = 'scale(1.2)';
            
            setTimeout(() => {
                score.style.opacity = '1';
                score.style.transform = 'scale(1)';
                score.style.transition = 'all 0.3s ease';
            }, 100);
        }, index * 200);
    });
}

// Initialize risk score animation when mockup is visible
function initMockupAnimations() {
    const mockup = document.querySelector('.mockup-container');
    
    if (mockup) {
        const mockupObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(animateRiskScores, 1000);
                    mockupObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        mockupObserver.observe(mockup);
    }
}

// Initialize mockup animations
document.addEventListener('DOMContentLoaded', initMockupAnimations);

// Add CSS for additional animations
const additionalStyles = `
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        margin-left: auto;
        opacity: 0.8;
        transition: opacity 0.2s;
    }
    
    .notification-close:hover {
        opacity: 1;
    }
    
    .header.scrolled {
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    
    .animate-in {
        animation: fadeInUp 0.6s ease-out;
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    
    .risk-score:hover {
        animation: pulse 0.6s ease-in-out;
    }
    
    .zone {
        transition: opacity 0.3s ease;
    }
    
    .zone:hover {
        opacity: 0.9;
        cursor: pointer;
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Add some interactive behaviors for the map mockup
document.addEventListener('DOMContentLoaded', function() {
    const zones = document.querySelectorAll('.zone');
    const propertyMarker = document.querySelector('.property-marker');
    
    zones.forEach(zone => {
        zone.addEventListener('mouseenter', function() {
            this.style.opacity = '0.9';
            this.style.transform = 'scale(1.02)';
            this.style.transition = 'all 0.2s ease';
        });
        
        zone.addEventListener('mouseleave', function() {
            this.style.opacity = '0.7';
            this.style.transform = 'scale(1)';
        });
        
        zone.addEventListener('click', function() {
            const riskLevel = this.classList.contains('high-risk') ? 'High' : 
                            this.classList.contains('medium-risk') ? 'Medium' : 'Low';
            showNotification(`${riskLevel} risk zone selected. Full interactive mapping coming soon!`, 'info');
        });
    });
    
    if (propertyMarker) {
        propertyMarker.addEventListener('click', function() {
            showNotification('Property selected! Detailed risk analysis coming soon.', 'info');
        });
    }
});

// Easter egg: Konami code
let konamiCode = [];
const konamiSequence = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑↑↓↓←→←→BA

document.addEventListener('keydown', function(e) {
    konamiCode.push(e.keyCode);
    
    if (konamiCode.length > konamiSequence.length) {
        konamiCode.shift();
    }
    
    if (konamiCode.length === konamiSequence.length) {
        if (konamiCode.every((code, index) => code === konamiSequence[index])) {
            showNotification('🌊 Climate ninja mode activated! You found the easter egg!', 'success');
            document.body.style.filter = 'hue-rotate(180deg)';
            setTimeout(() => {
                document.body.style.filter = 'none';
            }, 3000);
        }
    }
});
