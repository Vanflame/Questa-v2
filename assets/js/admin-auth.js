// Admin Authentication Module
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Global variables
let currentUser = null
let isAdmin = false

// Show loading spinner
function showLoading() {
    const existingSpinner = document.getElementById('loading-spinner')
    if (existingSpinner) return
    
    const spinner = document.createElement('div')
    spinner.id = 'loading-spinner'
    spinner.innerHTML = `
        <div class="loading-overlay">
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        </div>
    `
    document.body.appendChild(spinner)
}

// Hide loading spinner
function hideLoading() {
    const spinner = document.getElementById('loading-spinner')
    if (spinner) {
        spinner.remove()
    }
}

// Check if user has admin privileges
async function checkAdminStatus() {
    try {
        const { data: userData, error } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single()
        
        if (error) {
            console.error('Error checking admin status:', error)
            isAdmin = false
        } else {
            isAdmin = userData?.role === 'admin'
        }
    } catch (error) {
        console.error('Error checking admin status:', error)
        isAdmin = false
    }
}

// Check session and admin status
async function checkSessionAndRole() {
    showLoading()
    
    try {
        // Check if user has an active session
        const { data: { session } } = await supabaseClient.auth.getSession()
        
        if (!session) {
            hideLoading()
            console.log('No session found, redirecting to login')
            window.location.href = '/login'
            return false
        }
        
        currentUser = session.user
        window.currentUser = currentUser // Make available globally
        
        // Check if user is admin
        await checkAdminStatus()
        
        if (!isAdmin) {
            hideLoading()
            alert('Access denied. Admin privileges required.')
            window.location.href = '/dashboard'
            return false
        }
        
        hideLoading()
        return true
        
    } catch (error) {
        hideLoading()
        console.error('Error checking session and role:', error)
        window.location.href = '/login'
        return false
    }
}

// Initialize admin authentication
async function initAdminAuth() {
    return await checkSessionAndRole()
}

// Admin logout function
async function adminLogout() {
    showLoading()
    
    try {
        const { error } = await supabaseClient.auth.signOut()
        
        if (error) {
            hideLoading()
            alert('Logout error: ' + error.message)
            return false
        }
        
        // Clear local state
        currentUser = null
        isAdmin = false
        window.currentUser = null
        
        hideLoading()
        window.location.href = '/login'
        return true
        
    } catch (error) {
        hideLoading()
        alert('Logout error: ' + error.message)
        return false
    }
}

// Protect admin pages
async function protectAdminPages() {
    const currentPath = window.location.pathname
    const isAdminPage = currentPath.startsWith('/admin')
    
    if (isAdminPage) {
        const isAuthenticated = await checkSessionAndRole()
        if (!isAuthenticated) {
            return false
        }
    }
    
    return true
}

// Get current user
function getCurrentUser() {
    return currentUser
}

// Check if user is admin
function getIsAdmin() {
    return isAdmin
}

// Event listeners for admin pages
document.addEventListener('DOMContentLoaded', async function() {
    // Protect admin pages
    await protectAdminPages()
    
    // Admin logout button handler
    const logoutBtn = document.querySelector('#logout-btn')
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault()
            await adminLogout()
        })
    }
})

// Export functions for global access
window.initAdminAuth = initAdminAuth
window.getCurrentUser = getCurrentUser
window.getIsAdmin = getIsAdmin
window.adminLogout = adminLogout
window.protectAdminPages = protectAdminPages
