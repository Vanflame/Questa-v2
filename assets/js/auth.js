// Authentication Module
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Global variables
let currentUser = null
let userProfile = null

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

// Check if user is admin
async function checkAdminStatus(userId) {
    try {
        const { data: profileData, error } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()
        
        if (error) {
            console.error('Error checking admin status:', error)
            return false
        }
        
        return profileData?.role === 'admin'
    } catch (error) {
        console.error('Error checking admin status:', error)
        return false
    }
}

// Load user profile
async function loadUserProfile(userId) {
    try {
        const { data: profileData, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
        
        if (error) {
            console.error('Error loading user profile:', error)
            
            // If profile doesn't exist, create it
            if (error.code === 'PGRST116') {
                console.log('Profile not found, creating new profile for user:', userId)
                return await createUserProfile(userId)
            }
            
            return null
        }
        
        userProfile = profileData
        return profileData
    } catch (error) {
        console.error('Error loading user profile:', error)
        return null
    }
}

// Create user profile if it doesn't exist
async function createUserProfile(userId) {
    try {
        console.log('Creating profile for user:', userId)
        
        // Get user email from auth
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            console.error('Error getting user info:', userError)
            return null
        }
        
        console.log('User email:', user.email)
        
        // Check if profile already exists
        const { data: existingProfile } = await supabaseClient
            .from('profiles')
            .select('role, balance')
            .eq('id', userId)
            .single()
        
        // Create or update profile (preserve existing role if admin)
        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .upsert({
                id: userId,
                email: user.email,
                role: existingProfile?.role || 'user',
                balance: existingProfile?.balance || 0
            }, {
                onConflict: 'id'
            })
            .select()
            .single()
        
        if (profileError) {
            console.error('Error creating/updating user profile:', profileError)
            return null
        }
        
        console.log('Profile created:', profileData)
        
        // Create or update user_profiles record
        const { error: userProfileError } = await supabaseClient
            .from('user_profiles')
            .upsert({
                user_id: userId,
                email: user.email,
                is_admin: false,
                is_active: true
            }, {
                onConflict: 'user_id'
            })
        
        if (userProfileError) {
            console.error('Error creating/updating user_profiles:', userProfileError)
        } else {
            console.log('User profiles record created/updated')
        }
        
        // Create or update user_wallets record
        const { error: walletError } = await supabaseClient
            .from('user_wallets')
            .upsert({
                user_id: userId,
                balance: 0
            }, {
                onConflict: 'user_id'
            })
        
        if (walletError) {
            console.error('Error creating/updating user_wallets:', walletError)
        } else {
            console.log('User wallet record created/updated')
        }
        
        userProfile = profileData
        console.log('User profile created successfully')
        return profileData
        
    } catch (error) {
        console.error('Error creating user profile:', error)
        return null
    }
}

