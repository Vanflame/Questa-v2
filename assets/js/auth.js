// Authentication Module
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Global variables
let currentUser = null
let userProfile = null
let isAccountDisabled = false

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
        
        // Check if account is disabled
        isAccountDisabled = userProfile.is_active === false
        console.log('Account disabled status:', isAccountDisabled)
        
        // Make profile and status available globally
        window.userProfile = userProfile
        window.isAccountDisabled = isAccountDisabled
        
        return profileData
    } catch (error) {
        console.error('Error loading user profile:', error)
        return null
    }
}

// Create user profile with fallback mechanism
async function createUserProfile(userId) {
    try {
        console.log('Creating profile for user:', userId)
        
        // First check if profile already exists
        const { data: existingProfile, error: checkError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
        
        if (existingProfile && !checkError) {
            console.log('Profile already exists, returning existing profile')
            userProfile = existingProfile
            return existingProfile
        }
        
        // Get user email from auth
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            console.error('Error getting user info:', userError)
            return null
        }
        
        console.log('User email:', user.email)
        
        // Try to create profile with upsert (insert or update)
        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .upsert({
                id: userId,
                email: user.email,
                role: 'user',
                balance: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            })
            .select()
            .single()
        
        if (profileError) {
            console.error('Error creating/updating profile:', profileError)
            
            // Try with minimal data using upsert
            const { data: minimalProfileData, error: minimalError } = await supabaseClient
                .from('profiles')
            .upsert({
                    id: userId,
                    email: user.email
                }, {
                    onConflict: 'id'
                })
                .select()
                .single()
            
            if (minimalError) {
                console.error('Error creating minimal profile:', minimalError)
                return null
            }
            
            console.log('Minimal profile created/updated successfully')
            userProfile = minimalProfileData
            return minimalProfileData
        }
        
        console.log('Profile created/updated successfully')
        userProfile = profileData
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
            
            // Check admin status and enforce strict separation
            try {
                const isAdmin = await checkAdminStatus(currentUser.id)
                console.log('Admin check result:', isAdmin)
                
                // STRICT ADMIN SEPARATION - Admins can ONLY access admin panel
                if (isAdmin) {
                    if (currentPath.startsWith('/admin')) {
                        // Admin accessing admin panel - allow
                        console.log('Admin accessing admin panel - allowed')
                        hideLoading()
                        return
                    } else {
                        // Admin trying to access non-admin areas - redirect to admin panel
                        console.log('Admin user accessing non-admin area, redirecting to admin panel')
                        hideLoading()
                        window.authRedirecting = true
                        window.location.href = '/admin'
                        return
                    }
                } else {
                    // Regular user trying to access admin panel - BLOCK COMPLETELY
                    if (currentPath.startsWith('/admin')) {
                        console.log('Regular user attempting admin access - BLOCKED')
                        hideLoading()
                        window.authRedirecting = true
                        
                        // Show access denied modal instead of simple alert
                        if (window.openModal) {
                            window.openModal({
                                title: 'Access Denied',
                                content: `
                                    <div class="modal-error-content">
                                        <div class="modal-icon error">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                            </svg>
                                        </div>
                                        <h3>Admin Access Required</h3>
                                        <p>You don't have permission to access the admin panel.</p>
                                        <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                            <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                                <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                                <span style="text-align: left;">Only users with admin privileges can access this area.</span>
                                            </p>
                                        </div>
                                        <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">Contact an administrator if you believe this is an error.</p>
                                    </div>
                                `,
                                primaryButton: { text: 'Go to Dashboard', action: () => {
                                    window.closeModal()
                                    window.location.href = '/dashboard'
                                }},
                                closable: false
                            })
                        } else {
                            alert('Access denied. Admin privileges required.')
                            window.location.href = '/dashboard'
                        }
                        return
                    }
                }
            } catch (adminError) {
                console.error('Admin check failed:', adminError)
                // If admin check fails and user is trying to access admin, block access
                if (currentPath.startsWith('/admin')) {
                    hideLoading()
                    window.authRedirecting = true
                    window.location.href = '/dashboard'
                    return
                }
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
    // Don't call showLoading() here - let the calling code handle it
    
    try {
        console.log('Attempting to sign up user:', email)
        
        // Check if user already exists in profiles table
        const { data: existingProfiles, error: profileCheckError } = await supabaseClient
            .from('profiles')
            .select('id, email')
            .eq('email', email)
        
        if (existingProfiles && existingProfiles.length > 0) {
            console.log('User already exists in profiles table, preventing duplicate registration')
            // Don't call hideLoading() here - let the calling code handle it
            if (window.openModal) {
                window.openModal({
                    title: 'Account Already Exists',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                Email Already Registered
                            </h4>
                            <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                An account with this email address already exists. Please try logging in instead.
                            </p>
                            <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-warning);">
                                <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                    <span class="custom-icon info-icon"></span> If you forgot your password, you can reset it from the login page.
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: {
                        text: 'Go to Login',
                        action: () => {
                            window.closeModal()
                            window.location.href = '/login'
                        }
                    },
                    secondaryButton: {
                        text: 'Try Different Email',
                        action: () => window.closeModal()
                    },
                    closable: true
                })
            } else {
                alert('This email is already registered. Please try logging in instead.')
            }
            return false
        }
        
        // Additional check: Try to sign in with dummy password to see if user exists in auth
        try {
            const { data: authCheck, error: authCheckError } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: 'dummy_password_check_12345'
            })
            
            // If we get here without error, user exists in auth system
            if (authCheck && authCheck.user) {
                console.log('User exists in auth system, preventing duplicate registration')
                // Don't call hideLoading() here - let the calling code handle it
                if (window.openModal) {
                    window.openModal({
                        title: 'Account Already Exists',
                        content: `
                            <div class="modal-error-content">
                                <div class="modal-icon error">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>
                                <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                    Email Already Registered
                                </h4>
                                <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                    An account with this email address already exists. Please try logging in instead.
                                </p>
                                <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-warning);">
                                    <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                        <span class="custom-icon info-icon"></span> If you forgot your password, you can reset it from the login page.
                                    </p>
                                </div>
                            </div>
                        `,
                        primaryButton: {
                            text: 'Go to Login',
                            action: () => {
                                window.closeModal()
                                window.location.href = '/login'
                            }
                        },
                        secondaryButton: {
                            text: 'Try Different Email',
                            action: () => window.closeModal()
                        },
                        closable: true
                    })
                } else {
                    alert('This email is already registered. Please try logging in instead.')
                }
                return false
            }
        } catch (dummySignInError) {
            // Expected error - user doesn't exist, continue with registration
            console.log('User does not exist in auth system, proceeding with registration')
        }
        
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        })
        
        if (error) {
            // Don't call hideLoading() here - let the calling code handle it
            console.error('Sign up error:', error)
            
            // Handle specific error cases with better messaging
            console.log('Full error object:', error)
            console.log('Error details:', {
                message: error.message,
                code: error.code,
                status: error.status,
                statusCode: error.statusCode
            })
            
            // Check for invalid email format FIRST
            const isInvalidEmail = 
                error.message?.toLowerCase().includes('email address') && error.message?.toLowerCase().includes('invalid') ||
                error.message?.toLowerCase().includes('invalid email') ||
                error.message?.toLowerCase().includes('email format') ||
                error.code === 'email_address_invalid' ||
                error.code === 'invalid_email'
            
            console.log('Error analysis:', {
                message: error.message,
                code: error.code,
                isInvalidEmail: isInvalidEmail
            })
            
            if (isInvalidEmail) {
                // Show invalid email modal
                if (window.openModal) {
                    window.openModal({
                        title: 'Invalid Email Address',
                        content: `
                            <div class="modal-error-content">
                                <div class="modal-icon error">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>
                                <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                    Invalid Email Format
                                </h4>
                                <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                    Please enter a valid email address. The email format you entered is not recognized.
                                </p>
                                <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-error);">
                                    <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                        <span class="custom-icon info-icon"></span> Make sure to use a valid email format like: example@domain.com
                                    </p>
                                </div>
                            </div>
                        `,
                        primaryButton: {
                            text: 'Try Again',
                            action: () => window.closeModal()
                        },
                        closable: true
                    })
                } else {
                    alert('Invalid email address. Please enter a valid email format.')
                }
            } else {
                // Check for duplicate email errors - only if not invalid email
            const isDuplicateEmail = 
                error.message?.toLowerCase().includes('already registered') || 
                error.message?.toLowerCase().includes('already been registered') ||
                error.message?.toLowerCase().includes('user already registered') ||
                error.message?.toLowerCase().includes('email address already registered') ||
                error.message?.toLowerCase().includes('duplicate key value') ||
                error.message?.toLowerCase().includes('violates unique constraint') ||
                error.message?.toLowerCase().includes('user with this email already exists') ||
                error.message?.toLowerCase().includes('email already exists') ||
                error.code === 'signup_disabled' ||
                error.code === 'user_already_exists' ||
                    error.code === 'email_address_not_authorized'
            
            if (isDuplicateEmail) {
                // Show user already exists modal
                if (window.openModal) {
                    window.openModal({
                        title: 'Account Already Exists',
                        content: `
                            <div class="modal-error-content">
                                <div class="modal-icon error">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>
                                <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                    Email Already Registered
                                </h4>
                                <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                    An account with this email address already exists. Please try logging in instead.
                                </p>
                                <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-warning);">
                                    <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                        <span class="custom-icon info-icon"></span> If you forgot your password, you can reset it from the login page.
                                    </p>
                                </div>
                            </div>
                        `,
                        primaryButton: {
                            text: 'Go to Login',
                            action: () => {
                                window.closeModal()
                                window.location.href = '/login'
                            }
                        },
                        secondaryButton: {
                            text: 'Try Different Email',
                            action: () => window.closeModal()
                        },
                        closable: true
                    })
                } else {
                    alert('This email is already registered. Please try logging in instead.')
                }
            } else {
                // Check for other common error patterns
                console.log('Checking for other error patterns:', {
                    message: error.message,
                    code: error.code,
                    status: error.status,
                    statusCode: error.statusCode
                })
                
                // Generic error handling
                if (window.openModal) {
                    window.openModal({
                        title: 'Registration Error',
                        content: `
                            <div class="modal-error-content">
                                <div class="modal-icon error">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>
                                <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                    Registration Failed
                                </h4>
                                <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                    ${error.message}
                                </p>
                                <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-error);">
                                    <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                        <span class="custom-icon info-icon"></span> Please check your information and try again.
                                    </p>
                                </div>
                            </div>
                        `,
                        primaryButton: {
                            text: 'Try Again',
                            action: () => window.closeModal()
                        },
                        closable: true
                    })
                } else {
                    alert('Sign up error: ' + error.message)
                }
                }
            }
            return false
        }
        
        console.log('Sign up response:', data)
        
        if (data.user) {
            console.log('User created:', data.user)
            console.log('Email confirmed at:', data.user.email_confirmed_at)
            
            // Check if email confirmation is required FIRST
            if (!data.user.email_confirmed_at) {
                console.log('Email confirmation required')
                // Don't call hideLoading() here - let the calling code handle it
                // Show email confirmation modal
                if (window.openModal) {
                    window.openModal({
                        title: 'Email Confirmation Required',
                        content: `
                            <div class="modal-info-content">
                                <div class="modal-icon info">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>
                                <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                    Check Your Email
                                </h4>
                                <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                    We've sent you a confirmation email. Please check your inbox and click the confirmation link to activate your account.
                                </p>
                                <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-info);">
                                    <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                        <span class="custom-icon email-icon"></span> After confirming your email, you can log in to your account.
                                    </p>
                                </div>
                            </div>
                        `,
                        primaryButton: {
                            text: 'Go to Login',
                            action: () => {
                                window.closeModal()
                                window.location.href = '/login'
                            }
                        },
                        closable: false
                    })
                } else {
                    // Fallback to alert if modal not available
                    alert('Account created successfully! Please check your email to confirm your account before logging in.')
                    window.location.href = '/login'
                }
                return true
            }
            
            // If email is already confirmed, check if this is actually a new user or an existing one
            if (data.user.email_confirmed_at !== null && data.user.created_at) {
                const createdAt = new Date(data.user.created_at)
                const now = new Date()
                const timeDiff = now - createdAt
                
                // If user was created more than 5 seconds ago, it's likely an existing user
                if (timeDiff > 5000) {
                    console.log('User appears to be existing (created long ago):', data.user.created_at)
                    // Don't call hideLoading() here - let the calling code handle it
                    if (window.openModal) {
                        window.openModal({
                            title: 'Account Already Exists',
                            content: `
                                <div class="modal-error-content">
                                    <div class="modal-icon error">
                                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </div>
                                    <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                        Email Already Registered
                                    </h4>
                                    <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                        An account with this email address already exists. Please try logging in instead.
                                    </p>
                                    <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-warning);">
                                        <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                            <span class="custom-icon info-icon"></span> If you forgot your password, you can reset it from the login page.
                                        </p>
                                    </div>
                                </div>
                            `,
                            primaryButton: {
                                text: 'Go to Login',
                                action: () => {
                                    window.closeModal()
                                    window.location.href = '/login'
                                }
                            },
                            secondaryButton: {
                                text: 'Try Different Email',
                                action: () => window.closeModal()
                            },
                            closable: true
                        })
                    } else {
                        alert('This email is already registered. Please try logging in instead.')
                    }
                    return false
                }
            }
            
            // Additional check: If user already has a session, they might be trying to register again
            const { data: { session } } = await supabaseClient.auth.getSession()
            if (session && session.user && session.user.email === email) {
                console.log('User already has an active session, preventing duplicate registration')
                // Don't call hideLoading() here - let the calling code handle it
                if (window.openModal) {
                    window.openModal({
                        title: 'Account Already Exists',
                        content: `
                            <div class="modal-error-content">
                                <div class="modal-icon error">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>
                                <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                    Email Already Registered
                                </h4>
                                <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                    An account with this email address already exists. Please try logging in instead.
                                </p>
                                <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-warning);">
                                    <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                        <span class="custom-icon info-icon"></span> If you forgot your password, you can reset it from the login page.
                                    </p>
                                </div>
                            </div>
                        `,
                        primaryButton: {
                            text: 'Go to Login',
                            action: () => {
                                window.closeModal()
                                window.location.href = '/login'
                            }
                        },
                        secondaryButton: {
                            text: 'Try Different Email',
                            action: () => window.closeModal()
                        },
                        closable: true
                    })
                } else {
                    alert('This email is already registered. Please try logging in instead.')
                }
                return false
            }
            
            // Only create profile if email is already confirmed
            console.log('Email is confirmed, proceeding with profile creation')
            
            // Try to create profile with better error handling
            console.log('Attempting manual profile creation')
            try {
                // First check if profile already exists
                const { data: existingProfile, error: checkError } = await supabaseClient
                    .from('profiles')
                    .select('id')
                    .eq('id', data.user.id)
                    .single()
                
                if (existingProfile) {
                    console.log('Profile already exists, skipping creation')
                } else {
                    // Create profile with minimal required fields
                const { error: profileError } = await supabaseClient
                    .from('profiles')
                    .insert({
                        id: data.user.id,
                        email: email,
                        role: 'user',
                            balance: 0,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                })
                
                if (profileError) {
                    console.error('Error creating user profile:', profileError)
                        
                        // Try alternative approach - create with just essential fields
                        const { error: altProfileError } = await supabaseClient
                            .from('profiles')
                            .insert({
                                id: data.user.id,
                                email: email
                            })
                        
                        if (altProfileError) {
                            console.error('Alternative profile creation also failed:', altProfileError)
                            // Profile creation failed, but account still works
                            // Show success modal instead of warning
                    if (window.openModal) {
                        window.openModal({
                                    title: 'Account Created Successfully!',
                            content: `
                                        <div class="modal-success-content">
                                            <div class="modal-icon success">
                                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </div>
                                    <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                                Welcome to Questa!
                                    </h4>
                                    <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                                Your account has been created successfully. You can now log in and start earning rewards.
                                    </p>
                                            <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-success);">
                                        <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                                    🚀 Your profile will be automatically set up when you first log in.
                                        </p>
                                    </div>
                                </div>
                            `,
                            primaryButton: {
                                text: 'Go to Login',
                                action: () => {
                                    window.closeModal()
                                    window.location.href = '/login'
                                }
                            },
                            closable: true
                        })
                    } else {
                        alert('Account created successfully! You can now log in.')
                        window.location.href = '/login'
                    }
                    return true
                        } else {
                            console.log('Profile created successfully with alternative method')
                        }
                    } else {
                        console.log('Profile created successfully')
                    }
                }
                
                // Don't call hideLoading() here - let the calling code handle it
                // Show success modal
                if (window.openModal) {
                    window.openModal({
                        title: 'Account Created Successfully!',
                        content: `
                            <div class="modal-success-content">
                                <div class="modal-icon success">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>
                                <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                    Welcome to Questa!
                                </h4>
                                <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                    Your account has been created successfully.
                                </p>
                                <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-success);">
                                    <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                        🚀 You can now log in to access your dashboard...
                                    </p>
                                </div>
                            </div>
                        `,
                        primaryButton: {
                            text: 'Go to Login',
                            action: () => {
                                window.closeModal()
                                window.location.href = '/login'
                            }
                        },
                        closable: false
                    })
                } else {
                    alert('Account created successfully! Please log in to continue.')
                    window.location.href = '/login'
                }
            } catch (profileError) {
                console.error('Error creating profile:', profileError)
                // Don't call hideLoading() here - let the calling code handle it
                alert('Account created but profile setup failed. Please try logging in.')
                window.location.href = '/login'
            }
        } else {
            // Don't call hideLoading() here - let the calling code handle it
            alert('Sign up failed. Please try again.')
            return false
        }
        
        return true
    } catch (error) {
        // Don't call hideLoading() here - let the calling code handle it
        console.error('Sign up error:', error)
        alert('Sign up error: ' + error.message)
        return false
    }
}

