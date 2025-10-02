// Mobile Touch Optimization Controller
class MobileTouchController {
    constructor() {
        this.isMobile = this.detectMobile();
        this.touchStartThreshold = 10;
        this.touchElements = new Map();
        this.gestureRecognition = {
            tap: { maxDuration: 200, maxMovement: 5 },
            drag: { minMovement: 10, debounceTime: 16 }
        };
        
        this.init();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768) ||
               ('ontouchstart' in window);
    }

    init() {
        if (!this.isMobile) return;
        
        console.log('Mobile device detected, initializing touch optimizations');
        
        this.optimizeScrolling();
        this.optimizeTouchTargets();
        this.setupTouchEventHandlers();
        this.optimizePerformance();
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
        
        // Listen for resize events
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));
    }

    optimizeScrolling() {
        // Prevent overscroll bounce on iOS
        document.body.style.overscrollBehavior = 'none';
        
        // Optimize scroll performance
        document.documentElement.style.webkitOverflowScrolling = 'touch';
        
        // Prevent zoom on double tap for specific elements
        const preventZoomElements = document.querySelectorAll('.btn, .nav-link, .theme-toggle, .mode-btn');
        preventZoomElements.forEach(element => {
            element.style.touchAction = 'manipulation';
        });
    }

    optimizeTouchTargets() {
        // Ensure minimum 44px touch targets
        const touchTargets = document.querySelectorAll('.btn, .nav-link, .theme-toggle, .mode-btn, .project-card, .research-card, .achievement-trophy');
        
        touchTargets.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.width < 44 || rect.height < 44) {
                element.style.minWidth = '44px';
                element.style.minHeight = '44px';
                element.style.display = 'flex';
                element.style.alignItems = 'center';
                element.style.justifyContent = 'center';
            }
        });
    }

    setupTouchEventHandlers() {
        // Enhanced touch handling for drag elements
        const dragElements = document.querySelectorAll('.holographic-profile-card');
        
        dragElements.forEach(element => {
            this.setupDragTouchHandling(element);
        });
        
        // Enhanced touch handling for interactive elements
        const interactiveElements = document.querySelectorAll('.btn, .nav-link, .theme-toggle, .mode-btn');
        
        interactiveElements.forEach(element => {
            this.setupInteractiveTouchHandling(element);
        });
        
        // Setup navigation touch handling
        this.setupNavigationTouchHandling();
    }

    setupDragTouchHandling(element) {
        let touchData = {
            startX: 0,
            startY: 0,
            startTime: 0,
            isDragging: false,
            hasMoved: false
        };

        element.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            touchData.startX = touch.clientX;
            touchData.startY = touch.clientY;
            touchData.startTime = Date.now();
            touchData.isDragging = false;
            touchData.hasMoved = false;
            
            // Add visual feedback
            element.style.transition = 'none';
            element.classList.add('touch-active');
        }, { passive: false });

        element.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - touchData.startX);
            const deltaY = Math.abs(touch.clientY - touchData.startY);
            const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (totalMovement > this.touchStartThreshold && !touchData.isDragging) {
                touchData.isDragging = true;
                touchData.hasMoved = true;
                
                // Prevent scrolling when dragging
                e.preventDefault();
                
                // Add dragging class for visual feedback
                element.classList.add('dragging');
                element.classList.remove('touch-active');
            }
            
            if (touchData.isDragging) {
                e.preventDefault();
                
                // Throttle touch move events for performance
                this.throttle(() => {
                    // Dispatch custom drag event
                    const customEvent = new CustomEvent('mobileDrag', {
                        detail: {
                            deltaX: touch.clientX - touchData.startX,
                            deltaY: touch.clientY - touchData.startY,
                            currentX: touch.clientX,
                            currentY: touch.clientY
                        }
                    });
                    element.dispatchEvent(customEvent);
                }, this.gestureRecognition.drag.debounceTime)();
            }
        }, { passive: false });

        element.addEventListener('touchend', (e) => {
            const duration = Date.now() - touchData.startTime;
            
            // Remove visual feedback classes
            element.classList.remove('touch-active', 'dragging');
            element.style.transition = '';
            
            if (!touchData.hasMoved && duration < this.gestureRecognition.tap.maxDuration) {
                // This was a tap, not a drag
                const customEvent = new CustomEvent('mobileTap', {
                    detail: {
                        x: touchData.startX,
                        y: touchData.startY
                    }
                });
                element.dispatchEvent(customEvent);
            } else if (touchData.isDragging) {
                // This was a drag, dispatch end event
                const customEvent = new CustomEvent('mobileDragEnd', {
                    detail: {
                        startX: touchData.startX,
                        startY: touchData.startY,
                        duration: duration
                    }
                });
                element.dispatchEvent(customEvent);
            }
            
            // Reset touch data
            touchData = {
                startX: 0,
                startY: 0,
                startTime: 0,
                isDragging: false,
                hasMoved: false
            };
        }, { passive: true });

        // Handle touch cancel
        element.addEventListener('touchcancel', () => {
            element.classList.remove('touch-active', 'dragging');
            element.style.transition = '';
        }, { passive: true });
    }

    setupInteractiveTouchHandling(element) {
        let touchStartTime = 0;
        let touchStartPos = { x: 0, y: 0 };

        element.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            const touch = e.touches[0];
            touchStartPos = { x: touch.clientX, y: touch.clientY };
            
            // Add touch feedback
            element.classList.add('touch-active');
            
            // Prevent double-tap zoom
            e.preventDefault();
        }, { passive: false });

        element.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - touchStartPos.x);
            const deltaY = Math.abs(touch.clientY - touchStartPos.y);
            
            // If moved too much, cancel the touch
            if (deltaX > this.gestureRecognition.tap.maxMovement || deltaY > this.gestureRecognition.tap.maxMovement) {
                element.classList.remove('touch-active');
            }
        }, { passive: true });

        element.addEventListener('touchend', (e) => {
            const duration = Date.now() - touchStartTime;
            const touch = e.changedTouches[0];
            const deltaX = Math.abs(touch.clientX - touchStartPos.x);
            const deltaY = Math.abs(touch.clientY - touchStartPos.y);
            
            element.classList.remove('touch-active');
            
            // Check if this was a valid tap
            if (duration < this.gestureRecognition.tap.maxDuration && 
                deltaX < this.gestureRecognition.tap.maxMovement && 
                deltaY < this.gestureRecognition.tap.maxMovement) {
                
                // Simulate click for touch devices
                setTimeout(() => {
                    element.click();
                }, 10);
            }
        }, { passive: true });

        element.addEventListener('touchcancel', () => {
            element.classList.remove('touch-active');
        }, { passive: true });
    }

    setupNavigationTouchHandling() {
        const navPill = document.querySelector('.nav-pill');
        if (!navPill) return;

        // Enable smooth scrolling for horizontal navigation on mobile
        navPill.style.scrollBehavior = 'smooth';
        
        // Add momentum scrolling for iOS
        navPill.style.webkitOverflowScrolling = 'touch';
        
        // Handle touch scrolling for navigation
        let isScrolling = false;
        let scrollTimeout;

        navPill.addEventListener('touchstart', () => {
            isScrolling = true;
            clearTimeout(scrollTimeout);
        }, { passive: true });

        navPill.addEventListener('touchend', () => {
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, 100);
        }, { passive: true });

        // Prevent navigation clicks during scrolling
        const navLinks = navPill.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('touchend', (e) => {
                if (isScrolling) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, { passive: false });
        });
    }

    optimizePerformance() {
        // Reduce animation complexity on mobile
        if (this.isMobile) {
            document.documentElement.style.setProperty('--animation-duration', '0.2s');
            document.documentElement.style.setProperty('--transition-duration', '0.15s');
        }
        
        // Use transform3d for hardware acceleration
        const animatedElements = document.querySelectorAll('.btn, .card, .timeline-item, .project-card, .research-card, .achievement-trophy');
        animatedElements.forEach(element => {
            element.style.transform = 'translate3d(0, 0, 0)';
            element.style.backfaceVisibility = 'hidden';
            element.style.perspective = '1000px';
        });
        
        // Optimize scroll performance
        document.addEventListener('touchmove', (e) => {
            // Allow scrolling on scrollable elements
            let element = e.target;
            while (element && element !== document.body) {
                const style = window.getComputedStyle(element);
                if (style.overflowY === 'scroll' || style.overflowY === 'auto' || 
                    style.overflowX === 'scroll' || style.overflowX === 'auto') {
                    return;
                }
                element = element.parentElement;
            }
        }, { passive: true });
    }

    handleOrientationChange() {
        // Recalculate touch targets after orientation change
        setTimeout(() => {
            this.optimizeTouchTargets();
            
            // Dispatch custom event for other components
            window.dispatchEvent(new CustomEvent('mobileOrientationChange', {
                detail: {
                    orientation: window.orientation || 0,
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            }));
        }, 200);
    }

    handleResize() {
        // Update mobile detection on resize
        const wasMobile = this.isMobile;
        this.isMobile = this.detectMobile();
        
        if (wasMobile !== this.isMobile) {
            // Mobile state changed, reinitialize
            this.init();
        }
    }

    // Utility functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Public methods
    isMobileDevice() {
        return this.isMobile;
    }

    destroy() {
        // Clean up event listeners and optimizations
        console.log('Mobile touch controller destroyed');
    }
}

