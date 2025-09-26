// Secure Admin Authentication Module
// This module provides enhanced security for admin access

// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Admin-specific configuration
const ADMIN_CONFIG = {
    // Minimum session duration for admin access (30 minutes)
    MIN_SESSION_DURATION: 30 * 60 * 1000,
    // Admin activity timeout (15 minutes of inactivity)
    ACTIVITY_TIMEOUT: 15 * 60 * 1000,
    // Required admin role
    REQUIRED_ROLE: 'admin',
    // Admin access attempts tracking
    MAX_ACCESS_ATTEMPTS: 3,
    ACCESS_ATTEMPT_WINDOW: 5 * 60 * 1000 // 5 minutes
}

// Global admin state
let adminState = {
    isAuthenticated: false,
    user: null,
    lastActivity: Date.now(),
    accessAttempts: [],
    sessionStartTime: null,
    isSigningOut: false // Guard to prevent logout loops
}

// Show admin loading spinner
function showAdminLoading() {
    const existingSpinner = document.getElementById('admin-loading-spinner')
    if (existingSpinner) return
    
    const spinner = document.createElement('div')
    spinner.id = 'admin-loading-spinner'
    spinner.innerHTML = `
        <div class="admin-loading-overlay">
            <div class="admin-loading-spinner">
                <div class="admin-spinner"></div>
                <p>Verifying Admin Access...</p>
            </div>
        </div>
    `
    document.body.appendChild(spinner)
}

// Hide admin loading spinner
function hideAdminLoading() {
    const spinner = document.getElementById('admin-loading-spinner')
    if (spinner) {
        spinner.remove()
    }
}

// Track admin activity
function trackAdminActivity() {
    adminState.lastActivity = Date.now()
}

// Check for admin session timeout
function checkAdminSessionTimeout() {
    const now = Date.now()
    const timeSinceActivity = now - adminState.lastActivity
    
    if (timeSinceActivity > ADMIN_CONFIG.ACTIVITY_TIMEOUT) {
        console.log('Admin session timed out due to inactivity')
        adminSignOut('Session expired due to inactivity. Please sign in again.')
        return true
    }
    
    return false
}

// Enhanced admin status verification
async function verifyAdminStatus(userId) {
    try {
        // Multiple verification checks
        const [profileCheck, authCheck] = await Promise.all([
            // Check profile role
            supabaseClient
                .from('profiles')
                .select('role, is_active, created_at')
                .eq('id', userId)
                .single(),
            
            // Verify auth user still exists and is valid
            supabaseClient.auth.getUser()
        ])
        
        if (profileCheck.error) {
            console.error('Profile verification failed:', profileCheck.error)
            return { isAdmin: false, reason: 'Profile not found or access denied' }
        }
        
        if (authCheck.error || !authCheck.data.user) {
            console.error('Auth verification failed:', authCheck.error)
            return { isAdmin: false, reason: 'Authentication failed' }
        }
        
        const profile = profileCheck.data
        const isAdmin = profile?.role === ADMIN_CONFIG.REQUIRED_ROLE && profile?.is_active !== false
        
        if (!isAdmin) {
            return { isAdmin: false, reason: 'Insufficient privileges' }
        }
        
        // Additional security checks
        const profileAge = Date.now() - new Date(profile.created_at).getTime()
        if (profileAge < ADMIN_CONFIG.MIN_SESSION_DURATION) {
            console.log('Admin profile too new, requiring additional verification')
            // Could implement additional verification here
        }
        
        return { isAdmin: true, profile }
        
    } catch (error) {
        console.error('Admin verification error:', error)
        return { isAdmin: false, reason: 'Verification failed' }
    }
}

// Track access attempts for security
function trackAccessAttempt(success) {
    const now = Date.now()
    
    // Remove old attempts outside the window
    adminState.accessAttempts = adminState.accessAttempts.filter(
        attempt => now - attempt.timestamp < ADMIN_CONFIG.ACCESS_ATTEMPT_WINDOW
    )
    
    // Add current attempt
    adminState.accessAttempts.push({
        timestamp: now,
        success
    })
    
    // Check if too many failed attempts
    const failedAttempts = adminState.accessAttempts.filter(attempt => !attempt.success)
    if (failedAttempts.length >= ADMIN_CONFIG.MAX_ACCESS_ATTEMPTS) {
        console.warn('Too many failed admin access attempts')
        return false
    }
    
    return true
}