export async function signIn(email, password) {
    // Don't call showLoading() here - let the calling code handle it
    
    try {
        console.log('Attempting to sign in user:', email)
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        })
        
        if (error) {
            console.error('Sign in error:', error)
            console.log('Error details:', {
                message: error.message,
                code: error.code,
                status: error.status
            })
            // Don't call hideLoading() here - let the calling code handle it
            
            // Check for email confirmation error
            const isEmailNotConfirmed = 
                error.message?.toLowerCase().includes('email not confirmed') ||
                error.message?.toLowerCase().includes('email not verified') ||
                error.message?.toLowerCase().includes('email confirmation') ||
                error.message?.toLowerCase().includes('confirm your email') ||
                error.code === 'email_not_confirmed' ||
                error.code === 'email_not_verified'
            
            if (isEmailNotConfirmed) {
                // Show email confirmation required modal
                if (window.openModal) {
                    window.openModal({
                        title: 'Email Confirmation Required',
                        content: `
                            <div class="modal-info-content">
                                <div class="modal-icon warning">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10.29 3.86L1.82 18.13C1.64 18.43 1.63 18.78 1.79 19.09C1.96 19.41 2.29 19.6 2.66 19.6H21.34C21.71 19.6 22.04 19.41 22.21 19.09C22.37 18.78 22.36 18.43 22.18 18.13L13.71 3.86C13.54 3.56 13.22 3.38 12.87 3.38C12.52 3.38 12.2 3.56 12.03 3.86L10.29 3.86ZM12 16C12.5523 16 13 15.5523 13 15C13 14.4477 12.5523 14 12 14C11.4477 14 11 14.4477 11 15C11 15.5523 11.4477 16 12 16ZM12 10C12.5523 10 13 9.55228 13 9V7C13 6.44772 12.5523 6 12 6C11.4477 6 11 6.44772 11 7V9C11 9.55228 11.4477 10 12 10Z" fill="currentColor"/>
                                    </svg>
                                </div>
                                <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                    Email Confirmation Required
                                </h4>
                                <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                    Please check your email and click the confirmation link to activate your account before logging in.
                                </p>
                                <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-warning);">
                                    <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                        <span class="custom-icon email-icon"></span> Check your inbox for the confirmation email we sent when you registered.
                                    </p>
                                </div>
                            </div>
                        `,
                        primaryButton: {
                            text: 'Resend Confirmation Email',
                            action: () => {
                                window.closeModal()
                                // Resend confirmation email
                                supabaseClient.auth.resend({
                                    type: 'signup',
                                    email: email
                                }).then(({ error }) => {
                                    if (error) {
                                        console.error('Error resending confirmation:', error)
                                        if (window.openModal) {
                                            window.openModal({
                                                title: 'Error',
                                                content: `
                                                    <div class="modal-error-content">
                                                        <div class="modal-icon error">
                                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                            </svg>
                                                        </div>
                                                        <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                                            Error Sending Email
                                                        </h4>
                                                        <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                                            ${error.message || 'Failed to resend confirmation email. Please try again.'}
                                                        </p>
                                                    </div>
                                                `,
                                                primaryButton: {
                                                    text: 'Try Again',
                                                    action: () => window.closeModal()
                                                },
                                                closable: true
                                            })
                                        } else {
                                            alert('Error resending confirmation email. Please try again.')
                                        }
                                    } else {
                                        if (window.openModal) {
                                            window.openModal({
                                                title: 'Email Sent Successfully',
                                                content: `
                                                    <div class="modal-success-content">
                                                        <div class="modal-icon success">
                                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                            </svg>
                                                        </div>
                                                        <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                                            Confirmation Email Sent
                                                        </h4>
                                                        <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                                            We've sent you a new confirmation email. Please check your inbox and click the confirmation link to activate your account.
                                                        </p>
                                                        <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-success);">
                                                            <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                                                <span class="custom-icon email-icon"></span> Check your spam folder if you don't see the email in your inbox.
                                                            </p>
                                                        </div>
                                                    </div>
                                                `,
                                                primaryButton: {
                                                    text: 'Got It',
                                                    action: () => window.closeModal()
                                                },
                                                closable: true
                                            })
                                        } else {
                                            alert('Confirmation email sent! Please check your inbox.')
                                        }
                                    }
                                })
                            }
                        },
                        secondaryButton: {
                            text: 'Try Again',
                            action: () => window.closeModal()
                        },
                        closable: true
                    })
                } else {
                    alert('Please confirm your email before logging in. Check your inbox for the confirmation email.')
                }
            } else {
                // Show generic login error modal for other errors
            if (window.openModal) {
                window.openModal({
                    title: 'Login Failed',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 15H12.01M12 12V9M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                Invalid Credentials
                            </h4>
                            <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                ${error.message}
                            </p>
                            <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-error);">
                                <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                    <span class="custom-icon search-icon"></span> Please check your email and password and try again.
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: {
                        text: 'Try Again',
                        action: () => window.closeModal()
                    },
                    secondaryButton: {
                        text: 'Forgot Password?',
                        action: () => {
                            console.log('Forgot Password button clicked from error modal')
                            window.closeModal()
                            
                            // Wait for modal to close, then show forgot password modal
                            setTimeout(() => {
                                console.log('Opening forgot password modal after error modal closed')
                                if (window.openModal) {
                                    window.openModal({
                                    title: 'Forgot Password',
                                    content: `
                                        <div class="modal-info-content">
                                            <div class="modal-icon info">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                    <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                </svg>
                                            </div>
                                            <h3>Forgot Your Password?</h3>
                                            <p>Enter your email address and we'll send you a link to reset your password.</p>
                                            <form id="forgot-password-form-error" class="modal-form">
                                                <div class="form-group">
                                                    <label for="reset-email-error">Email Address</label>
                                                    <input 
                                                        type="email" 
                                                        id="reset-email-error" 
                                                        name="email" 
                                                        placeholder="Enter your email address" 
                                                        required
                                                        autocomplete="email"
                                                        autofocus
                                                    >
                                                    <div class="error-message" id="reset-email-error-msg"></div>
                                                </div>
                                                <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05)); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                                    <p style="color: #1f2937; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                                        <span class="custom-icon info-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                                        <span style="text-align: left;">Make sure you enter the email address associated with your Questa account.</span>
                                                    </p>
                                                </div>
                                            </form>
                                        </div>
                                    `,
                                    primaryButton: {
                                        text: 'Send Reset Link',
                                        action: () => {
                                            console.log('Send Reset Link button clicked')
                                            handleForgotPasswordFromError()
                                        }
                                    },
                                    secondaryButton: {
                                        text: 'Cancel',
                                        action: () => window.closeModal()
                                    },
                                    closable: true
                                })
                                }
                            }, 300)
                        }
                    },
                    closable: true
                })
            } else {
                alert('Sign in error: ' + error.message)
                }
            }
            return false
        }
        
        if (data.user) {
            console.log('Sign in successful for user:', data.user.email, data.user.id)
            console.log('Email confirmed at:', data.user.email_confirmed_at)
            
            // Check if email is confirmed
            if (!data.user.email_confirmed_at) {
                console.log('Email not confirmed, showing confirmation modal')
                // Don't call hideLoading() here - let the calling code handle it
                if (window.openModal) {
                    window.openModal({
                        title: 'Email Confirmation Required',
                        content: `
                            <div class="modal-info-content">
                                <div class="modal-icon warning">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10.29 3.86L1.82 18.13C1.64 18.43 1.63 18.78 1.79 19.09C1.96 19.41 2.29 19.6 2.66 19.6H21.34C21.71 19.6 22.04 19.41 22.21 19.09C22.37 18.78 22.36 18.43 22.18 18.13L13.71 3.86C13.54 3.56 13.22 3.38 12.87 3.38C12.52 3.38 12.2 3.56 12.03 3.86L10.29 3.86ZM12 16C12.5523 16 13 15.5523 13 15C13 14.4477 12.5523 14 12 14C11.4477 14 11 14.4477 11 15C11 15.5523 11.4477 16 12 16ZM12 10C12.5523 10 13 9.55228 13 9V7C13 6.44772 12.5523 6 12 6C11.4477 6 11 6.44772 11 7V9C11 9.55228 11.4477 10 12 10Z" fill="currentColor"/>
                                    </svg>
                                </div>
                                <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                    Email Confirmation Required
                                </h4>
                                <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                    Please check your email and click the confirmation link to activate your account before logging in.
                                </p>
                                <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-warning);">
                                    <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                        <span class="custom-icon email-icon"></span> Check your inbox for the confirmation email we sent when you registered.
                                    </p>
                                </div>
                            </div>
                        `,
                        primaryButton: {
                            text: 'Resend Confirmation Email',
                            action: () => {
                                window.closeModal()
                                // Resend confirmation email
                                supabaseClient.auth.resend({
                                    type: 'signup',
                                    email: data.user.email
                                }).then(({ error }) => {
                                    if (error) {
                                        console.error('Error resending confirmation:', error)
                                        if (window.openModal) {
                                            window.openModal({
                                                title: 'Error',
                                                content: `
                                                    <div class="modal-error-content">
                                                        <div class="modal-icon error">
                                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                            </svg>
                                                        </div>
                                                        <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                                            Error Sending Email
                                                        </h4>
                                                        <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                                            ${error.message || 'Failed to resend confirmation email. Please try again.'}
                                                        </p>
                                                    </div>
                                                `,
                                                primaryButton: {
                                                    text: 'Try Again',
                                                    action: () => window.closeModal()
                                                },
                                                closable: true
                                            })
                                        } else {
                                            alert('Error resending confirmation email. Please try again.')
                                        }
                                    } else {
                                        if (window.openModal) {
                                            window.openModal({
                                                title: 'Email Sent Successfully',
                                                content: `
                                                    <div class="modal-success-content">
                                                        <div class="modal-icon success">
                                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                            </svg>
                                                        </div>
                                                        <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                                                            Confirmation Email Sent
                                                        </h4>
                                                        <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                                                            We've sent you a new confirmation email. Please check your inbox and click the confirmation link to activate your account.
                                                        </p>
                                                        <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-success);">
                                                            <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                                                <span class="custom-icon email-icon"></span> Check your spam folder if you don't see the email in your inbox.
                                                            </p>
                                                        </div>
                                                    </div>
                                                `,
                                                primaryButton: {
                                                    text: 'Got It',
                                                    action: () => window.closeModal()
                                                },
                                                closable: true
                                            })
                                        } else {
                                            alert('Confirmation email sent! Please check your inbox.')
                                        }
                                    }
                                })
                            }
                        },
                        secondaryButton: {
                            text: 'Go to Login',
                            action: () => {
                                window.closeModal()
                                window.location.href = '/login'
                            }
                        },
                        closable: true
                    })
                } else {
                    alert('Please confirm your email before logging in. Check your inbox for the confirmation email.')
                    window.location.href = '/login'
                }
                return false
            }
            
            currentUser = data.user
            // Load user profile
            const profile = await loadUserProfile(data.user.id)
            console.log('Profile after sign in:', profile ? 'Loaded successfully' : 'Failed to load')
            // Don't call hideLoading() here - let the calling code handle it
            console.log('Redirecting to dashboard')
            window.location.href = '/dashboard'
        }
        
        return true
    } catch (error) {
        console.error('Sign in error:', error)
        // Don't call hideLoading() here - let the calling code handle it
        
        // Show login error modal for unexpected errors
        if (window.openModal) {
            window.openModal({
                title: 'Login Error',
                content: `
                    <div class="modal-error-content">
                        <div class="modal-icon error">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64584 18.3024 1.5729 18.6453 1.61286 18.9873C1.65282 19.3293 1.80334 19.6547 2.04238 19.9101C2.28142 20.1655 2.59668 20.3373 2.93984 20.3998C3.283 20.4623 3.636 20.4126 3.95 20.257L12 16.77L20.05 20.257C20.364 20.4126 20.717 20.4623 21.0602 20.3998C21.4033 20.3373 21.7186 20.1655 21.9576 19.9101C22.1967 19.6547 22.3472 19.3293 22.3871 18.9873C22.4271 18.6453 22.3542 18.3024 22.18 18L13.71 3.86C13.5322 3.56622 13.2515 3.34751 12.9182 3.24293C12.5849 3.13835 12.2194 3.15502 11.8988 3.28935C11.5782 3.42368 11.3219 3.66758 11.1773 3.97454C11.0327 4.2815 11.0095 4.63026 11.1127 4.954L12 7.33L10.89 4.954C10.7868 4.63026 10.7636 4.2815 10.9082 3.97454C11.0528 3.66758 11.3091 3.42368 11.6297 3.28935C11.9503 3.15502 12.3158 3.13835 12.6491 3.24293C12.9824 3.34751 13.2631 3.56622 13.4409 3.86H13.71Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                            Connection Error
                        </h4>
                        <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                            ${error.message || 'An unexpected error occurred. Please try again.'}
                        </p>
                        <div style="background: var(--color-bg); padding: 16px; border-radius: 8px; border-left: 4px solid var(--color-warning);">
                            <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.4;">
                                🌐 Please check your internet connection and try again.
                            </p>
                        </div>
                    </div>
                `,
                primaryButton: {
                    text: 'Try Again',
                    action: () => window.closeModal()
                },
                closable: true
            })
        } else {
            alert('Sign in error: ' + error.message)
        }
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

// Handle forgot password from error modal
async function handleForgotPasswordFromError() {
    console.log('handleForgotPasswordFromError called')
    
    const emailInput = document.getElementById('reset-email-error')
    const emailError = document.getElementById('reset-email-error-msg')
    
    console.log('Email input:', emailInput)
    console.log('Email error:', emailError)
    
    if (!emailInput || !emailError) {
        console.log('Email input or error element not found')
        return
    }
    
    const email = emailInput.value.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    console.log('Email value:', email)
    
    // Clear previous errors
    emailError.textContent = ''
    emailInput.classList.remove('error')
    
    if (!email) {
        emailError.textContent = 'Email address is required'
        emailInput.classList.add('error')
        console.log('Email is required')
        return
    }
    
    if (!emailRegex.test(email)) {
        emailError.textContent = 'Please enter a valid email address'
        emailInput.classList.add('error')
        console.log('Invalid email format')
        return
    }
    
    console.log('Calling resetPassword function')
    
    // Show loading state
    const modal = document.querySelector('.modal-container')
    if (modal) {
        modal.style.opacity = '0.7'
        modal.style.pointerEvents = 'none'
    }
    
    // Call the reset password function
    const success = await resetPassword(email)
    
    console.log('Reset password result:', success)
    
    if (success) {
        // Modal will be replaced by the success modal from resetPassword function
        console.log('Password reset successful')
    } else {
        console.log('Password reset failed, re-enabling modal')
        // Re-enable modal if there was an error
        const modal = document.querySelector('.modal-container')
        if (modal) {
            modal.style.opacity = '1'
            modal.style.pointerEvents = 'auto'
        }
    }
}

// Forgot Password Function
export async function resetPassword(email) {
    try {
        console.log('Attempting to reset password for:', email)
        
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
        })
        
        console.log('Supabase response - data:', data)
        console.log('Supabase response - error:', error)
        
        if (error) {
            console.error('Password reset error:', error)
            
            // Show error modal directly - it will replace the current modal
            if (window.openModal) {
                window.openModal({
                    title: 'Password Reset Failed',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Unable to Send Reset Email</h3>
                            <p>We encountered an error while trying to send the password reset email.</p>
                            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">${error.message}</span>
                                </p>
                            </div>
                            <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">Please check your email address and try again, or contact support if the problem persists.</p>
                        </div>
                    `,
                    primaryButton: { text: 'Try Again', action: () => closeModal() },
                    secondaryButton: { text: 'Contact Support', action: () => {
                        closeModal()
                        // You can add contact support functionality here
                        alert('Please email support@questa.com for assistance.')
                    }}
                })
            } else {
                alert('Password reset failed: ' + error.message)
            }
            
            return false
        }
        
        if (data) {
            console.log('Password reset email sent successfully')
            console.log('Data received:', data)
            
            // Show success modal directly - it will replace the current modal
            if (window.openModal) {
                console.log('Opening success modal')
                window.openModal({
                    title: 'Password Reset Email Sent',
                    content: `
                        <div class="modal-success-content">
                            <div class="modal-icon success">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h3>Check Your Email</h3>
                            <p>We've sent a secure password reset link to <strong style="color: var(--color-primary);">${email}</strong></p>
                            <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05)); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #064e3b; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon email-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">Click the link in the email to reset your password. The link will expire in 24 hours.</span>
                                </p>
                            </div>
                            <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">If you don't see the email in your inbox, please check your spam or junk folder.</p>
                        </div>
                    `,
                    primaryButton: { text: 'Got It', action: () => closeModal() },
                    secondaryButton: { text: 'Back to Login', action: () => {
                        closeModal()
                        // Optionally redirect to login or stay on current page
                    }}
                })
            } else {
                alert('Password reset email sent successfully!')
            }
            
            return true
        }
        
        return false
    } catch (error) {
        console.error('Password reset error:', error)
        
        // Show error modal for unexpected errors - it will replace the current modal
        if (window.openModal) {
            window.openModal({
                title: 'Password Reset Failed',
                content: `
                    <div class="modal-error-content">
                        <div class="modal-icon error">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <h3>Unexpected Error</h3>
                        <p>We encountered an unexpected error while trying to reset your password.</p>
                        <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">Please try again or contact support if the problem persists</span>
                            </p>
                        </div>
                        <p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">This is usually a temporary issue. Please wait a moment and try again.</p>
                    </div>
                `,
                primaryButton: { text: 'Try Again', action: () => closeModal() },
                secondaryButton: { text: 'Contact Support', action: () => {
                    closeModal()
                    alert('Please email support@questa.com for assistance.')
                }}
            })
        } else {
            alert('Password reset failed. Please try again.')
        }
        
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
    
    // Note: Form handlers are now handled by dedicated auth files:
    // - auth-login.js for login form validation and submission
    // - auth-register.js for register form validation and submission
    // These provide better UX with inline validation and modal feedback
    
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

// Check if account is disabled
function isAccountDisabledCheck() {
    return window.isAccountDisabled === true
}

// Show account disabled message
function showAccountDisabledMessage() {
    if (window.openModal) {
        window.openModal({
            title: 'Account Disabled',
            content: `
                <div class="modal-error-content">
                    <div class="modal-icon error">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <h3>Account Disabled</h3>
                    <p>Your account has been disabled by an administrator. You cannot access most features of the platform.</p>
                    <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                        <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                            <span class="custom-icon warning-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                            <span style="text-align: left;">Please contact support if you believe this is an error.</span>
                        </p>
                    </div>
                </div>
            `,
            primaryButton: { text: 'OK', action: () => window.closeModal() },
            closable: false
        })
    } else {
        alert('Your account has been disabled by an administrator. Please contact support if you believe this is an error.')
    }
}

// Export functions to window for global access
window.signOut = signOut
window.signUp = signUp
window.signIn = signIn
window.resetPassword = resetPassword
window.getCurrentUser = getCurrentUser
window.getUserProfile = getUserProfile
window.createProfileManually = createProfileManually
window.isAccountDisabledCheck = isAccountDisabledCheck
window.showAccountDisabledMessage = showAccountDisabledMessage

// Debug function to check session state
window.checkSessionState = async function() {
    const { data: { session } } = await supabaseClient.auth.getSession()
    console.log('Current session:', session)
    console.log('Current user:', currentUser)
    console.log('User profile:', userProfile)
    console.log('Redirect flag:', window.authRedirecting)
    return { session, currentUser, userProfile, redirecting: window.authRedirecting }
}