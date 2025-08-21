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
    
    // Modal functionality
    initModalFunctionality();
    
    // Pricing toggle
    initPricingToggle();
    
    // Scroll animations
    initScrollAnimations();
});

// Modal functionality
function openWaitlistModal() {
    const modal = document.getElementById('waitlistModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Focus on email input
        setTimeout(() => {
            const emailInput = modal.querySelector('input[type="email"]');
            if (emailInput) emailInput.focus();
        }, 300);
    }
}

function closeWaitlistModal() {
    const modal = document.getElementById('waitlistModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function initModalFunctionality() {
    const modal = document.getElementById('waitlistModal');
    
    if (modal) {
        // Close modal when clicking outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeWaitlistModal();
            }
        });
        
        // Close modal with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeWaitlistModal();
            }
        });
    }
}

// Submit waitlist form
function submitWaitlist(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.querySelector('#email').value;
    const userType = form.querySelector('#userType').value;
    const notifications = form.querySelector('#notifications').checked;
    
    if (!email || !userType) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Simulate form submission
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    submitBtn.textContent = 'Securing Your Spot...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        showNotification('🎉 Welcome to the waitlist! Check your email for confirmation.', 'success');
        closeWaitlistModal();
        
        // Reset form
        form.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        // Track conversion
        console.log('Waitlist signup:', { email, userType, notifications });
        
        // In a real implementation, send to backend
        // trackConversion('waitlist_signup', { email, userType, notifications });
    }, 2000);
}

// Pricing toggle functionality
function initPricingToggle() {
    const toggle = document.getElementById('pricingToggle');
    const monthlyPrices = document.querySelectorAll('.monthly-price');
    const annualPrices = document.querySelectorAll('.annual-price');
    
    if (toggle) {
        toggle.addEventListener('change', function() {
            const isAnnual = this.checked;
            
            monthlyPrices.forEach(price => {
                if (isAnnual) {
                    price.classList.add('hidden');
                } else {
                    price.classList.remove('hidden');
                }
            });
            
            annualPrices.forEach(price => {
                if (isAnnual) {
                    price.classList.remove('hidden');
                } else {
                    price.classList.add('hidden');
                }
            });
        });
    }
}

// Scroll to demo section
function scrollToDemo() {
    const demoSection = document.getElementById('demo');
    if (demoSection) {
        demoSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
    }
}

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
    // Set up global functions for onclick handlers
    window.openWaitlistModal = openWaitlistModal;
    window.closeWaitlistModal = closeWaitlistModal;
    window.submitWaitlist = submitWaitlist;
    window.scrollToDemo = scrollToDemo;
    
    const ctaButtons = document.querySelectorAll('.cta-button, .cta-primary, .pricing-cta');
    
    ctaButtons.forEach(button => {
        // Skip buttons that have onclick handlers
        if (button.hasAttribute('onclick')) return;
        
        button.addEventListener('click', function() {
            if (this.textContent.includes('Waitlist') || this.textContent.includes('Early Access') || this.textContent.includes('Get')) {
                openWaitlistModal();
            }
        });
    });
    
    // Watch Demo button fallback
    const watchDemoButton = document.querySelector('.cta-secondary');
    if (watchDemoButton && !watchDemoButton.hasAttribute('onclick')) {
        watchDemoButton.addEventListener('click', function() {
            scrollToDemo();
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
            showNotification(`${riskLevel} risk zone selected. Join waitlist for full interactive mapping!`, 'info');
            
            // Encourage sign up after demo interaction
            setTimeout(() => {
                if (Math.random() > 0.5) { // 50% chance to show conversion prompt
                    showNotification('Want early access to full features? Join the waitlist now!', 'success');
                }
            }, 3000);
        });
    });
    
    if (propertyMarker) {
        propertyMarker.addEventListener('click', function() {
            showNotification('Property analysis preview - Join waitlist for detailed reports!', 'info');
            
            // Show conversion opportunity
            setTimeout(() => {
                const shouldShowCTA = Math.random() > 0.3; // 70% chance
                if (shouldShowCTA) {
                    showNotification('Get 50% off your first year - Early bird pricing ends soon!', 'warning');
                }
            }, 2000);
        });
    }
    
    // Add hover effects to testimonials
    const testimonials = document.querySelectorAll('.testimonial');
    testimonials.forEach(testimonial => {
        testimonial.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-4px)';
            this.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
            this.style.transition = 'all 0.3s ease';
        });
        
        testimonial.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        });
    });
    
    // Add conversion tracking for key interactions
    trackUserEngagement();
});

// Track user engagement for conversion optimization
function trackUserEngagement() {
    let engagementScore = 0;
    const engagementEvents = {
        'scroll-50': false,
        'demo-interaction': false,
        'pricing-view': false,
        'testimonial-read': false
    };
    
    // Track scroll depth
    window.addEventListener('scroll', () => {
        const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        
        if (scrollPercent > 50 && !engagementEvents['scroll-50']) {
            engagementEvents['scroll-50'] = true;
            engagementScore += 25;
            console.log('Engagement: User scrolled 50%');
        }
        
        // Check if user reached pricing section
        const pricingSection = document.querySelector('.pricing');
        if (pricingSection && isElementInViewport(pricingSection) && !engagementEvents['pricing-view']) {
            engagementEvents['pricing-view'] = true;
            engagementScore += 30;
            console.log('Engagement: User viewed pricing');
            
            // Show urgency notification for high-engagement users
            if (engagementScore > 50) {
                setTimeout(() => {
                    showNotification('⚡ Limited time: 50% off early bird pricing ends soon!', 'warning');
                }, 5000);
            }
        }
    });
    
    // Track demo interactions
    const demoElements = document.querySelectorAll('.zone, .property-marker, .risk-card');
    demoElements.forEach(element => {
        element.addEventListener('click', () => {
            if (!engagementEvents['demo-interaction']) {
                engagementEvents['demo-interaction'] = true;
                engagementScore += 20;
                console.log('Engagement: User interacted with demo');
            }
        });
    });
    
    // Track testimonial reading
    const testimonials = document.querySelectorAll('.testimonial');
    testimonials.forEach(testimonial => {
        testimonial.addEventListener('mouseenter', () => {
            if (!engagementEvents['testimonial-read']) {
                engagementEvents['testimonial-read'] = true;
                engagementScore += 15;
                console.log('Engagement: User read testimonials');
            }
        });
    });
    
    // Exit intent detection (simplified)
    document.addEventListener('mouseleave', (e) => {
        if (e.clientY <= 0 && engagementScore > 40) {
            setTimeout(() => {
                if (!document.getElementById('waitlistModal').style.display || 
                    document.getElementById('waitlistModal').style.display === 'none') {
                    showNotification('Wait! Get 50% off early access before you go!', 'warning');
                }
            }, 500);
        }
    });
}

// Helper function to check if element is in viewport
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

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
