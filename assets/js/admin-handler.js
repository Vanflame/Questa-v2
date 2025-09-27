// Admin Handler Module - UI Initialization and Coordination

// Global variables
let currentUser = null

// Initialize admin panel
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Admin panel initializing...')
    
    // Initialize secure admin authentication
    const isAuthenticated = await window.initSecureAdminAuth()
    if (!isAuthenticated) {
        console.log('Admin authentication failed')
        return
    }
    
    currentUser = window.getCurrentAdminUser()
    console.log('Admin authenticated:', currentUser.email)
    
    // Load admin data
    console.log('Available admin functions:', Object.keys(window).filter(key => key.includes('Admin')))
    await window.loadDashboardStats()
    await window.loadSubmissions()
    await window.loadAdminWithdrawals()
    
    // Wait for admin-tasks module to load
    let attempts = 0
    while (typeof window.loadAdminTasks !== 'function' && attempts < 50) {
        console.log('Waiting for admin-tasks module to load...', attempts)
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
    }
    
    console.log('About to call loadAdminTasks, function exists:', typeof window.loadAdminTasks)
    if (typeof window.loadAdminTasks === 'function') {
        await window.loadAdminTasks()
        // Attach task event listeners after loading tasks
        if (typeof window.attachTaskEventListeners === 'function') {
            window.attachTaskEventListeners()
        }
    } else {
        console.error('admin-tasks module failed to load after waiting')
    }
    
    // Load users data
    if (typeof window.loadUsers === 'function') {
        await window.loadUsers()
    }
    
    // Setup balance management
    setupBalanceManagement()
    
    // Setup mobile menu
    setupMobileMenu()
    
    // Render all the data
    if (typeof window.renderDashboardStats === 'function') {
        window.renderDashboardStats()
    }
    
    // Start analytics refresh
    if (typeof window.startAnalyticsRefresh === 'function') {
        window.startAnalyticsRefresh()
    }
    
    if (typeof window.renderSubmissions === 'function') {
        window.renderSubmissions()
    }
    
    if (typeof window.attachSubmissionEventListeners === 'function') {
        window.attachSubmissionEventListeners()
    }
    
    // Wait for renderAdminTasks to be available
    let renderAttempts = 0
    while (typeof window.renderAdminTasks !== 'function' && renderAttempts < 50) {
        console.log('Waiting for renderAdminTasks to be available...', renderAttempts)
        await new Promise(resolve => setTimeout(resolve, 100))
        renderAttempts++
    }
    
    if (typeof window.renderAdminTasks === 'function') {
        console.log('Initial call to renderAdminTasks...')
        window.renderAdminTasks()
        console.log('Initial renderAdminTasks completed')
    } else {
        console.error('renderAdminTasks function not available after waiting')
    }
    
    if (typeof window.renderAdminWithdrawals === 'function') {
        window.renderAdminWithdrawals()
    }
    
    if (typeof window.attachWithdrawalEventListeners === 'function') {
        window.attachWithdrawalEventListeners()
    }
    
    if (typeof window.renderUsers === 'function') {
        window.renderUsers()
    }
    
    // Initialize admin UI
    initializeAdminUI()
    setupAdminNavigation()
    setupAdminUserMenu()
    setupQuickActions()
    
    // Ensure task event listeners are attached (fallback)
    setTimeout(() => {
        if (typeof window.attachTaskEventListeners === 'function') {
            window.attachTaskEventListeners()
        }
    }, 500)
    
    console.log('Admin panel fully initialized')
})

// Setup mobile menu functionality
function setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle')
    const sidebar = document.getElementById('admin-sidebar')
    const overlay = document.getElementById('admin-mobile-overlay')
    
    if (!mobileMenuToggle || !sidebar || !overlay) {
        console.log('Mobile menu elements not found')
        return
    }
    
    // Toggle sidebar
    mobileMenuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open')
        overlay.classList.toggle('active')
        document.body.classList.toggle('sidebar-open')
    })
    
    // Close sidebar when clicking overlay
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open')
        overlay.classList.remove('active')
        document.body.classList.remove('sidebar-open')
    })
    
    // Close sidebar when clicking nav items
    const navItems = document.querySelectorAll('.admin-nav-item')
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            sidebar.classList.remove('open')
            overlay.classList.remove('active')
            document.body.classList.remove('sidebar-open')
        })
    })
    
    // Close sidebar on window resize if screen becomes large
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            sidebar.classList.remove('open')
            overlay.classList.remove('active')
            document.body.classList.remove('sidebar-open')
        }
    })
    
    console.log('Mobile menu setup complete')
}

// Initialize admin UI components
function initializeAdminUI() {
    console.log('Initializing admin UI components...')
    
    // Update user info in header
    if (currentUser) {
        const userNameElement = document.getElementById('admin-user-name')
        const userEmailElement = document.getElementById('admin-user-email')
        
        if (userNameElement) {
            userNameElement.textContent = currentUser.email.split('@')[0] || 'Admin'
        }
        
        if (userEmailElement) {
            userEmailElement.textContent = currentUser.email
        }
    }
    
    // Set up refresh button
    const refreshBtn = document.getElementById('refresh-admin')
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            console.log('Refreshing admin data...')
            await refreshAdminData()
        })
    }
}

// Setup balance management
function setupBalanceManagement() {
    const manageBalanceBtn = document.getElementById('manage-balance-btn')
    if (manageBalanceBtn) {
        manageBalanceBtn.addEventListener('click', () => {
            // Switch to users section first
            switchToSection('users')
            // Then load users data
            if (typeof window.loadUsers === 'function') {
                window.loadUsers()
            }
        })
    }
}

