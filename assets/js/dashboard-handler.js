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
        
        // Try to create profile if it doesn't exist (fallback)
        try {
            await window.createProfileManually()
        } catch (error) {
            console.log('Profile creation failed, but continuing:', error)
        }
        
        // Load and render dashboard data
        await refreshDashboardData()
        
        // Attach event listeners
        attachEventListeners()
        
        // Refresh data when page becomes visible (user navigates back from admin)
        document.addEventListener('visibilitychange', async function() {
            if (!document.hidden) {
                console.log('Page became visible, refreshing dashboard data...')
                await refreshDashboardData()
            }
        })
        
    } catch (error) {
        console.error('Error in dashboard initialization:', error)
        console.log('Redirecting to login due to error')
        window.location.href = '/login'
    }
})

// Refresh all dashboard data from server
async function refreshDashboardData() {
    console.log('Refreshing dashboard data from server...')
    
    // Load fresh data from server
    await window.loadTasks()
    await window.loadWallet()
    await window.loadWithdrawals()
    await window.loadNotifications()
    
    // Render the dashboard with fresh data
    await renderDashboard()
}

// Render the complete dashboard
async function renderDashboard() {
    console.log('Rendering dashboard...')
    
    // Render wallet
    window.renderWallet()
    
    // Render withdrawals
    window.renderWithdrawals()
    
    // Render tasks
    await window.renderTasks()
    
    // Render notifications
    await window.renderNotifications()
    
    console.log('Dashboard rendered successfully')
}

// Attach event listeners
function attachEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn')
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            console.log('Manual refresh requested')
            refreshBtn.disabled = true
            refreshBtn.textContent = '🔄 Refreshing...'
            
            try {
                await refreshDashboardData()
                alert('Dashboard refreshed successfully!')
            } catch (error) {
                console.error('Error refreshing dashboard:', error)
                alert('Error refreshing dashboard: ' + error.message)
            } finally {
                refreshBtn.disabled = false
                refreshBtn.textContent = '🔄 Refresh'
            }
        })
    }
    
    // Withdraw button
    const withdrawBtn = document.getElementById('withdraw-btn')
    if (withdrawBtn) {
        withdrawBtn.addEventListener('click', function() {
            const withdrawForm = document.getElementById('withdraw-form')
            if (withdrawForm) {
                withdrawForm.style.display = withdrawForm.style.display === 'none' ? 'block' : 'none'
            }
        })
    }
    
    // Cancel withdraw button
    const cancelWithdrawBtn = document.getElementById('cancel-withdraw')
    if (cancelWithdrawBtn) {
        cancelWithdrawBtn.addEventListener('click', function() {
            const withdrawForm = document.getElementById('withdraw-form')
            if (withdrawForm) {
                withdrawForm.style.display = 'none'
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
                alert('Please fill in all fields')
                return
            }
            
            const success = await window.submitWithdrawal(amount, method, accountInfo)
            if (success) {
                // Hide form and reset
                const withdrawForm = document.getElementById('withdraw-form')
                if (withdrawForm) {
                    withdrawForm.style.display = 'none'
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