// Check authentication and redirect if needed
async function checkAuthAndRedirect() {
    const currentPath = window.location.pathname
    const isProtectedPage = currentPath === '/dashboard' || currentPath === '/admin' || currentPath.startsWith('/dashboard/') || currentPath.startsWith('/admin/')
    const isAuthPage = currentPath === '/login' || currentPath === '/register' || currentPath.startsWith('/login/') || currentPath.startsWith('/register/')
    
    console.log('Checking auth for path:', currentPath, 'Protected:', isProtectedPage, 'Auth page:', isAuthPage)
    
    // Prevent infinite loops by checking if we're already in a redirect
    if (window.authRedirecting) {
        console.log('Already redirecting, skipping auth check')
        return
    }
    
    if (isProtectedPage || isAuthPage) {
        showLoading()
        
        try {
            const { data: { session } } = await supabaseClient.auth.getSession()
            console.log('Session check result:', session ? 'Session exists' : 'No session')
            
            if (!session) {
                // No session - redirect to login if on protected page
                if (isProtectedPage) {
                    console.log('No session on protected page, redirecting to login')
                    hideLoading()
                    window.authRedirecting = true
                    window.location.href = '/login'
                    return
                }
                // Allow access to login/register pages
                console.log('No session on auth page, allowing access')
                hideLoading()
                return
            }
            
            currentUser = session.user
            console.log('Current user:', currentUser.email, currentUser.id)
            
            // Load user profile (but don't block on failure)
            try {
                const profile = await loadUserProfile(currentUser.id)
                console.log('Profile loaded:', profile ? 'Success' : 'Failed')
                
                // If profile doesn't exist, create it
                if (!profile) {
                    console.warn('User profile not found, but allowing access to continue')
                }
            } catch (profileError) {
                console.error('Profile loading failed, but allowing access:', profileError)
            }
            
            // Check admin status
            try {
                const isAdmin = await checkAdminStatus(currentUser.id)
                console.log('Admin check result:', isAdmin)
                
                // If user is admin and trying to access dashboard, redirect to admin panel
                if (isAdmin && currentPath.startsWith('/dashboard')) {
                    console.log('Admin user accessing dashboard, redirecting to admin panel')
                    hideLoading()
                    window.authRedirecting = true
                    window.location.href = '/admin'
                    return
                }
                
                // If user is not admin and trying to access admin panel, redirect to dashboard
                if (!isAdmin && currentPath.startsWith('/admin')) {
                    hideLoading()
                    alert('Access denied. Admin privileges required.')
                    window.authRedirecting = true
                    window.location.href = '/dashboard'
                    return
                }
            } catch (adminError) {
                console.error('Admin check failed, but allowing access:', adminError)
            }
            
            // Redirect authenticated users away from auth pages
            if (isAuthPage) {
                try {
                    const isAdmin = await checkAdminStatus(currentUser.id)
                    if (isAdmin) {
                        console.log('Admin user on auth page, redirecting to admin panel')
                        hideLoading()
                        window.authRedirecting = true
                        window.location.href = '/admin'
                    } else {
                        console.log('User authenticated on auth page, redirecting to dashboard')
                        hideLoading()
                        window.authRedirecting = true
                        window.location.href = '/dashboard'
                    }
                    return
                } catch (error) {
                    console.log('User authenticated on auth page, redirecting to dashboard')
                    hideLoading()
                    window.authRedirecting = true
                    window.location.href = '/dashboard'
                    return
                }
            }
            
            console.log('Authentication successful, allowing access')
            hideLoading()
            
        } catch (error) {
            console.error('Auth check error:', error)
            hideLoading()
            if (isProtectedPage) {
                window.authRedirecting = true
                window.location.href = '/login'
            }
        }
    }
}

// Authentication functions
export async function signUp(email, password) {
    showLoading()
    
    try {
        console.log('Attempting to sign up user:', email)
        
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        })
        
        if (error) {
            hideLoading()
            console.error('Sign up error:', error)
            alert('Sign up error: ' + error.message)
            return false
        }
        
        console.log('Sign up response:', data)
        
        if (data.user) {
            // Check if email confirmation is required
            if (data.user.email_confirmed_at === null) {
                hideLoading()
                alert('Account created successfully! Please check your email to confirm your account before logging in.')
                window.location.href = '/login'
                return true
            }
            
            // Wait a moment for the trigger to create the profile
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Check if profile was created by trigger
            const { data: existingProfile } = await supabaseClient
                .from('profiles')
                .select('id')
                .eq('id', data.user.id)
                .single()
            
            if (existingProfile) {
                console.log('Profile created by trigger successfully')
                hideLoading()
                alert('Account created successfully!')
                window.location.href = '/dashboard'
            } else {
                // If trigger didn't work, try manual creation
                console.log('Trigger failed, trying manual profile creation')
                try {
                    const { error: profileError } = await supabaseClient
                        .from('profiles')
                        .insert({
                            id: data.user.id,
                            email: email,
                            role: 'user',
                            balance: 0
                        })
                    
                    if (profileError) {
                        console.error('Error creating user profile:', profileError)
                        // Try to create profile manually as fallback
                        await window.createProfileManually()
                    }
                    
                    hideLoading()
                    alert('Account created successfully!')
                    window.location.href = '/dashboard'
                } catch (profileError) {
                    console.error('Error creating profile:', profileError)
                    hideLoading()
                    alert('Account created but profile setup failed. Please try logging in.')
                    window.location.href = '/login'
                }
            }
        } else {
            hideLoading()
            alert('Sign up failed. Please try again.')
            return false
        }
        
        return true
    } catch (error) {
        hideLoading()
        console.error('Sign up error:', error)
        alert('Sign up error: ' + error.message)
        return false
    }
}