// Set up admin navigation
function setupAdminNavigation() {
    const navItems = document.querySelectorAll('.admin-nav-item[data-section]')
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault()
            
            const section = item.getAttribute('data-section')
            
            // Remove active class from all nav items
            navItems.forEach(navItem => navItem.classList.remove('active'))
            
            // Add active class to clicked item
            item.classList.add('active')
            
            // Hide all sections
            const sections = document.querySelectorAll('.admin-section')
            sections.forEach(section => section.classList.remove('active'))
            
            // Show selected section
            const targetSection = document.getElementById(`${section}-section`)
            if (targetSection) {
                targetSection.classList.add('active')
            }
            
            console.log('Switched to section:', section)
        })
    })
}

// Set up admin user menu
function setupAdminUserMenu() {
    const userMenuBtn = document.getElementById('admin-user-menu-btn')
    const userDropdown = document.getElementById('admin-user-dropdown')
    const logoutBtn = document.getElementById('admin-logout-btn')
    const settingsBtn = document.getElementById('admin-settings-btn')
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', () => {
            userDropdown.classList.toggle('show')
        })
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.remove('show')
            }
        })
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.adminSignOut('Admin session ended by user')
        })
    }
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            userDropdown.classList.remove('show')
            // TODO: Implement admin settings
            console.log('Admin settings clicked')
        })
    }
}

// Set up quick actions
function setupQuickActions() {
    const quickActionBtns = document.querySelectorAll('.admin-action-btn[data-action]')
    
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action')
            
            switch (action) {
                case 'create-task':
                    if (window.showCreateTaskModal) {
                        window.showCreateTaskModal()
                    } else {
                        console.error('showCreateTaskModal function not available')
                    }
                    break
                case 'review-submissions':
                    switchToSection('submissions')
                    break
                case 'process-withdrawals':
                    switchToSection('withdrawals')
                    break
                case 'view-analytics':
                    switchToSection('analytics')
                    break
            }
        })
    })
    
    // Create task button is now handled by admin-tasks.js modal system
}

// Create task form is now handled by modal system in admin-tasks.js

// Switch to a specific section
function switchToSection(sectionName) {
    // Update navigation
    const navItems = document.querySelectorAll('.admin-nav-item[data-section]')
    navItems.forEach(item => {
        item.classList.remove('active')
        if (item.getAttribute('data-section') === sectionName) {
            item.classList.add('active')
        }
    })
    
    // Update sections
    const sections = document.querySelectorAll('.admin-section')
    sections.forEach(section => section.classList.remove('active'))
    
    const targetSection = document.getElementById(`${sectionName}-section`)
    if (targetSection) {
        targetSection.classList.add('active')
    }
}

// Refresh admin data
async function refreshAdminData() {
    console.log('Refreshing all admin data...')
    
    try {
        // Refresh stats
        if (typeof window.loadDashboardStats === 'function') {
            await window.loadDashboardStats()
        }
        
        // Refresh submissions
        if (typeof window.loadSubmissions === 'function') {
            await window.loadSubmissions()
        }
        
        // Refresh tasks
        if (typeof window.loadAdminTasks === 'function') {
            await window.loadAdminTasks()
        }
        
        // Refresh withdrawals
        if (typeof window.loadAdminWithdrawals === 'function') {
            await window.loadAdminWithdrawals()
        }
        
        // Refresh users
        if (typeof window.loadUsers === 'function') {
            await window.loadUsers()
        }
        
        // Render all the refreshed data
        // Note: renderDashboardStats() is called by individual modules to avoid overwriting counts
        // if (typeof window.renderDashboardStats === 'function') {
        //     window.renderDashboardStats()
        // }
        
        if (typeof window.renderSubmissions === 'function') {
            window.renderSubmissions()
        }
        
        if (typeof window.attachSubmissionEventListeners === 'function') {
            window.attachSubmissionEventListeners()
        }
        
        if (typeof window.renderAdminTasks === 'function') {
            console.log('Calling renderAdminTasks...')
            window.renderAdminTasks()
            console.log('renderAdminTasks completed')
        } else {
            console.error('renderAdminTasks function not available')
        }
        
        if (typeof window.renderAdminWithdrawals === 'function') {
            window.renderAdminWithdrawals()
        }
        
        if (typeof window.attachWithdrawalEventListeners === 'function') {
            window.attachWithdrawalEventListeners()
        }
        
        if (typeof window.renderUsers === 'function') {
            window.renderUsers()
        }
        
        console.log('Admin data refreshed successfully')
        
        // Show success feedback
        if (typeof window.createNotification === 'function') {
            // Note: createNotification requires userId, title, message, type
            console.log('Admin data refreshed successfully')
        }
        
    } catch (error) {
        console.error('Error refreshing admin data:', error)
        
        // Show error feedback
        if (typeof window.createNotification === 'function') {
            // Note: createNotification requires userId, title, message, type
            console.log('Failed to refresh admin data')
        }
    }
}

// createNotification is available from wallet.js via window object

// Global function for toggleReferralEmail (called from dynamically created forms)
window.toggleReferralEmail = function() {
    const referralRequired = document.getElementById('referral-required');
    const referralEmailGroup = document.getElementById('referral-email-group');
    const emailListInput = document.getElementById('email-list');
    
    // Check if elements exist before accessing them
    if (!referralRequired || !referralEmailGroup || !emailListInput) {
        console.log('Elements not found, skipping toggle');
        return;
    }
    
    if (referralRequired.value === 'true') {
        referralEmailGroup.style.display = 'block';
        emailListInput.required = true;
    } else {
        referralEmailGroup.style.display = 'none';
        emailListInput.required = false;
        emailListInput.value = '';
    }
}

// Export functions for other modules
window.switchToSection = switchToSection
window.refreshAdminData = refreshAdminData