// Browser Compatibility Utility
class BrowserCompatibility {
    constructor() {
        this.browser = this.detectBrowser();
        this.features = this.detectFeatures();
    }

    detectBrowser() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            return { name: 'Chrome', version: this.extractVersion(userAgent, 'Chrome/') };
        } else if (userAgent.includes('Firefox')) {
            return { name: 'Firefox', version: this.extractVersion(userAgent, 'Firefox/') };
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            return { name: 'Safari', version: this.extractVersion(userAgent, 'Version/') };
        } else if (userAgent.includes('Edg')) {
            return { name: 'Edge', version: this.extractVersion(userAgent, 'Edg/') };
        } else {
            return { name: 'Unknown', version: '0' };
        }
    }

    extractVersion(userAgent, prefix) {
        const index = userAgent.indexOf(prefix);
        if (index === -1) return '0';
        const version = userAgent.substring(index + prefix.length);
        return version.split(' ')[0].split('.')[0];
    }

    detectFeatures() {
        return {
            backdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
            cssGrid: CSS.supports('display', 'grid'),
            flexbox: CSS.supports('display', 'flex'),
            customProperties: CSS.supports('--test', 'value'),
            intersectionObserver: 'IntersectionObserver' in window,
            requestAnimationFrame: 'requestAnimationFrame' in window,
            touchEvents: 'ontouchstart' in window,
            webGL: (() => {
                try {
                    const canvas = document.createElement('canvas');
                    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
                } catch (e) {
                    return false;
                }
            })()
        };
    }

    addFallbacks() {
        // Backdrop filter fallback
        if (!this.features.backdropFilter) {
            console.warn('Backdrop filter not supported, adding fallback styles');
            const style = document.createElement('style');
            style.textContent = `
                .theme-toggle, .image-placeholder, .timeline-logo-placeholder {
                    background-color: rgba(32, 178, 170, 0.9) !important;
                }
                [data-theme="dark"] .theme-toggle,
                [data-theme="dark"] .image-placeholder,
                [data-theme="dark"] .timeline-logo-placeholder {
                    background-color: rgba(38, 40, 40, 0.95) !important;
                }
            `;
            document.head.appendChild(style);
        }

        // CSS Grid fallback
        if (!this.features.cssGrid) {
            console.warn('CSS Grid not supported, adding flexbox fallback');
            const style = document.createElement('style');
            style.textContent = `
                .projects-grid, .research-grid, .achievements-showcase {
                    display: flex !important;
                    flex-wrap: wrap !important;
                }
                .project-card, .research-card, .achievement-trophy {
                    flex: 1 1 300px !important;
                    margin: 10px !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Custom properties fallback
        if (!this.features.customProperties) {
            console.warn('CSS Custom Properties not supported, adding static fallbacks');
            const style = document.createElement('style');
            style.textContent = `
                .theme-toggle { background: rgba(32, 178, 170, 0.1); color: #1e293b; }
                .image-placeholder { background: linear-gradient(135deg, #20B2AA, #5FD4D1); }
                .timeline-logo-placeholder { background: linear-gradient(135deg, #20B2AA, #5FD4D1); }
            `;
            document.head.appendChild(style);
        }
    }

    testCompatibility() {
        console.log('🔍 Browser Compatibility Test Results:');
        console.log(`Browser: ${this.browser.name} ${this.browser.version}`);
        console.log('Feature Support:');
        
        Object.entries(this.features).forEach(([feature, supported]) => {
            console.log(`  ${feature}: ${supported ? '✅' : '❌'}`);
        });

        const unsupportedFeatures = Object.entries(this.features)
            .filter(([, supported]) => !supported)
            .map(([feature]) => feature);

        // Test mobile browsers specifically
        this.testMobileBrowsers();
        
        // Test specific browser quirks
        this.testBrowserQuirks();

        if (unsupportedFeatures.length === 0) {
            console.log('🎉 All features supported!');
            return true;
        } else {
            console.warn(`⚠️ Unsupported features: ${unsupportedFeatures.join(', ')}`);
            this.addFallbacks();
            return false;
        }
    }

    testMobileBrowsers() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            console.log('📱 Mobile browser detected, running mobile-specific tests...');
            
            // Test iOS Safari specific issues
            if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                console.log('🍎 iOS Safari detected');
                
                // Test for iOS Safari backdrop-filter bug
                if (this.features.backdropFilter) {
                    console.log('  ✅ Backdrop filter supported on iOS Safari');
                } else {
                    console.log('  ❌ Backdrop filter not supported, using fallback');
                }
                
                // Test for iOS Safari 100vh bug
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
                console.log('  ✅ iOS Safari viewport height fix applied');
            }
            
            // Test Android Chrome specific issues
            if (/Android.*Chrome/.test(navigator.userAgent)) {
                console.log('🤖 Android Chrome detected');
                
                // Test for Android Chrome touch delay
                const touchElements = document.querySelectorAll('.btn, .nav-link, .theme-toggle');
                touchElements.forEach(el => {
                    el.style.touchAction = 'manipulation';
                });
                console.log('  ✅ Touch delay optimization applied');
            }
        }
    }

    testBrowserQuirks() {
        console.log('🔧 Testing browser-specific quirks...');
        
        // Test Safari-specific issues
        if (this.browser.name === 'Safari') {
            console.log('🦁 Safari-specific tests:');
            
            // Test for Safari date input support
            const testInput = document.createElement('input');
            testInput.type = 'date';
            const supportsDateInput = testInput.type === 'date';
            console.log(`  Date input support: ${supportsDateInput ? '✅' : '❌'}`);
            
            // Test for Safari flexbox gap support
            const supportsFlexGap = CSS.supports('gap', '1rem') && CSS.supports('display', 'flex');
            console.log(`  Flexbox gap support: ${supportsFlexGap ? '✅' : '❌'}`);
            
            if (!supportsFlexGap) {
                const style = document.createElement('style');
                style.textContent = `
                    .hero-actions > * { margin: 0 0.5rem; }
                    .nav-pill > * { margin: 0 0.25rem; }
                `;
                document.head.appendChild(style);
            }
        }
        
        // Test Firefox-specific issues
        if (this.browser.name === 'Firefox') {
            console.log('🦊 Firefox-specific tests:');
            
            // Test for Firefox backdrop-filter support
            console.log(`  Backdrop filter: ${this.features.backdropFilter ? '✅' : '❌'}`);
            
            // Firefox scrollbar styling
            const style = document.createElement('style');
            style.textContent = `
                * { scrollbar-width: thin; scrollbar-color: var(--color-primary) var(--color-surface); }
            `;
            document.head.appendChild(style);
            console.log('  ✅ Firefox scrollbar styling applied');
        }
        
        // Test Edge-specific issues
        if (this.browser.name === 'Edge') {
            console.log('🌐 Edge-specific tests:');
            
            // Test for Edge CSS custom properties support
            console.log(`  Custom properties: ${this.features.customProperties ? '✅' : '❌'}`);
            
            // Edge-specific backdrop-filter fallback
            if (!this.features.backdropFilter) {
                console.log('  ❌ Backdrop filter not supported in older Edge, applying fallback');
            }
        }
    }
}



// Theme Toggle Controller with Dark Mode as Default
class ThemeToggleController {
    constructor() {
        this.currentTheme = 'light'; // Default to light mode
        this.themeToggle = null;
        this.themeIcon = null;
        this.themeText = null;
        this.isToggling = false;
        
        this.init();
    }

    init() {
        // Get theme elements
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeIcon = this.themeToggle?.querySelector('.theme-icon');
        this.themeText = this.themeToggle?.querySelector('.theme-text');
        
        if (!this.themeToggle) {
            console.error('Theme toggle button not found');
            return;
        }

        // Initialize light mode as default
        this.initializeLightMode();
        
        // Load saved theme preference or keep dark as default
        this.loadThemePreference();
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('ThemeToggleController initialized with dark mode as default');
    }

    initializeLightMode() {
        // Set light mode as the default theme
        this.currentTheme = 'light';
        document.documentElement.setAttribute('data-theme', 'light');
        // Force a style recalculation
        document.documentElement.style.colorScheme = 'light';
        this.updateThemeButton();
        console.log('Light mode initialized, data-theme set to:', document.documentElement.getAttribute('data-theme'));
    }

    loadThemePreference() {
        try {
            const savedTheme = localStorage.getItem('portfolio-theme');
            if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
                this.currentTheme = savedTheme;
            } else {
                // If no saved preference, keep light as default
                this.currentTheme = 'light';
            }
            
            this.applyTheme(this.currentTheme);
        } catch (error) {
            console.warn('Could not load theme preference:', error);
            // Fallback to light mode
            this.currentTheme = 'light';
            this.applyTheme('light');
        }
    }

    saveThemePreference() {
        try {
            localStorage.setItem('portfolio-theme', this.currentTheme);
        } catch (error) {
            console.warn('Could not save theme preference:', error);
        }
    }

    setupEventListeners() {
        this.themeToggle.addEventListener('click', () => {
            if (!this.isToggling) {
                this.toggleTheme();
            }
        });

        // Keyboard accessibility
        this.themeToggle.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !this.isToggling) {
                e.preventDefault();
                this.toggleTheme();
            }
        });

        // Touch device optimization
        this.themeToggle.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent double-tap zoom on mobile
        }, { passive: false });

        // Focus management for accessibility
        this.themeToggle.addEventListener('focus', () => {
            this.themeToggle.style.outline = '2px solid var(--color-primary)';
            this.themeToggle.style.outlineOffset = '2px';
        });

        this.themeToggle.addEventListener('blur', () => {
            this.themeToggle.style.outline = '';
            this.themeToggle.style.outlineOffset = '';
        });
    }

    toggleTheme() {
        if (this.isToggling) return;
        
        console.log('Toggle theme clicked, current theme:', this.currentTheme);
        
        this.isToggling = true;
        
        // Add transition class for smooth animation
        document.documentElement.classList.add('theme-transitioning');
        
        // Toggle theme
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        console.log('Switching from', this.currentTheme, 'to', newTheme);
        this.currentTheme = newTheme;
        
        // Apply new theme
        this.applyTheme(this.currentTheme);
        
        // Save preference
        this.saveThemePreference();
        
        // Add button animation
        this.themeToggle.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            this.themeToggle.style.transform = '';
            document.documentElement.classList.remove('theme-transitioning');
            this.isToggling = false;
            console.log('Theme toggle complete');
        }, 300);
    }

    applyTheme(theme) {
        // Set data attribute for CSS
        document.documentElement.setAttribute('data-theme', theme);
        
        // Also set the color-scheme property for better browser integration
        document.documentElement.style.colorScheme = theme;
        
        // Apply theme colors directly as fallback
        if (theme === 'dark') {
            // Design system colors
            document.documentElement.style.setProperty('--color-background', 'rgba(31, 33, 33, 1)');
            document.documentElement.style.setProperty('--color-surface', 'rgba(38, 40, 40, 1)');
            document.documentElement.style.setProperty('--color-text', 'rgba(245, 245, 245, 1)');
            document.documentElement.style.setProperty('--color-text-secondary', 'rgba(167, 169, 169, 0.7)');
            document.documentElement.style.setProperty('--color-primary', 'rgba(50, 184, 198, 1)');
            
            // Portfolio specific colors
            document.documentElement.style.setProperty('--base-gradient', 'linear-gradient(135deg, #0D1117 0%, #161B22 30%, #1a1f2e 70%, #13171f 100%)');
            document.documentElement.style.setProperty('--perplexity-text', '#FFFFFF');
            document.documentElement.style.setProperty('--perplexity-text-muted', '#8B949E');
            document.documentElement.style.setProperty('--perplexity-teal', '#20B2AA');
            document.documentElement.style.setProperty('--perplexity-teal-light', '#5FD4D1');
            document.documentElement.style.setProperty('--perplexity-sky', '#87CEEB');
            document.documentElement.style.setProperty('--perplexity-orange', '#D2691E');
        } else {
            // Design system colors
            document.documentElement.style.setProperty('--color-background', 'rgba(252, 252, 249, 1)');
            document.documentElement.style.setProperty('--color-surface', 'rgba(255, 255, 253, 1)');
            document.documentElement.style.setProperty('--color-text', 'rgba(19, 52, 59, 1)');
            document.documentElement.style.setProperty('--color-text-secondary', 'rgba(98, 108, 113, 1)');
            document.documentElement.style.setProperty('--color-primary', 'rgba(33, 128, 141, 1)');
            
            // Portfolio specific colors
            document.documentElement.style.setProperty('--base-gradient', 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 30%, #cbd5e1 70%, #94a3b8 100%)');
            document.documentElement.style.setProperty('--perplexity-text', '#1e293b');
            document.documentElement.style.setProperty('--perplexity-text-muted', '#64748b');
            document.documentElement.style.setProperty('--perplexity-teal', '#0f766e');
            document.documentElement.style.setProperty('--perplexity-teal-light', '#14b8a6');
            document.documentElement.style.setProperty('--perplexity-sky', '#0369a1');
            document.documentElement.style.setProperty('--perplexity-orange', '#ea580c');
        }
        
        // Update button appearance
        this.updateThemeButton();
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: theme }
        }));
        
        console.log('Theme applied:', theme, 'data-theme attribute:', document.documentElement.getAttribute('data-theme'));
    }

    updateThemeButton() {
        if (!this.themeIcon || !this.themeText) return;
        
        if (this.currentTheme === 'dark') {
            this.themeIcon.textContent = '🌙';
            this.themeText.textContent = 'Dark';
            this.themeToggle.setAttribute('aria-label', 'Switch to light mode');
            this.themeToggle.setAttribute('title', 'Switch to light mode');
        } else {
            this.themeIcon.textContent = '☀️';
            this.themeText.textContent = 'Light';
            this.themeToggle.setAttribute('aria-label', 'Switch to dark mode');
            this.themeToggle.setAttribute('title', 'Switch to dark mode');
        }
        
        // Add icon rotation animation with smooth transition
        this.themeIcon.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        this.themeIcon.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            this.themeIcon.style.transform = 'rotate(0deg)';
        }, 300);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    // Theme integration testing method
    testThemeIntegration() {
        console.log('Testing theme integration...');
        
        // Test all theme-sensitive elements
        const elementsToTest = [
            '.theme-toggle',
            '.image-placeholder',
            '.timeline-logo-placeholder',
            '.mode-btn',
            '.nav-link',
            '.btn',
            '.timeline-content',
            '.project-card',
            '.research-card',
            '.achievement-trophy'
        ];
        
        const issues = [];
        
        elementsToTest.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element, index) => {
                const computedStyle = window.getComputedStyle(element);
                
                // Check if element has proper theme variables
                const bgColor = computedStyle.backgroundColor;
                const textColor = computedStyle.color;
                const borderColor = computedStyle.borderColor;
                
                // Check for hardcoded colors that should use CSS variables
                if (bgColor.includes('rgba(32, 178, 170') || 
                    textColor.includes('rgba(32, 178, 170') ||
                    borderColor.includes('rgba(32, 178, 170')) {
                    issues.push(`${selector}[${index}]: Still using hardcoded teal colors`);
                }
                
                // Check for proper transition properties
                const transition = computedStyle.transition;
                if (!transition.includes('background-color') && 
                    (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent')) {
                    issues.push(`${selector}[${index}]: Missing background-color transition`);
                }
            });
        });
        
        if (issues.length === 0) {
            console.log('✅ Theme integration test passed - all elements properly configured');
            return true;
        } else {
            console.warn('⚠️ Theme integration issues found:', issues);
            return false;
        }
    }

    // Visual consistency test
    testVisualConsistency() {
        console.log('Testing visual consistency...');
        
        const consistencyChecks = {
            borderRadius: [],
            fontSize: [],
            spacing: [],
            shadows: []
        };
        
        // Check image placeholders for consistent styling
        const imagePlaceholders = document.querySelectorAll('.image-placeholder');
        imagePlaceholders.forEach((element, index) => {
            const style = window.getComputedStyle(element);
            
            // Check border radius consistency
            if (element.classList.contains('circular') && style.borderRadius !== '9999px') {
                consistencyChecks.borderRadius.push(`Circular placeholder ${index} has incorrect border-radius`);
            }
            
            // Check backdrop filter consistency
            if (!style.backdropFilter.includes('blur(10px)')) {
                consistencyChecks.shadows.push(`Placeholder ${index} has inconsistent backdrop-filter`);
            }
        });
        
        // Check timeline logo placeholders
        const timelineLogos = document.querySelectorAll('.timeline-logo-placeholder');
        timelineLogos.forEach((element, index) => {
            const style = window.getComputedStyle(element);
            
            if (style.borderRadius !== '9999px') {
                consistencyChecks.borderRadius.push(`Timeline logo ${index} should be circular`);
            }
        });
        
        // Check theme toggle consistency
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            const style = window.getComputedStyle(themeToggle);
            if (!style.backdropFilter.includes('blur(10px)')) {
                consistencyChecks.shadows.push('Theme toggle has inconsistent backdrop-filter');
            }
        }
        
        const totalIssues = Object.values(consistencyChecks).reduce((sum, arr) => sum + arr.length, 0);
        
        if (totalIssues === 0) {
            console.log('✅ Visual consistency test passed');
            return true;
        } else {
            console.warn('⚠️ Visual consistency issues found:', consistencyChecks);
            return false;
        }
    }

    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.currentTheme = theme;
            this.applyTheme(theme);
            this.saveThemePreference();
        }
    }

    // Debug function for testing
    debugTheme() {
        console.log('Current theme:', this.currentTheme);
        console.log('data-theme attribute:', document.documentElement.getAttribute('data-theme'));
        console.log('color-scheme style:', document.documentElement.style.colorScheme);
        console.log('Background color:', getComputedStyle(document.documentElement).getPropertyValue('--color-background'));
        console.log('Text color:', getComputedStyle(document.documentElement).getPropertyValue('--color-text'));
    }

    // Comprehensive theme testing
    runThemeTests() {
        console.log('🧪 Running comprehensive theme tests...');
        
        const originalTheme = this.currentTheme;
        let allTestsPassed = true;
        
        // Test both themes
        const themes = ['dark', 'light'];
        
        for (const theme of themes) {
            console.log(`\n📋 Testing ${theme} theme...`);
            
            // Switch to theme
            this.currentTheme = theme;
            this.applyTheme(theme);
            
            // Wait for transitions to complete
            setTimeout(() => {
                const integrationPassed = this.testThemeIntegration();
                const consistencyPassed = this.testVisualConsistency();
                
                if (!integrationPassed || !consistencyPassed) {
                    allTestsPassed = false;
                }
                
                console.log(`${theme} theme test: ${integrationPassed && consistencyPassed ? '✅ PASSED' : '❌ FAILED'}`);
            }, 350); // Wait for transition duration
        }
        
        // Restore original theme
        setTimeout(() => {
            this.currentTheme = originalTheme;
            this.applyTheme(originalTheme);
            
            console.log(`\n🏁 Theme testing complete. Overall result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
            
            if (allTestsPassed) {
                console.log('🎉 Theme integration and visual consistency verified!');
            } else {
                console.log('⚠️ Please review the issues above and fix them for optimal theme experience.');
            }
        }, 750);
        
        return allTestsPassed;
    }
}

// Interactive Holographic Profile Card
class HolographicProfileCard {
    constructor() {
        this.card = null;
        this.modeButtons = null;
        this.contentModes = null;
        this.currentMode = 'academic';
        
        this.init();
    }

    init() {
        this.card = document.querySelector('.holographic-profile-card');
        this.modeButtons = document.querySelectorAll('.mode-btn');
        this.contentModes = document.querySelectorAll('.content-mode');
        
        if (!this.card) {
            console.error('Holographic profile card not found');
            return;
        }
        
        this.setupEventListeners();
        this.initializeAnimations();
        
        console.log('Holographic Profile Card initialized successfully');
    }

    setupEventListeners() {
        // Mode button click handlers
        this.modeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.switchMode(mode);
            });
        });
        
        // Card hover effects
        this.card.addEventListener('mouseenter', () => {
            this.card.style.transform = 'translateY(-10px) rotateX(5deg)';
        });
        
        this.card.addEventListener('mouseleave', () => {
            this.card.style.transform = 'translateY(0) rotateX(0deg)';
        });
        
        // Avatar hover effect
        const avatar = this.card.querySelector('.avatar-image');
        if (avatar) {
            avatar.addEventListener('mouseenter', () => {
                avatar.style.transform = 'scale(1.1)';
                avatar.style.boxShadow = '0 0 40px rgba(32, 178, 170, 0.7)';
            });
            
            avatar.addEventListener('mouseleave', () => {
                avatar.style.transform = 'scale(1)';
                avatar.style.boxShadow = '0 0 30px rgba(32, 178, 170, 0.5)';
            });
        }
    }

    switchMode(mode) {
        if (mode === this.currentMode) return;
        
        // Update active button
        this.modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // Update active content
        this.contentModes.forEach(content => {
            content.classList.toggle('active', content.dataset.mode === mode);
        });
        
        this.currentMode = mode;
        
        // Add subtle animation effect
        this.card.style.transform = 'scale(0.98)';
        setTimeout(() => {
            this.card.style.transform = 'scale(1)';
        }, 150);
    }

    initializeAnimations() {
        // Stagger animation for info rows
        const infoRows = this.card.querySelectorAll('.info-row');
        infoRows.forEach((row, index) => {
            row.style.animationDelay = `${index * 0.1}s`;
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                row.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * 100);
        });
        
        // Initialize particle animations
        this.animateParticles();
    }

    animateParticles() {
        const particles = this.card.querySelectorAll('.particle');
        particles.forEach((particle, index) => {
            const randomDelay = Math.random() * 2000;
            const randomDuration = 4000 + Math.random() * 2000;
            
            particle.style.animationDelay = `${randomDelay}ms`;
            particle.style.animationDuration = `${randomDuration}ms`;
        });
    }

    destroy() {
        // Clean up event listeners
        if (this.modeButtons) {
            this.modeButtons.forEach(button => {
                button.removeEventListener('click', this.switchMode);
            });
        }
        
        console.log('Holographic Profile Card destroyed');
    }
}

