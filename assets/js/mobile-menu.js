// Mobile Menu Handler - Mobile-First Navigation
// Handles burger menu, mobile navigation, and user interactions

// Format user ID with Q prefix
function formatUserId(userId) {
    if (!userId) return 'Q0000';
    
    // Extract numeric part from UUID (last 4 characters of the first 8)
    const numericPart = userId.substring(4, 8);
    
    // Convert to number and format with leading zeros
    const numericValue = parseInt(numericPart, 16);
    const formattedNumber = numericValue.toString().padStart(4, '0');
    
    return `Q${formattedNumber}`;
}

// Mobile Menu State
let isMobileMenuOpen = false;
let isUserMenuOpen = false;
let isNotificationMenuOpen = false;

// Initialize mobile menu functionality
function initMobileMenu() {
    console.log('Initializing mobile menu...');
    
    // Mobile menu button
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    
    console.log('Mobile menu elements found:', {
        mobileMenuBtn: !!mobileMenuBtn,
        mobileMenu: !!mobileMenu,
        mobileMenuOverlay: !!mobileMenuOverlay
    });
    
    // Notification menu
    const notificationBell = document.getElementById('notification-bell');
    const notificationDropdown = document.getElementById('notification-dropdown');
    
    // Mobile menu toggle
    if (mobileMenuBtn && mobileMenu && mobileMenuOverlay) {
        console.log('Adding event listeners to mobile menu elements');
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        mobileMenuOverlay.addEventListener('click', closeMobileMenu);
    } else {
        console.error('Mobile menu elements not found:', {
            mobileMenuBtn: !!mobileMenuBtn,
            mobileMenu: !!mobileMenu,
            mobileMenuOverlay: !!mobileMenuOverlay
        });
    }
    
    // Notification menu toggle
    if (notificationBell && notificationDropdown) {
        notificationBell.addEventListener('click', toggleNotificationMenu);
    }
    
    // Close menus when clicking outside
    document.addEventListener('click', handleOutsideClick);
    
    // Close menus on escape key
    document.addEventListener('keydown', handleEscapeKey);
    
    // Close mobile menu on window resize
    window.addEventListener('resize', handleWindowResize);
    
    // Logout button
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', handleMobileLogout);
    }
    
    // Close button
    const mobileCloseBtn = document.getElementById('mobile-menu-close-btn');
    if (mobileCloseBtn) {
        mobileCloseBtn.addEventListener('click', closeMobileMenu);
    }
    
    // Add click handlers for navigation items
    addNavigationClickHandlers();
    
    console.log('Mobile menu initialized successfully');
}

// Toggle mobile menu
function toggleMobileMenu() {
    console.log('Toggle mobile menu clicked');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    
    console.log('Elements found:', {
        mobileMenuBtn: !!mobileMenuBtn,
        mobileMenu: !!mobileMenu,
        mobileMenuOverlay: !!mobileMenuOverlay
    });
    
    if (!mobileMenu || !mobileMenuOverlay || !mobileMenuBtn) {
        console.error('Mobile menu elements not found');
        return;
    }
    
    isMobileMenuOpen = !isMobileMenuOpen;
    console.log('Mobile menu state:', isMobileMenuOpen);
    
    if (isMobileMenuOpen) {
        openMobileMenu();
    } else {
        closeMobileMenu();
    }
}

// Open mobile menu
function openMobileMenu() {
    console.log('Opening mobile menu...');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    
    if (!mobileMenu || !mobileMenuOverlay || !mobileMenuBtn) {
        console.error('Mobile menu elements not found in openMobileMenu');
        return;
    }
    
    // Add active classes
    mobileMenuBtn.classList.add('active');
    mobileMenu.classList.add('show');
    mobileMenuOverlay.classList.add('show');
    
    console.log('Classes added:', {
        mobileMenuBtn: mobileMenuBtn.classList.toString(),
        mobileMenu: mobileMenu.classList.toString(),
        mobileMenuOverlay: mobileMenuOverlay.classList.toString()
    });
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Update user info in mobile menu
    updateMobileUserInfo();
    
    isMobileMenuOpen = true;
    console.log('Mobile menu opened successfully');
}

// Close mobile menu
function closeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    
    if (!mobileMenu || !mobileMenuOverlay || !mobileMenuBtn) return;
    
    // Remove active classes
    mobileMenuBtn.classList.remove('active');
    mobileMenu.classList.remove('show');
    mobileMenuOverlay.classList.remove('show');
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    isMobileMenuOpen = false;
    console.log('Mobile menu closed');
}


// Toggle notification menu
function toggleNotificationMenu(event) {
    event.stopPropagation();
    
    const notificationDropdown = document.getElementById('notification-dropdown');
    if (!notificationDropdown) return;
    
    isNotificationMenuOpen = !isNotificationMenuOpen;
    
    if (isNotificationMenuOpen) {
        notificationDropdown.classList.add('show');
    } else {
        notificationDropdown.classList.remove('show');
    }
}

// Handle clicks outside menus
function handleOutsideClick(event) {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const userMenuDropdown = document.getElementById('user-menu-dropdown');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const notificationBell = document.getElementById('notification-bell');
    
    // Close mobile menu if clicking outside
    if (isMobileMenuOpen && 
        !mobileMenu.contains(event.target) && 
        !mobileMenuBtn.contains(event.target)) {
        closeMobileMenu();
    }
    
    
    // Close notification menu if clicking outside
    if (isNotificationMenuOpen && 
        !notificationDropdown.contains(event.target) && 
        !notificationBell.contains(event.target)) {
        notificationDropdown.classList.remove('show');
        isNotificationMenuOpen = false;
    }
}