// Initialize secure admin authentication
async function initSecureAdminAuth() {
    showAdminLoading()
    
    try {
        console.log('Initializing secure admin authentication...')
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
        
        if (sessionError) {
            console.error('Session error:', sessionError)
            trackAccessAttempt(false)
            adminSignOut('Session verification failed')
            return false
        }
        
        if (!session || !session.user) {
            console.log('No active session found')
            adminSignOut('Please sign in to access admin panel')
            return false
        }
        
        // Verify admin status with enhanced security
        const adminVerification = await verifyAdminStatus(session.user.id)
        
        if (!adminVerification.isAdmin) {
            console.log('Admin verification failed:', adminVerification.reason)
            trackAccessAttempt(false)
            adminSignOut(`Access denied: ${adminVerification.reason}`)
            return false
        }
        
        // Track successful access
        trackAccessAttempt(true)
        
        // Set admin state
        adminState.isAuthenticated = true
        adminState.user = session.user
        adminState.sessionStartTime = Date.now()
        adminState.lastActivity = Date.now()
        
        console.log('Admin authentication successful:', session.user.email)
        
        // Set up activity tracking
        setupActivityTracking()
        
        // Set up session monitoring
        setupSessionMonitoring()
        
        hideAdminLoading()
        return true
        
    } catch (error) {
        console.error('Admin authentication failed:', error)
        trackAccessAttempt(false)
        adminSignOut('Authentication failed')
        return false
    }
}

// Set up activity tracking
function setupActivityTracking() {
    // Track mouse and keyboard activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    events.forEach(event => {
        document.addEventListener(event, trackAdminActivity, true)
    })
    
    // Check for timeout every minute
    setInterval(() => {
        if (adminState.isAuthenticated && checkAdminSessionTimeout()) {
            // Session timeout handled in checkAdminSessionTimeout
        }
    }, 60000)
}

// Set up session monitoring
function setupSessionMonitoring() {
    // Monitor for auth state changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
            // Only sign out if we're not already in the process of signing out
            if (!adminState.isSigningOut) {
                console.log('Auth state changed - signing out admin')
                adminSignOut('Session ended')
            }
        } else if (event === 'TOKEN_REFRESHED') {
            console.log('Admin token refreshed')
            trackAdminActivity()
        }
    })
}

// Secure admin sign out
async function adminSignOut(reason = 'Admin session ended') {
    // Prevent multiple logout calls
    if (adminState.isSigningOut) {
        console.log('Already signing out, ignoring duplicate call')
        return
    }
    
    adminState.isSigningOut = true
    console.log('Admin signing out:', reason)
    
    adminState.isAuthenticated = false
    adminState.user = null
    adminState.sessionStartTime = null
    adminState.lastActivity = null
    
    // Clear any admin-specific data
    localStorage.removeItem('admin_preferences')
    sessionStorage.removeItem('admin_temp_data')
    
    hideAdminLoading()
    
    // Sign out from Supabase
    try {
        await supabaseClient.auth.signOut()
    } catch (error) {
        console.error('Error during admin sign out:', error)
    }
    
    // Reset the signing out flag after a short delay (in case redirect fails)
    setTimeout(() => {
        adminState.isSigningOut = false
    }, 5000)
    
    // Redirect to login with admin message
    window.location.href = `/login?message=${encodeURIComponent(reason)}`
}

// Check if current user is admin (for other modules)
function isCurrentUserAdmin() {
    return adminState.isAuthenticated && adminState.user !== null
}

// Get current admin user
function getCurrentAdminUser() {
    return adminState.user
}

// Admin access guard
function requireAdminAccess() {
    if (!isCurrentUserAdmin()) {
        adminSignOut('Admin access required')
        return false
    }
    
    if (checkAdminSessionTimeout()) {
        return false
    }
    
    trackAdminActivity()
    return true
}

// Export functions to global scope for admin modules
window.initSecureAdminAuth = initSecureAdminAuth
window.adminSignOut = adminSignOut
window.isCurrentUserAdmin = isCurrentUserAdmin
window.getCurrentAdminUser = getCurrentAdminUser
window.requireAdminAccess = requireAdminAccess
window.trackAdminActivity = trackAdminActivity

console.log('Secure Admin Authentication Module loaded')