// Enhanced Navigation System with Fixed Active States
class EnhancedNavigation {
    constructor() {
        this.navLinks = document.querySelectorAll('.nav-link');
        this.sections = document.querySelectorAll('section[id]');
        this.init();
    }

    init() {
        // Smooth scroll navigation
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetId);
                
                if (targetSection) {
                    // Update active state immediately for better UX
                    this.updateActiveLink(link);
                    
                    // Smooth scroll to section
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Enhanced intersection observer for active states
        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const activeLink = document.querySelector(`a[href="#${entry.target.id}"]`);
                    if (activeLink) {
                        this.updateActiveLink(activeLink);
                    }
                }
            });
        }, observerOptions);

        // Observe all sections
        this.sections.forEach(section => {
            this.observer.observe(section);
        });
    }

    updateActiveLink(activeLink) {
        // Remove active class from all links
        this.navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current link
        activeLink.classList.add('active');
    }
}

// Enhanced Scroll Animations Controller
class ScrollAnimationController {
    constructor() {
        this.animatedElements = new Set();
        this.init();
    }

    init() {
        // Main intersection observer for general animations
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.animatedElements.has(entry.target)) {
                        this.animateElement(entry.target);
                        this.animatedElements.add(entry.target);
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -100px 0px'
            }
        );

        // Observe elements with animation classes
        const elementsToAnimate = document.querySelectorAll('.animate-on-scroll');
        elementsToAnimate.forEach(element => {
            this.observer.observe(element);
        });
    }

    animateElement(element) {
        const delay = element.dataset.delay || 0;
        
        setTimeout(() => {
            element.classList.add('animated');
            element.classList.add('animate-in'); // Add this for timeline items
        }, delay * 1000);
    }
}

