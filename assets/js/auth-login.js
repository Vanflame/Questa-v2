// Login Page Handler
// Handles form validation and login functionality

import { signIn } from './auth.js'

// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Form validation rules
const VALIDATION_RULES = {
    email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Please enter a valid email address'
    },
    password: {
        required: true,
        message: 'Password is required'
    }
}

// DOM elements
let form, submitBtn, btnText, btnSpinner

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    form = document.getElementById('login-form')
    submitBtn = document.getElementById('submit-btn')
    btnText = submitBtn?.querySelector('.btn-text')
    btnSpinner = submitBtn?.querySelector('.btn-spinner')
    
    if (!form || !submitBtn) {
        console.error('Required form elements not found')
        return
    }
    
    // Add form event listeners
    form.addEventListener('submit', handleSubmit)
    
    // Add real-time validation
    const inputs = form.querySelectorAll('input')
    inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input))
        input.addEventListener('input', () => clearFieldError(input))
    })
    
    // Password toggle functionality
    const passwordToggle = document.getElementById('toggle-login-password')
    
    if (passwordToggle) {
        passwordToggle.addEventListener('click', () => togglePasswordVisibility('login-password', passwordToggle))
    }
    
    console.log('Login page initialized')
})

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault()
    
    console.log('Login form submission started')
    
    // Validate all fields
    const isValid = validateForm()
    if (!isValid) {
        console.log('Form validation failed')
        return
    }
    
    // Get form data
    const formData = new FormData(form)
    const email = formData.get('email')
    const password = formData.get('password')
    
    // Show loading state
    setLoadingState(true)
    
    try {
        console.log('Attempting login for:', email)
        
        // Use the existing signIn function from auth.js
        const success = await signIn(email, password)
        
        if (success) {
            console.log('Login successful')
            // The auth.js signIn function handles redirect to dashboard
            // No need to show additional modals here
        } else {
            console.log('Login failed')
            // Error handling is done in auth.js - no need to duplicate here
        }
        
    } catch (error) {
        console.error('Login error:', error)
        // Error handling is done in auth.js - no need to duplicate here
    } finally {
        // Hide loading state
        setLoadingState(false)
    }
}

// Password visibility toggle function
function togglePasswordVisibility(inputId, toggleButton) {
    const input = document.getElementById(inputId)
    if (!input) return
    
    const isPassword = input.type === 'password'
    input.type = isPassword ? 'text' : 'password'
    
    // Update button state
    if (isPassword) {
        toggleButton.classList.add('show-password')
        toggleButton.setAttribute('aria-label', 'Hide password')
    } else {
        toggleButton.classList.remove('show-password')
        toggleButton.setAttribute('aria-label', 'Show password')
    }
}

// Validate entire form
function validateForm() {
    let isValid = true
    
    // Validate email
    if (!validateField(document.getElementById('login-email'))) {
        isValid = false
    }
    
    // Validate password
    if (!validateField(document.getElementById('login-password'))) {
        isValid = false
    }
    
    return isValid
}

// Validate individual field
function validateField(field) {
    const fieldName = field.name
    const value = field.value.trim()
    const rules = VALIDATION_RULES[fieldName]
    
    if (!rules) {
        return true // No validation rules for this field
    }
    
    let isValid = true
    let errorMessage = ''
    
    // Check required
    if (rules.required && !value) {
        isValid = false
        errorMessage = 'This field is required'
    }
    
    // Check email pattern
    if (isValid && fieldName === 'email' && rules.pattern && !rules.pattern.test(value)) {
        isValid = false
        errorMessage = rules.message
    }
    
    // Show/hide error
    showFieldError(field, isValid ? '' : errorMessage)
    
    return isValid
}

// Show field error
function showFieldError(field, message) {
    const fieldName = field.name
    const errorElement = document.getElementById(`${fieldName}-error`)
    
    if (!errorElement) return
    
    if (message) {
        errorElement.textContent = message
        errorElement.style.display = 'block'
        field.classList.add('error', 'invalid')
        field.classList.remove('valid')
    } else {
        errorElement.textContent = ''
        errorElement.style.display = 'none'
        field.classList.remove('error', 'invalid')
    }
}

// Clear field error
function clearFieldError(field) {
    const fieldName = field.name
    const errorElement = document.getElementById(`${fieldName}-error`)
    
    if (errorElement && errorElement.textContent) {
        errorElement.textContent = ''
        errorElement.style.display = 'none'
        field.classList.remove('error', 'invalid')
        
        // Add valid state if field has content and no errors
        if (field.value.trim()) {
            field.classList.add('valid')
        }
    }
}

