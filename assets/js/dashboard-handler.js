// Dashboard Handler Module - UI Initialization and Coordination
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Get getCurrentUser from global scope
const getCurrentUser = window.getCurrentUser || (() => window.currentUser || null)

// Global variables
let currentUser = null

// Wait for auth module to be ready
async function waitForAuth() {
    let attempts = 0
    const maxAttempts = 100 // 10 seconds max wait
    
    console.log('Waiting for auth module to initialize...')
    console.log('Initial authReady state:', window.authReady)
    
    while (attempts < maxAttempts) {
        // Check if auth module is ready
        if (window.authReady) {
            console.log('Auth module is ready, getting user...')
            
            // First try to get user from auth module
            const user = getCurrentUser()
            console.log('getCurrentUser() returned:', user)
            if (user) {
                console.log('Auth module ready, user found:', user.email)
                return user
            }
            
            // Check session directly as fallback
            try {
                const { data: { session } } = await supabaseClient.auth.getSession()
                console.log('Direct session check:', session)
                if (session && session.user) {
                    console.log('Got user from session directly:', session.user.email)
                    return session.user
                }
            } catch (error) {
                console.error('Error checking session:', error)
            }
        }
        
        // Log progress every 20 attempts (2 seconds)
        if (attempts % 20 === 0 && attempts > 0) {
            console.log(`Still waiting for auth... (${attempts/10}s) - authReady: ${window.authReady}`)
        }
        
        // Wait 100ms before trying again
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
    }
    
    console.log('Auth module not ready after 10 seconds')
    return null
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dashboard initializing...')
    
    try {
        // Wait for auth module to be ready
        console.log('Calling waitForAuth()...')
        currentUser = await waitForAuth()
        console.log('waitForAuth() returned:', currentUser)
        
        if (!currentUser) {
            console.log('No user found after waiting, redirecting to login')
            window.location.href = '/login'
            return
        }
        
        // Make user available globally for other modules
        window.currentUser = currentUser
        
        console.log('User authenticated:', currentUser.email)
        
        // Initialize mobile menu
        if (window.initAllMobileMenuFeatures) {
            window.initAllMobileMenuFeatures()
        }
        
        // Initialize section navigation
        if (window.initSectionNavigation) {
            window.initSectionNavigation()
        }
        
        // Initialize mobile menu
        if (window.initMobileMenu) {
            window.initMobileMenu()
        }
        
        // Try to create profile if it doesn't exist (fallback)
        try {
            await window.createProfileManually()
        } catch (error) {
            console.log('Profile creation failed, but continuing:', error)
        }
        
        // Load and render dashboard data
        await refreshDashboardData()
        
        // Load tasks section data since it's the default
        if (window.loadSectionData) {
            await window.loadSectionData('tasks');
        }
        
        // Attach event listeners
        attachEventListeners()
        
        // Refresh data when page becomes visible (user navigates back from admin)
        // Add a small delay to prevent immediate refresh on initial load
        setTimeout(() => {
            document.addEventListener('visibilitychange', async function() {
                if (!document.hidden) {
                    console.log('Page became visible, refreshing dashboard data...')
                    await refreshDashboardData()
                }
            })
        }, 1000)
        
    } catch (error) {
        console.error('Error in dashboard initialization:', error)
        
        // Only redirect to login for authentication errors, not module loading errors
        if (error.message && error.message.includes('Tasks module failed to load')) {
            console.log('Tasks module failed to load, showing error message instead of redirecting')
            document.body.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: system-ui;">
                    <h2 style="color: #dc2626; margin-bottom: 1rem;">Module Loading Error</h2>
                    <p style="color: #6b7280; margin-bottom: 2rem;">The tasks module failed to load. Please refresh the page.</p>
                    <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
                        Refresh Page
                    </button>
                </div>
            `
        } else {
            console.log('Redirecting to login due to error')
            window.location.href = '/login'
        }
    }
})

// Refresh all dashboard data from server
async function refreshDashboardData() {
    console.log('Refreshing dashboard data from server...')
    
    // Wait for tasks module to be loaded
    if (typeof window.loadTasks !== 'function') {
        console.log('Tasks module not loaded yet, waiting...')
        await new Promise((resolve, reject) => {
            let attempts = 0
            const maxAttempts = 50 // 5 seconds max wait
            const checkInterval = setInterval(() => {
                attempts++
                if (typeof window.loadTasks === 'function') {
                    clearInterval(checkInterval)
                    resolve()
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval)
                    reject(new Error('Tasks module failed to load within timeout'))
                }
            }, 100)
        })
    }
    
    // Load fresh data from server with individual error handling
    try {
        console.log('Loading tasks...')
        await window.loadTasks()
        console.log('Tasks loaded successfully')
    } catch (error) {
        console.error('Error loading tasks:', error)
        throw new Error('Failed to load tasks: ' + error.message)
    }
    
    try {
        console.log('Loading wallet...')
        await window.loadWallet()
        console.log('Wallet loaded successfully')
    } catch (error) {
        console.error('Error loading wallet:', error)
        throw new Error('Failed to load wallet: ' + error.message)
    }
    
    try {
        console.log('Loading withdrawals...')
        await window.loadWithdrawals()
        console.log('Withdrawals loaded successfully')
    } catch (error) {
        console.error('Error loading withdrawals:', error)
        throw new Error('Failed to load withdrawals: ' + error.message)
    }
    
    try {
        console.log('Loading notifications...')
        await window.loadNotifications()
        console.log('Notifications loaded successfully')
    } catch (error) {
        console.error('Error loading notifications:', error)
        throw new Error('Failed to load notifications: ' + error.message)
    }
    
    // Render the dashboard with fresh data
    try {
        console.log('Rendering dashboard...')
        await renderDashboard()
        console.log('Dashboard rendered successfully')
    } catch (error) {
        console.error('Error rendering dashboard:', error)
        throw new Error('Failed to render dashboard: ' + error.message)
    }
}

// Render the complete dashboard
async function renderDashboard() {
    console.log('Rendering dashboard...')
    
    try {
        // Render wallet and stats
        if (typeof window.renderWallet === 'function') {
            window.renderWallet()
            console.log('Wallet rendered successfully')
        } else {
            console.warn('renderWallet function not available')
        }
        
        updateStatsDisplay()
        console.log('Stats display updated')
        
        // Render withdrawals
        if (typeof window.renderWithdrawals === 'function') {
            await window.renderWithdrawals()
            console.log('Withdrawals rendered successfully')
        } else {
            console.warn('renderWithdrawals function not available')
        }
        
        // Render tasks
        if (typeof window.renderTasks === 'function') {
            await window.renderTasks()
            console.log('Tasks rendered successfully')
        } else {
            console.warn('renderTasks function not available')
        }
        
        // Render notifications
        if (typeof window.renderNotifications === 'function') {
            await window.renderNotifications()
            console.log('Notifications rendered successfully')
        } else {
            console.warn('renderNotifications function not available')
        }
        
        console.log('Dashboard rendered successfully')
    } catch (error) {
        console.error('Error in renderDashboard:', error)
        throw error
    }
}

// Update stats display
function updateStatsDisplay() {
    // Update wallet balance
    const walletBalance = document.getElementById('wallet-balance')
    if (walletBalance && window.currentWallet) {
        walletBalance.textContent = `₱${parseFloat(window.currentWallet.balance || 0).toFixed(2)}`
    }
    
    // Update active tasks count
    const activeTasksCount = document.getElementById('active-tasks-count')
    if (activeTasksCount && window.allTasks) {
        const activeTasks = window.allTasks.filter(task => task.status === 'active')
        activeTasksCount.textContent = activeTasks.length
    }
    
    // Update total earnings (placeholder - would need to calculate from transactions)
    const totalEarnings = document.getElementById('total-earnings')
    if (totalEarnings && window.currentWallet) {
        totalEarnings.textContent = `₱${parseFloat(window.currentWallet.balance || 0).toFixed(2)}`
    }
    
    // Update wallet preview
    if (window.updateWalletPreview) {
        window.updateWalletPreview()
    }
}

// Attach event listeners
function attachEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn')
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            console.log('Manual refresh requested')
            refreshBtn.disabled = true
            
            // Store original content
            const originalContent = refreshBtn.innerHTML
            refreshBtn.innerHTML = `
                <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M23 4v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Refreshing...
            `
            
            try {
                await refreshDashboardData()
                openModal({
                    title: 'Success',
                    content: 'Dashboard refreshed successfully!',
                    primaryButton: {
                        text: 'OK',
                        action: () => closeModal()
                    }
                })
            } catch (error) {
                console.error('Error refreshing dashboard:', error)
                openModal({
                    title: 'Error',
                    content: 'Error refreshing dashboard: ' + error.message,
                    primaryButton: {
                        text: 'OK',
                        action: () => closeModal()
                    }
                })
            } finally {
                refreshBtn.disabled = false
                refreshBtn.innerHTML = originalContent
            }
        })
    }
    
    // View toggle functionality
    const viewToggleBtns = document.querySelectorAll('.view-toggle-btn')
    const tasksContainer = document.getElementById('tasks')
    
    viewToggleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.dataset.view
            
            // Remove active class from all buttons
            viewToggleBtns.forEach(b => b.classList.remove('active'))
            // Add active class to clicked button
            this.classList.add('active')
            
            // Update tasks container class
            if (tasksContainer) {
                tasksContainer.className = 'tasks-container ' + view + '-view'
                
                // Store preference in localStorage
                localStorage.setItem('taskViewMode', view)
                
                // Re-render tasks with new view
                if (window.renderTasks) {
                    window.renderTasks()
                }
            }
        })
    })
    
    // Load saved view preference
    const savedView = localStorage.getItem('taskViewMode') || 'cards'
    const activeBtn = document.querySelector(`[data-view="${savedView}"]`)
    if (activeBtn && tasksContainer) {
        viewToggleBtns.forEach(b => b.classList.remove('active'))
        activeBtn.classList.add('active')
        tasksContainer.className = 'tasks-container ' + savedView + '-view'
    }
    
    // Withdraw button (from wallet section)
    const withdrawBtn = document.getElementById('withdraw-btn')
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', function() {
            const withdrawSection = document.getElementById('withdraw-section')
            if (withdrawSection) {
                withdrawSection.style.display = withdrawSection.style.display === 'none' ? 'block' : 'none'
            }
        })
    }
    
    // Withdraw funds button (from wallet section) - Use modal instead of section
    const withdrawFundsBtn = document.getElementById('withdraw-funds-btn')
    if (withdrawFundsBtn) {
        withdrawFundsBtn.addEventListener('click', function(e) {
            e.preventDefault()
            e.stopPropagation()
            console.log('Withdraw funds button clicked')
            // Use the modal-based withdrawal instead of section-based
            if (window.showWithdrawalModal) {
                console.log('Calling showWithdrawalModal...')
                // Add a small delay to ensure any other event handlers have finished
                setTimeout(() => {
                    window.showWithdrawalModal()
                }, 10)
            } else {
                console.error('showWithdrawalModal function not available')
            }
        })
    }
    
    // Close withdraw form button
    const closeWithdrawFormBtn = document.getElementById('close-withdraw-form')
    if (closeWithdrawFormBtn) {
        closeWithdrawFormBtn.addEventListener('click', function() {
            const withdrawSection = document.getElementById('withdraw-section')
            if (withdrawSection) {
                withdrawSection.style.display = 'none'
            }
        })
    }
    
    // Cancel withdraw button
    const cancelWithdrawBtn = document.getElementById('cancel-withdraw')
    if (cancelWithdrawBtn) {
        cancelWithdrawBtn.addEventListener('click', function() {
            const withdrawSection = document.getElementById('withdraw-section')
            if (withdrawSection) {
                withdrawSection.style.display = 'none'
            }
        })
    }
    
    // Withdrawal form
    const withdrawalForm = document.getElementById('withdrawal-form')
    if (withdrawalForm) {
        withdrawalForm.addEventListener('submit', async function(e) {
            e.preventDefault()
            
            const amount = parseFloat(document.getElementById('withdraw-amount').value)
            const method = document.getElementById('withdraw-method').value
            const accountInfo = document.getElementById('withdraw-account').value
            
            if (!amount || !method || !accountInfo) {
                openModal({
                    title: 'Validation Error',
                    content: 'Please fill in all fields',
                    primaryButton: {
                        text: 'OK',
                        action: () => closeModal()
                    }
                })
                return
            }
            
            const success = await window.submitWithdrawal(amount, method, accountInfo)
            if (success) {
                // Hide section and reset
                const withdrawSection = document.getElementById('withdraw-section')
                if (withdrawSection) {
                    withdrawSection.style.display = 'none'
                }
                withdrawalForm.reset()
            }
        })
    }
    
    // Notification bell click
    const notificationBell = document.getElementById('notification-bell')
    if (notificationBell) {
        notificationBell.addEventListener('click', function(e) {
            e.stopPropagation()
            const dropdown = document.getElementById('notification-dropdown')
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none'
            }
        })
    }
    
    // Mark all as read button
    const markAllReadBtn = document.getElementById('mark-all-read')
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async function() {
            await window.markAllNotificationsRead()
        })
    }
    
    // Individual notification clicks
    document.addEventListener('click', function(e) {
        const notificationItem = e.target.closest('.notification-item')
        if (notificationItem) {
            const notificationId = notificationItem.getAttribute('data-notification-id')
            if (notificationId) {
                window.markNotificationRead(notificationId)
            }
        }
    })
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('notification-dropdown')
        const bell = document.getElementById('notification-bell')
        
        if (dropdown && bell && !bell.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none'
        }
    })
}