export async function signIn(email, password) {
    showLoading()
    
    try {
        console.log('Attempting to sign in user:', email)
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        })
        
        if (error) {
            console.error('Sign in error:', error)
            hideLoading()
            alert('Sign in error: ' + error.message)
            return false
        }
        
        if (data.user) {
            console.log('Sign in successful for user:', data.user.email, data.user.id)
            currentUser = data.user
            // Load user profile
            const profile = await loadUserProfile(data.user.id)
            console.log('Profile after sign in:', profile ? 'Loaded successfully' : 'Failed to load')
            hideLoading()
            console.log('Redirecting to dashboard')
            window.location.href = '/dashboard'
        }
        
        return true
    } catch (error) {
        console.error('Sign in error:', error)
        hideLoading()
        alert('Sign in error: ' + error.message)
        return false
    }
}

export async function signOut() {
    showLoading()
    
    try {
        const { error } = await supabaseClient.auth.signOut()
        
        if (error) {
            hideLoading()
            alert('Sign out error: ' + error.message)
            return false
        }
        
        // Clear local state
        currentUser = null
        userProfile = null
        
        hideLoading()
        window.location.href = '/login'
        return true
    } catch (error) {
        hideLoading()
        alert('Sign out error: ' + error.message)
        return false
    }
}

// Get current user
export function getCurrentUser() {
    return currentUser
}

// Get user profile
export function getUserProfile() {
    return userProfile
}

// Initialize session on page load
async function initializeSession() {
    try {
        // Reset redirect flag
        window.authRedirecting = false
        
        const { data: { session } } = await supabaseClient.auth.getSession()
        
        if (session) {
            currentUser = session.user
            console.log('Session initialized for user:', session.user.email)
            
            try {
                const profile = await loadUserProfile(session.user.id)
                
                // If profile creation failed, still allow the user to proceed
                // but log the issue
                if (!profile) {
                    console.warn('Could not load or create user profile, but allowing login to proceed')
                }
            } catch (profileError) {
                console.error('Profile initialization failed, but allowing access:', profileError)
            }
        } else {
            console.log('No session found during initialization')
        }
        
        // Mark auth as ready
        window.authReady = true
        console.log('Auth module ready')
        
    } catch (error) {
        console.error('Error initializing session:', error)
        // Still mark as ready even if there was an error
        window.authReady = true
    }
}

// Event listeners for forms
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize session first
    await initializeSession()
    
    // Check authentication and redirect if needed
    await checkAuthAndRedirect()
    
    // Signup form handler
    const signupForm = document.querySelector('#signup-form')
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault()
            
            const email = document.querySelector('#signup-email').value
            const password = document.querySelector('#signup-password').value
            
            if (!email || !password) {
                alert('Please fill in all fields')
                return
            }
            
            await signUp(email, password)
        })
    }
    
    // Login form handler
    const loginForm = document.querySelector('#login-form')
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault()
            
            const email = document.querySelector('#login-email').value
            const password = document.querySelector('#login-password').value
            
            if (!email || !password) {
                alert('Please fill in all fields')
                return
            }
            
            await signIn(email, password)
        })
    }
    
    // Logout button handler
    const logoutBtn = document.querySelector('#logout-btn')
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault()
            await signOut()
        })
    }
})

// Debug function to manually create profile
window.createProfileManually = async function() {
    const { data: { session } } = await supabaseClient.auth.getSession()
    if (session) {
        // Check if user is already an admin
        const isAdmin = await checkAdminStatus(session.user.id)
        if (isAdmin) {
            console.log('User is already an admin, skipping profile creation')
            return null
        }
        
        console.log('Creating profile for user:', session.user.id)
        const result = await createUserProfile(session.user.id)
        console.log('Profile creation result:', result)
        return result
    } else {
        console.log('No active session')
        return null
    }
}

// Debug function to check session state
window.checkSessionState = async function() {
    const { data: { session } } = await supabaseClient.auth.getSession()
    console.log('Current session:', session)
    console.log('Current user:', currentUser)
    console.log('User profile:', userProfile)
    console.log('Redirect flag:', window.authRedirecting)
    return { session, currentUser, userProfile, redirecting: window.authRedirecting }
}