// Handle escape key
function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        if (isMobileMenuOpen) {
            closeMobileMenu();
        }
        
        
        if (isNotificationMenuOpen) {
            const notificationDropdown = document.getElementById('notification-dropdown');
            if (notificationDropdown) {
                notificationDropdown.classList.remove('show');
                isNotificationMenuOpen = false;
            }
        }
    }
}

// Handle window resize
function handleWindowResize() {
    // Close mobile menu on desktop
    if (window.innerWidth >= 768 && isMobileMenuOpen) {
        closeMobileMenu();
    }
}

// Update user info in desktop user menu
function updateUserInfo() {
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    
    if (userName && userEmail) {
        // Get current user from global scope
        const currentUser = window.currentUser || null;
        
        if (currentUser) {
            userName.textContent = currentUser.email || 'User';
            // Show formatted user ID instead of email
            const userId = formatUserId(currentUser.id) || 'Q0000';
            userEmail.textContent = userId;
        } else {
            userName.textContent = 'Loading...';
            userEmail.textContent = 'Loading...';
        }
    }
}

// Update user info in mobile menu
function updateMobileUserInfo() {
    const mobileUserName = document.getElementById('mobile-user-name');
    const mobileUserUsername = document.getElementById('mobile-user-username');
    
    if (mobileUserName && mobileUserUsername) {
        // Get current user from global scope
        const currentUser = window.currentUser || null;
        
        if (currentUser) {
            mobileUserName.textContent = currentUser.email || 'User';
            // Show formatted user ID instead of username
            const userId = formatUserId(currentUser.id) || 'Q0000';
            mobileUserUsername.textContent = userId;
        } else {
            mobileUserName.textContent = 'Loading...';
            mobileUserUsername.textContent = 'Loading...';
        }
    }
}

// Handle logout from mobile menu
function handleMobileLogout() {
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', async () => {
            console.log('Mobile logout clicked');
            closeMobileMenu();
            
            // Call logout function from auth module
            if (window.signOut) {
                await window.signOut();
            } else {
                console.error('Logout function not available');
            }
        });
    }
}

// Handle logout from desktop user menu
function handleDesktopLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            console.log('Desktop logout clicked');
            
            // Call logout function from auth module
            if (window.signOut) {
                await window.signOut();
            } else {
                console.error('Logout function not available');
            }
        });
    }
}

// Add click handlers for navigation items
function addNavigationClickHandlers() {
    const navigationItems = document.querySelectorAll('.mobile-menu-item:not(.logout-item)');
    
    navigationItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Get the section from onclick attribute
            const onclickAttr = item.getAttribute('onclick');
            if (onclickAttr) {
                const sectionMatch = onclickAttr.match(/switchSection\('([^']+)'\)/);
                if (sectionMatch) {
                    const section = sectionMatch[1];
                    // Update the global currentSection variable
                    if (window.currentSection !== undefined) {
                        window.currentSection = section;
                    }
                    // Update visual highlighting
                    updateSectionHighlighting();
                    // Close the mobile menu
                    closeMobileMenu();
                }
            }
        });
    });
}

// Fallback switchSection function if not loaded
if (typeof window.switchSection !== 'function') {
    window.switchSection = function(sectionName) {
        console.log('Fallback switchSection called for:', sectionName);
        // Basic section switching fallback
        const sections = document.querySelectorAll('.dashboard-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    };
}

// Set current section and update visual indicators
function setCurrentSection(section) {
    // Update the global currentSection variable directly
    if (window.currentSection !== undefined) {
        window.currentSection = section;
    }
    updateSectionHighlighting();
}

// Update visual highlighting for current section
function updateSectionHighlighting() {
    const navigationItems = document.querySelectorAll('.mobile-menu-item:not(.logout-item)');
    
    // Get current section from dashboard-sections.js
    const currentSection = window.currentSection || 'overview';
    
    navigationItems.forEach(item => {
        const onclickAttr = item.getAttribute('onclick');
        if (onclickAttr) {
            const sectionMatch = onclickAttr.match(/switchSection\('([^']+)'\)/);
            if (sectionMatch) {
                const section = sectionMatch[1];
                
                if (section === currentSection) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            }
        }
    });
}

// Get current section (for external access)
function getCurrentSection() {
    return window.currentSection || 'overview';
}

// Initialize all mobile menu functionality
function initAllMobileMenuFeatures() {
    initMobileMenu();
    handleMobileLogout();
    handleDesktopLogout();
    
    // Update user info periodically
    setInterval(() => {
        updateUserInfo();
        updateMobileUserInfo();
    }, 5000);
}

// Export functions for global access
window.initMobileMenu = initMobileMenu;
window.initAllMobileMenuFeatures = initAllMobileMenuFeatures;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.updateUserInfo = updateUserInfo;
window.updateMobileUserInfo = updateMobileUserInfo;
window.setCurrentSection = setCurrentSection;
window.getCurrentSection = getCurrentSection;
window.updateSectionHighlighting = updateSectionHighlighting;

// Manual initialization function for debugging
window.debugMobileMenu = function() {
    console.log('Manually initializing mobile menu...');
    initAllMobileMenuFeatures();
};

// Auto-initialize when DOM is ready
function initializeMobileMenuWhenReady() {
    // Wait a bit to ensure all scripts are loaded
    setTimeout(() => {
        initAllMobileMenuFeatures();
    }, 100);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMobileMenuWhenReady);
} else {
    initializeMobileMenuWhenReady();
}