// Enhanced Background Effects Controller
class BackgroundEffectsController {
    constructor() {
        this.canvases = new Map();
        this.animationFrames = new Map();
        this.init();
    }

    init() {
        this.initHeroParticles();
        this.initEducationWaves();
        this.initExperienceGrid();
        this.initProjectsOrbs();
        this.initResearchNetwork();
        this.initAchievementsStars();
        this.initContactRipples();
    }

    initHeroParticles() {
        const canvas = document.getElementById('hero-bg-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        this.canvases.set('hero', { canvas, ctx });

        const particles = [];
        const particleCount = 50;

        // Create particles
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.2
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;

                // Wrap around edges
                if (particle.x < 0) particle.x = canvas.width;
                if (particle.x > canvas.width) particle.x = 0;
                if (particle.y < 0) particle.y = canvas.height;
                if (particle.y > canvas.height) particle.y = 0;

                // Draw particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(32, 178, 170, ${particle.opacity})`;
                ctx.fill();
            });

            this.animationFrames.set('hero', requestAnimationFrame(animate));
        };

        this.resizeCanvas(canvas);
        animate();
    }

    initEducationWaves() {
        const canvas = document.getElementById('education-bg-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        this.canvases.set('education', { canvas, ctx });

        let time = 0;
        const books = [];
        
        // Create floating book icons
        for (let i = 0; i < 12; i++) {
            books.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 15 + 8,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.4 + 0.1,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw knowledge waves
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(0, canvas.height / 2);
                
                for (let x = 0; x <= canvas.width; x += 8) {
                    const y = canvas.height / 2 + 
                        Math.sin((x + time * 1.5 + i * 80) * 0.008) * (15 + i * 8) +
                        Math.cos((x + time * 2 + i * 60) * 0.012) * (8 + i * 4);
                    ctx.lineTo(x, y);
                }
                
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
                gradient.addColorStop(0, `rgba(32, 178, 170, ${0.08 - i * 0.015})`);
                gradient.addColorStop(0.5, `rgba(135, 206, 235, ${0.12 - i * 0.02})`);
                gradient.addColorStop(1, `rgba(32, 178, 170, ${0.08 - i * 0.015})`);
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2 + i * 0.5;
                ctx.stroke();
            }

            // Draw floating books
            books.forEach(book => {
                book.x += book.vx;
                book.y += book.vy;
                book.rotation += book.rotationSpeed;
                book.pulsePhase += 0.05;

                // Wrap around edges
                if (book.x < -book.size) book.x = canvas.width + book.size;
                if (book.x > canvas.width + book.size) book.x = -book.size;
                if (book.y < -book.size) book.y = canvas.height + book.size;
                if (book.y > canvas.height + book.size) book.y = -book.size;

                const pulsedOpacity = book.opacity * (0.7 + 0.3 * Math.sin(book.pulsePhase));

                ctx.save();
                ctx.translate(book.x, book.y);
                ctx.rotate(book.rotation);
                ctx.globalAlpha = pulsedOpacity;
                
                // Draw book shape
                ctx.fillStyle = `rgba(32, 178, 170, ${pulsedOpacity})`;
                ctx.fillRect(-book.size/2, -book.size/3, book.size, book.size * 0.7);
                
                // Book spine
                ctx.fillStyle = `rgba(135, 206, 235, ${pulsedOpacity * 0.8})`;
                ctx.fillRect(-book.size/2, -book.size/3, book.size * 0.15, book.size * 0.7);
                
                ctx.restore();
            });

            time++;
            this.animationFrames.set('education', requestAnimationFrame(animate));
        };

        this.resizeCanvas(canvas);
        animate();
    }

    initExperienceGrid() {
        const canvas = document.getElementById('experience-bg-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        this.canvases.set('experience', { canvas, ctx });

        const connections = [];
        const nodes = [];
        
        // Create network nodes representing career connections
        for (let i = 0; i < 20; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                size: Math.random() * 4 + 2,
                pulsePhase: Math.random() * Math.PI * 2,
                connections: []
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const time = Date.now() * 0.001;
            
            // Update nodes
            nodes.forEach(node => {
                node.x += node.vx;
                node.y += node.vy;
                node.pulsePhase += 0.03;

                // Bounce off edges
                if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
                if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
            });

            // Draw connections between nearby nodes
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 120) {
                        const opacity = (120 - distance) / 120 * 0.3;
                        
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        
                        const gradient = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
                        gradient.addColorStop(0, `rgba(32, 178, 170, ${opacity})`);
                        gradient.addColorStop(0.5, `rgba(135, 206, 235, ${opacity * 1.2})`);
                        gradient.addColorStop(1, `rgba(32, 178, 170, ${opacity})`);
                        
                        ctx.strokeStyle = gradient;
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                }
            }

            // Draw nodes
            nodes.forEach(node => {
                const pulsedSize = node.size * (0.8 + 0.4 * Math.sin(node.pulsePhase));
                
                // Outer glow
                const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, pulsedSize * 2);
                gradient.addColorStop(0, 'rgba(32, 178, 170, 0.6)');
                gradient.addColorStop(0.5, 'rgba(135, 206, 235, 0.3)');
                gradient.addColorStop(1, 'rgba(32, 178, 170, 0)');
                
                ctx.beginPath();
                ctx.arc(node.x, node.y, pulsedSize * 2, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
                
                // Core node
                ctx.beginPath();
                ctx.arc(node.x, node.y, pulsedSize, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(32, 178, 170, 0.8)`;
                ctx.fill();
            });

            this.animationFrames.set('experience', requestAnimationFrame(animate));
        };

        this.resizeCanvas(canvas);
        animate();
    }

    initProjectsOrbs() {
        const canvas = document.getElementById('projects-bg-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        this.canvases.set('projects', { canvas, ctx });

        const codeBlocks = [];
        const dataStreams = [];
        
        // Create floating code blocks
        for (let i = 0; i < 15; i++) {
            codeBlocks.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                width: Math.random() * 40 + 20,
                height: Math.random() * 20 + 10,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.01,
                opacity: Math.random() * 0.4 + 0.2,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }

        // Create data streams
        for (let i = 0; i < 8; i++) {
            dataStreams.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                length: Math.random() * 100 + 50,
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.02 + 0.01,
                opacity: Math.random() * 0.3 + 0.1,
                particles: []
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Update and draw code blocks
            codeBlocks.forEach(block => {
                block.x += block.vx;
                block.y += block.vy;
                block.rotation += block.rotationSpeed;
                block.pulsePhase += 0.04;

                // Wrap around edges
                if (block.x < -block.width) block.x = canvas.width + block.width;
                if (block.x > canvas.width + block.width) block.x = -block.width;
                if (block.y < -block.height) block.y = canvas.height + block.height;
                if (block.y > canvas.height + block.height) block.y = -block.height;

                const pulsedOpacity = block.opacity * (0.7 + 0.3 * Math.sin(block.pulsePhase));

                ctx.save();
                ctx.translate(block.x, block.y);
                ctx.rotate(block.rotation);
                ctx.globalAlpha = pulsedOpacity;
                
                // Draw code block with syntax highlighting effect
                const gradient = ctx.createLinearGradient(-block.width/2, -block.height/2, block.width/2, block.height/2);
                gradient.addColorStop(0, `rgba(32, 178, 170, ${pulsedOpacity})`);
                gradient.addColorStop(0.5, `rgba(135, 206, 235, ${pulsedOpacity * 0.8})`);
                gradient.addColorStop(1, `rgba(32, 178, 170, ${pulsedOpacity * 0.6})`);
                
                ctx.fillStyle = gradient;
                ctx.fillRect(-block.width/2, -block.height/2, block.width, block.height);
                
                // Add code lines effect
                ctx.strokeStyle = `rgba(255, 255, 255, ${pulsedOpacity * 0.3})`;
                ctx.lineWidth = 1;
                for (let i = 0; i < 3; i++) {
                    const y = -block.height/2 + (i + 1) * block.height/4;
                    ctx.beginPath();
                    ctx.moveTo(-block.width/2 + 2, y);
                    ctx.lineTo(block.width/2 - 2, y);
                    ctx.stroke();
                }
                
                ctx.restore();
            });

            // Update and draw data streams
            dataStreams.forEach(stream => {
                stream.angle += stream.speed;
                
                // Create flowing particles
                if (Math.random() < 0.1) {
                    stream.particles.push({
                        x: stream.x,
                        y: stream.y,
                        life: 1.0,
                        size: Math.random() * 3 + 1
                    });
                }

                // Update particles
                stream.particles = stream.particles.filter(particle => {
                    particle.life -= 0.02;
                    particle.x += Math.cos(stream.angle) * 2;
                    particle.y += Math.sin(stream.angle) * 2;
                    
                    if (particle.life > 0) {
                        ctx.beginPath();
                        ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(32, 178, 170, ${stream.opacity * particle.life})`;
                        ctx.fill();
                        return true;
                    }
                    return false;
                });
            });

            this.animationFrames.set('projects', requestAnimationFrame(animate));
        };

        this.resizeCanvas(canvas);
        animate();
    }

    initResearchNetwork() {
        const canvas = document.getElementById('research-bg-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        this.canvases.set('research', { canvas, ctx });

        const molecules = [];
        const equations = [];
        const brainWaves = [];
        
        // Create molecular structures
        for (let i = 0; i < 12; i++) {
            molecules.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 8 + 4,
                electrons: [],
                pulsePhase: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02
            });
            
            // Add electrons to each molecule
            for (let j = 0; j < 3; j++) {
                molecules[i].electrons.push({
                    angle: (j / 3) * Math.PI * 2,
                    radius: molecules[i].size * 2,
                    speed: 0.05 + Math.random() * 0.03
                });
            }
        }

        // Create floating equations
        for (let i = 0; i < 8; i++) {
            equations.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                opacity: Math.random() * 0.4 + 0.2,
                symbols: ['∑', '∫', '∂', 'λ', 'π', '∞', '≈', '∇'][Math.floor(Math.random() * 8)],
                pulsePhase: Math.random() * Math.PI * 2,
                size: Math.random() * 20 + 15
            });
        }

        // Create brain wave patterns
        for (let i = 0; i < 5; i++) {
            brainWaves.push({
                y: (canvas.height / 6) * (i + 1),
                phase: Math.random() * Math.PI * 2,
                amplitude: Math.random() * 20 + 10,
                frequency: Math.random() * 0.02 + 0.01,
                opacity: Math.random() * 0.3 + 0.1
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw brain waves
            brainWaves.forEach(wave => {
                wave.phase += wave.frequency;
                
                ctx.beginPath();
                ctx.moveTo(0, wave.y);
                
                for (let x = 0; x <= canvas.width; x += 5) {
                    const y = wave.y + Math.sin((x * 0.01) + wave.phase) * wave.amplitude;
                    ctx.lineTo(x, y);
                }
                
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
                gradient.addColorStop(0, `rgba(32, 178, 170, 0)`);
                gradient.addColorStop(0.5, `rgba(32, 178, 170, ${wave.opacity})`);
                gradient.addColorStop(1, `rgba(32, 178, 170, 0)`);
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 2;
                ctx.stroke();
            });

            // Update and draw molecules
            molecules.forEach(molecule => {
                molecule.x += molecule.vx;
                molecule.y += molecule.vy;
                molecule.pulsePhase += 0.03;

                // Wrap around edges
                if (molecule.x < -molecule.size) molecule.x = canvas.width + molecule.size;
                if (molecule.x > canvas.width + molecule.size) molecule.x = -molecule.size;
                if (molecule.y < -molecule.size) molecule.y = canvas.height + molecule.size;
                if (molecule.y > canvas.height + molecule.size) molecule.y = -molecule.size;

                const pulsedSize = molecule.size * (0.8 + 0.3 * Math.sin(molecule.pulsePhase));

                // Draw nucleus
                const nucleusGradient = ctx.createRadialGradient(
                    molecule.x, molecule.y, 0, 
                    molecule.x, molecule.y, pulsedSize
                );
                nucleusGradient.addColorStop(0, 'rgba(32, 178, 170, 0.8)');
                nucleusGradient.addColorStop(1, 'rgba(32, 178, 170, 0.2)');
                
                ctx.beginPath();
                ctx.arc(molecule.x, molecule.y, pulsedSize, 0, Math.PI * 2);
                ctx.fillStyle = nucleusGradient;
                ctx.fill();

                // Draw electrons
                molecule.electrons.forEach(electron => {
                    electron.angle += electron.speed;
                    
                    const electronX = molecule.x + Math.cos(electron.angle) * electron.radius;
                    const electronY = molecule.y + Math.sin(electron.angle) * electron.radius;
                    
                    ctx.beginPath();
                    ctx.arc(electronX, electronY, 2, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(135, 206, 235, 0.7)';
                    ctx.fill();
                    
                    // Draw orbital path
                    ctx.beginPath();
                    ctx.arc(molecule.x, molecule.y, electron.radius, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(32, 178, 170, 0.1)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                });
            });

            // Update and draw equations
            equations.forEach(eq => {
                eq.x += eq.vx;
                eq.y += eq.vy;
                eq.pulsePhase += 0.04;

                // Wrap around edges
                if (eq.x < -eq.size) eq.x = canvas.width + eq.size;
                if (eq.x > canvas.width + eq.size) eq.x = -eq.size;
                if (eq.y < -eq.size) eq.y = canvas.height + eq.size;
                if (eq.y > canvas.height + eq.size) eq.y = -eq.size;

                const pulsedOpacity = eq.opacity * (0.7 + 0.3 * Math.sin(eq.pulsePhase));

                ctx.save();
                ctx.globalAlpha = pulsedOpacity;
                ctx.font = `${eq.size}px serif`;
                ctx.fillStyle = `rgba(32, 178, 170, ${pulsedOpacity})`;
                ctx.textAlign = 'center';
                ctx.fillText(eq.symbols, eq.x, eq.y);
                ctx.restore();
            });

            this.animationFrames.set('research', requestAnimationFrame(animate));
        };

        this.resizeCanvas(canvas);
        animate();
    }

    initAchievementsStars() {
        const canvas = document.getElementById('achievements-bg-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        this.canvases.set('achievements', { canvas, ctx });

        const trophies = [];
        const medals = [];
        const sparkles = [];
        const celebrationBursts = [];
        
        // Create floating trophies
        for (let i = 0; i < 8; i++) {
            trophies.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 20 + 15,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.01,
                pulsePhase: Math.random() * Math.PI * 2,
                opacity: Math.random() * 0.4 + 0.3
            });
        }

        // Create medals
        for (let i = 0; i < 6; i++) {
            medals.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                size: Math.random() * 15 + 10,
                swingPhase: Math.random() * Math.PI * 2,
                swingSpeed: Math.random() * 0.03 + 0.02,
                opacity: Math.random() * 0.5 + 0.3
            });
        }

        // Create sparkles
        for (let i = 0; i < 50; i++) {
            sparkles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: Math.random() * 0.05 + 0.02,
                life: Math.random() * 100 + 50
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Update and draw trophies
            trophies.forEach(trophy => {
                trophy.x += trophy.vx;
                trophy.y += trophy.vy;
                trophy.rotation += trophy.rotationSpeed;
                trophy.pulsePhase += 0.03;

                // Wrap around edges
                if (trophy.x < -trophy.size) trophy.x = canvas.width + trophy.size;
                if (trophy.x > canvas.width + trophy.size) trophy.x = -trophy.size;
                if (trophy.y < -trophy.size) trophy.y = canvas.height + trophy.size;
                if (trophy.y > canvas.height + trophy.size) trophy.y = -trophy.size;

                const pulsedOpacity = trophy.opacity * (0.7 + 0.3 * Math.sin(trophy.pulsePhase));
                const pulsedSize = trophy.size * (0.9 + 0.1 * Math.sin(trophy.pulsePhase * 1.5));

                ctx.save();
                ctx.translate(trophy.x, trophy.y);
                ctx.rotate(trophy.rotation);
                ctx.globalAlpha = pulsedOpacity;
                
                // Draw trophy cup
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pulsedSize);
                gradient.addColorStop(0, `rgba(255, 215, 0, ${pulsedOpacity})`);
                gradient.addColorStop(0.7, `rgba(255, 165, 0, ${pulsedOpacity * 0.8})`);
                gradient.addColorStop(1, `rgba(218, 165, 32, ${pulsedOpacity * 0.6})`);
                
                // Trophy body
                ctx.fillStyle = gradient;
                ctx.fillRect(-pulsedSize/3, -pulsedSize/2, pulsedSize * 0.66, pulsedSize * 0.8);
                
                // Trophy handles
                ctx.strokeStyle = `rgba(255, 215, 0, ${pulsedOpacity * 0.7})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(-pulsedSize/2, -pulsedSize/4, pulsedSize/6, 0, Math.PI);
                ctx.arc(pulsedSize/2, -pulsedSize/4, pulsedSize/6, 0, Math.PI);
                ctx.stroke();
                
                // Trophy base
                ctx.fillStyle = `rgba(184, 134, 11, ${pulsedOpacity})`;
                ctx.fillRect(-pulsedSize/2, pulsedSize/3, pulsedSize, pulsedSize/6);
                
                ctx.restore();
            });

            // Update and draw medals
            medals.forEach(medal => {
                medal.x += medal.vx;
                medal.y += medal.vy;
                medal.swingPhase += medal.swingSpeed;

                // Wrap around edges
                if (medal.x < -medal.size) medal.x = canvas.width + medal.size;
                if (medal.x > canvas.width + medal.size) medal.x = -medal.size;
                if (medal.y < -medal.size) medal.y = canvas.height + medal.size;
                if (medal.y > canvas.height + medal.size) medal.y = -medal.size;

                const swingOffset = Math.sin(medal.swingPhase) * 5;

                ctx.save();
                ctx.translate(medal.x + swingOffset, medal.y);
                ctx.globalAlpha = medal.opacity;
                
                // Medal ribbon
                ctx.fillStyle = `rgba(220, 20, 60, ${medal.opacity})`;
                ctx.fillRect(-2, -medal.size, 4, medal.size * 0.7);
                
                // Medal circle
                const medalGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, medal.size);
                medalGradient.addColorStop(0, `rgba(255, 215, 0, ${medal.opacity})`);
                medalGradient.addColorStop(0.8, `rgba(255, 165, 0, ${medal.opacity * 0.8})`);
                medalGradient.addColorStop(1, `rgba(184, 134, 11, ${medal.opacity * 0.6})`);
                
                ctx.beginPath();
                ctx.arc(0, 0, medal.size * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = medalGradient;
                ctx.fill();
                
                // Medal star
                ctx.fillStyle = `rgba(255, 255, 255, ${medal.opacity * 0.9})`;
                ctx.font = `${medal.size * 0.8}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('★', 0, 0);
                
                ctx.restore();
            });

            // Update and draw sparkles
            sparkles.forEach((sparkle, index) => {
                sparkle.x += sparkle.vx;
                sparkle.y += sparkle.vy;
                sparkle.twinkle += sparkle.twinkleSpeed;
                sparkle.life--;

                if (sparkle.life <= 0) {
                    // Respawn sparkle
                    sparkle.x = Math.random() * canvas.width;
                    sparkle.y = Math.random() * canvas.height;
                    sparkle.life = Math.random() * 100 + 50;
                }

                // Wrap around edges
                if (sparkle.x < 0) sparkle.x = canvas.width;
                if (sparkle.x > canvas.width) sparkle.x = 0;
                if (sparkle.y < 0) sparkle.y = canvas.height;
                if (sparkle.y > canvas.height) sparkle.y = 0;

                const twinkleOpacity = Math.sin(sparkle.twinkle) * 0.4 + 0.6;
                const lifeOpacity = sparkle.life / 100;
                const finalOpacity = twinkleOpacity * lifeOpacity * 0.8;

                // Draw sparkle as a star
                ctx.save();
                ctx.translate(sparkle.x, sparkle.y);
                ctx.rotate(sparkle.twinkle);
                ctx.globalAlpha = finalOpacity;
                
                ctx.fillStyle = `rgba(255, 255, 255, ${finalOpacity})`;
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    ctx.lineTo(0, -sparkle.size);
                    ctx.rotate(Math.PI / 4);
                    ctx.lineTo(0, -sparkle.size / 2);
                    ctx.rotate(Math.PI / 4);
                }
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
            });

            this.animationFrames.set('achievements', requestAnimationFrame(animate));
        };

        this.resizeCanvas(canvas);
        animate();
    }

    initContactRipples() {
        const canvas = document.getElementById('contact-bg-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        this.canvases.set('contact', { canvas, ctx });

        const messageWaves = [];
        const connectionNodes = [];
        const pulseRings = [];
        let lastPulse = 0;

        // Create connection nodes representing communication channels
        for (let i = 0; i < 8; i++) {
            connectionNodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 6 + 4,
                pulsePhase: Math.random() * Math.PI * 2,
                type: ['email', 'phone', 'social', 'web'][Math.floor(Math.random() * 4)]
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const now = Date.now();
            
            // Create periodic pulse rings
            if (now - lastPulse > 1500) {
                pulseRings.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: 0,
                    maxRadius: Math.random() * 120 + 80,
                    opacity: 0.6,
                    speed: Math.random() * 1.5 + 1
                });
                lastPulse = now;
            }

            // Create message waves
            if (Math.random() < 0.05) {
                messageWaves.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    targetX: Math.random() * canvas.width,
                    targetY: Math.random() * canvas.height,
                    progress: 0,
                    life: 1.0,
                    size: Math.random() * 4 + 2
                });
            }

            // Update and draw pulse rings
            for (let i = pulseRings.length - 1; i >= 0; i--) {
                const ring = pulseRings[i];
                ring.radius += ring.speed;
                ring.opacity -= 0.008;

                if (ring.opacity <= 0 || ring.radius > ring.maxRadius) {
                    pulseRings.splice(i, 1);
                    continue;
                }

                // Draw multiple concentric rings for depth
                for (let j = 0; j < 3; j++) {
                    const ringRadius = ring.radius - j * 15;
                    if (ringRadius > 0) {
                        ctx.beginPath();
                        ctx.arc(ring.x, ring.y, ringRadius, 0, Math.PI * 2);
                        
                        const gradient = ctx.createRadialGradient(
                            ring.x, ring.y, ringRadius - 5,
                            ring.x, ring.y, ringRadius + 5
                        );
                        gradient.addColorStop(0, `rgba(32, 178, 170, 0)`);
                        gradient.addColorStop(0.5, `rgba(32, 178, 170, ${ring.opacity * (1 - j * 0.3)})`);
                        gradient.addColorStop(1, `rgba(32, 178, 170, 0)`);
                        
                        ctx.strokeStyle = gradient;
                        ctx.lineWidth = 3 - j * 0.5;
                        ctx.stroke();
                    }
                }
            }

            // Update and draw connection nodes
            connectionNodes.forEach(node => {
                node.x += node.vx;
                node.y += node.vy;
                node.pulsePhase += 0.04;

                // Bounce off edges
                if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
                if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

                const pulsedSize = node.size * (0.8 + 0.4 * Math.sin(node.pulsePhase));

                // Draw node glow
                const glowGradient = ctx.createRadialGradient(
                    node.x, node.y, 0,
                    node.x, node.y, pulsedSize * 3
                );
                glowGradient.addColorStop(0, 'rgba(32, 178, 170, 0.6)');
                glowGradient.addColorStop(0.5, 'rgba(135, 206, 235, 0.3)');
                glowGradient.addColorStop(1, 'rgba(32, 178, 170, 0)');
                
                ctx.beginPath();
                ctx.arc(node.x, node.y, pulsedSize * 3, 0, Math.PI * 2);
                ctx.fillStyle = glowGradient;
                ctx.fill();

                // Draw node core
                ctx.beginPath();
                ctx.arc(node.x, node.y, pulsedSize, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(32, 178, 170, 0.9)`;
                ctx.fill();

                // Draw connection type indicator
                ctx.save();
                ctx.translate(node.x, node.y);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.font = `${pulsedSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const icons = {
                    email: '✉',
                    phone: '📞',
                    social: '🌐',
                    web: '💻'
                };
                ctx.fillText(icons[node.type] || '●', 0, 0);
                ctx.restore();
            });

            // Update and draw message waves
            messageWaves.forEach((wave, index) => {
                wave.progress += 0.02;
                wave.life -= 0.01;

                if (wave.life <= 0 || wave.progress >= 1) {
                    messageWaves.splice(index, 1);
                    return;
                }

                // Calculate current position along path
                const currentX = wave.x + (wave.targetX - wave.x) * wave.progress;
                const currentY = wave.y + (wave.targetY - wave.y) * wave.progress;

                // Draw message particle
                const opacity = wave.life * (1 - wave.progress * 0.5);
                
                ctx.save();
                ctx.globalAlpha = opacity;
                
                // Message trail
                for (let i = 0; i < 5; i++) {
                    const trailProgress = Math.max(0, wave.progress - i * 0.05);
                    const trailX = wave.x + (wave.targetX - wave.x) * trailProgress;
                    const trailY = wave.y + (wave.targetY - wave.y) * trailProgress;
                    const trailSize = wave.size * (1 - i * 0.15);
                    const trailOpacity = opacity * (1 - i * 0.2);
                    
                    ctx.beginPath();
                    ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(135, 206, 235, ${trailOpacity})`;
                    ctx.fill();
                }
                
                ctx.restore();
            });

            // Draw connection lines between nearby nodes
            for (let i = 0; i < connectionNodes.length; i++) {
                for (let j = i + 1; j < connectionNodes.length; j++) {
                    const dx = connectionNodes[i].x - connectionNodes[j].x;
                    const dy = connectionNodes[i].y - connectionNodes[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 150) {
                        const opacity = (150 - distance) / 150 * 0.2;
                        
                        ctx.beginPath();
                        ctx.moveTo(connectionNodes[i].x, connectionNodes[i].y);
                        ctx.lineTo(connectionNodes[j].x, connectionNodes[j].y);
                        
                        const lineGradient = ctx.createLinearGradient(
                            connectionNodes[i].x, connectionNodes[i].y,
                            connectionNodes[j].x, connectionNodes[j].y
                        );
                        lineGradient.addColorStop(0, `rgba(32, 178, 170, ${opacity})`);
                        lineGradient.addColorStop(0.5, `rgba(135, 206, 235, ${opacity * 1.2})`);
                        lineGradient.addColorStop(1, `rgba(32, 178, 170, ${opacity})`);
                        
                        ctx.strokeStyle = lineGradient;
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                }
            }

            this.animationFrames.set('contact', requestAnimationFrame(animate));
        };

        this.resizeCanvas(canvas);
        animate();
    }

    resizeCanvas(canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }

    destroy() {
        // Cancel all animation frames
        this.animationFrames.forEach((frameId, key) => {
            cancelAnimationFrame(frameId);
        });
        this.animationFrames.clear();
        this.canvases.clear();
    }
}

// Enhanced Achievement Interactions Controller
class AchievementInteractionsController {
    constructor() {
        this.achievements = document.querySelectorAll('.achievement-trophy');
        this.counters = document.querySelectorAll('.stat-number');
        this.hasAnimated = false;
        this.init();
    }

    init() {
        this.setupAchievementInteractions();
        this.setupCounterAnimations();
    }

    setupAchievementInteractions() {
        this.achievements.forEach(achievement => {
            achievement.addEventListener('mouseenter', () => {
                achievement.style.transform = 'translateY(-10px) scale(1.05)';
                achievement.style.boxShadow = '0 20px 40px rgba(255, 215, 0, 0.3)';
            });

            achievement.addEventListener('mouseleave', () => {
                achievement.style.transform = 'translateY(0) scale(1)';
                achievement.style.boxShadow = '';
            });

            achievement.addEventListener('click', () => {
                this.showAchievementDetails(achievement);
            });
        });
    }

    setupCounterAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.hasAnimated) {
                    this.animateCounters();
                    this.hasAnimated = true;
                }
            });
        }, { threshold: 0.5 });

        const statsSection = document.querySelector('.achievements-stats');
        if (statsSection) {
            observer.observe(statsSection);
        }
    }

    animateCounters() {
        this.counters.forEach(counter => {
            const target = parseInt(counter.dataset.target);
            const duration = 2000;
            const start = Date.now();
            const startValue = 0;

            const animate = () => {
                const elapsed = Date.now() - start;
                const progress = Math.min(elapsed / duration, 1);
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(startValue + (target - startValue) * easeOut);

                counter.textContent = current;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    counter.textContent = target + (target === 15 ? '+' : '');
                }
            };

            animate();
        });
    }

    showAchievementDetails(achievement) {
        const achievementType = achievement.dataset.achievement;
        // Could implement modal or tooltip here
        console.log('Achievement clicked:', achievementType);
    }
}

// Initialize all controllers when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Browser Compatibility first
    const browserCompat = new BrowserCompatibility();
    const isFullyCompatible = browserCompat.testCompatibility();
    
    // Add compatibility class to document for CSS targeting
    if (!isFullyCompatible) {
        document.documentElement.classList.add('limited-compatibility');
    }
    
    // Check for custom properties support and add fallback class
    if (!browserCompat.features.customProperties) {
        document.documentElement.classList.add('no-custom-properties');
    }
    
    // Initialize Mobile Touch Controller first for optimal mobile experience
    const mobileController = new MobileTouchController();
    

    
    // Initialize Theme Toggle Controller
    const themeController = new ThemeToggleController();
    
    // Run theme integration tests after a short delay to ensure all elements are rendered
    setTimeout(() => {
        console.log('🔍 Running theme integration and visual consistency tests...');
        themeController.runThemeTests();
        
        // Run additional browser compatibility tests
        console.log('🌐 Running cross-browser compatibility tests...');
        browserCompat.testCompatibility();
    }, 1000);
    
    // Initialize Interactive Holographic Profile Card
    const holographicCard = new HolographicProfileCard();
    
    // Initialize Enhanced Navigation with Fixed Active States
    const navigation = new EnhancedNavigation();
    
    // Initialize Scroll Animation Controller
    const scrollAnimations = new ScrollAnimationController();
    
    // Initialize Background Effects Controller
    const backgroundEffects = new BackgroundEffectsController();
    
    // Initialize Achievement Interactions Controller
    const achievementInteractions = new AchievementInteractionsController();
    
    // Handle window resize for canvas elements
    window.addEventListener('resize', () => {
        backgroundEffects.canvases.forEach(({ canvas }) => {
            backgroundEffects.resizeCanvas(canvas);
        });
    });
    
    console.log('Portfolio initialized successfully with holographic profile card');
});