// Set loading state
function setLoadingState(isLoading) {
    if (!submitBtn || !btnText || !btnSpinner) return
    
    submitBtn.disabled = isLoading
    
    if (isLoading) {
        btnText.style.display = 'none'
        btnSpinner.style.display = 'inline-flex'
        btnSpinner.style.animation = 'spin 1s linear infinite'
    } else {
        btnText.style.display = 'inline'
        btnSpinner.style.display = 'none'
        btnSpinner.style.animation = 'none'
    }
}

// Add CSS for error states and loading spinner
if (!document.querySelector('#auth-login-styles')) {
    const styles = document.createElement('style')
    styles.id = 'auth-login-styles'
    styles.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .btn-spinner {
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
    `
    document.head.appendChild(styles)
}

// Forgot Password Functionality
function initForgotPassword() {
    const forgotPasswordLink = document.getElementById('forgot-password-link')
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault()
            showForgotPasswordModal()
        })
    }
}

// Show Forgot Password Modal
function showForgotPasswordModal() {
    if (window.openModal) {
        window.openModal({
            title: 'Reset Password',
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
                    <form id="forgot-password-form" class="modal-form">
                        <div class="form-group">
                            <label for="reset-email">Email Address</label>
                            <input 
                                type="email" 
                                id="reset-email" 
                                name="email" 
                                placeholder="Enter your email address" 
                                required
                                autocomplete="email"
                                autofocus
                            >
                            <div class="error-message" id="reset-email-error"></div>
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
                action: () => handleForgotPasswordSubmit() 
            },
            secondaryButton: { 
                text: 'Cancel', 
                action: () => closeModal() 
            }
        })
        
        // Add form validation to the modal
        setupForgotPasswordValidation()
    }
}

// Setup Forgot Password Form Validation
function setupForgotPasswordValidation() {
    const form = document.getElementById('forgot-password-form')
    const emailInput = document.getElementById('reset-email')
    const emailError = document.getElementById('reset-email-error')
    
    if (form && emailInput && emailError) {
        // Real-time validation
        emailInput.addEventListener('input', function() {
            validateForgotPasswordEmail()
        })
        
        emailInput.addEventListener('blur', function() {
            validateForgotPasswordEmail()
        })
    }
}

// Validate Forgot Password Email
function validateForgotPasswordEmail() {
    const emailInput = document.getElementById('reset-email')
    const emailError = document.getElementById('reset-email-error')
    
    if (!emailInput || !emailError) return true
    
    const email = emailInput.value.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    // Clear previous errors
    emailError.textContent = ''
    emailInput.classList.remove('error')
    
    if (!email) {
        emailError.textContent = 'Email address is required'
        emailInput.classList.add('error')
        return false
    }
    
    if (!emailRegex.test(email)) {
        emailError.textContent = 'Please enter a valid email address'
        emailInput.classList.add('error')
        return false
    }
    
    return true
}

// Handle Forgot Password Form Submission
async function handleForgotPasswordSubmit() {
    const emailInput = document.getElementById('reset-email')
    const emailError = document.getElementById('reset-email-error')
    
    if (!emailInput || !emailError) return
    
    // Validate email
    if (!validateForgotPasswordEmail()) {
        return
    }
    
    const email = emailInput.value.trim()
    
    try {
        // Import the resetPassword function from auth.js
        const { resetPassword } = await import('./auth.js')
        
        // Show loading state
        const modal = document.querySelector('.modal-container')
        if (modal) {
            modal.style.opacity = '0.7'
            modal.style.pointerEvents = 'none'
        }
        
        // Call the reset password function
        console.log('Calling resetPassword function')
        const success = await resetPassword(email)
        console.log('Reset password result:', success)
        
        if (success) {
            console.log('Password reset successful, waiting for auth.js to show success modal')
            // Don't close the modal here - let auth.js handle showing the success modal
            // The success modal will be shown by auth.js and will replace this modal
        } else {
            console.log('Password reset failed, re-enabling modal')
            // Re-enable modal if there was an error
            const modal = document.querySelector('.modal-container')
            if (modal) {
                modal.style.opacity = '1'
                modal.style.pointerEvents = 'auto'
            }
        }
        
    } catch (error) {
        console.error('Forgot password error:', error)
        
        // Show error message
        emailError.textContent = 'An error occurred. Please try again.'
        emailInput.classList.add('error')
        
        // Re-enable modal
        const modal = document.querySelector('.modal-container')
        if (modal) {
            modal.style.opacity = '1'
            modal.style.pointerEvents = 'auto'
        }
    }
}

// Initialize forgot password functionality when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initForgotPassword()
})

console.log('Auth login module loaded')
