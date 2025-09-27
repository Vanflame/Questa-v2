// Register Page Handler
// Handles form validation and registration functionality

import { signUp } from './auth.js'

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
        minLength: 8,
        message: 'Password must be at least 8 characters long'
    },
    confirmPassword: {
        required: true,
        match: 'password',
        message: 'Passwords do not match'
    },
    terms: {
        required: true,
        message: 'You must agree to the Terms & Conditions and Privacy Policy to continue.'
    }
}

// DOM elements
let form, submitBtn, btnText, btnSpinner

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    form = document.getElementById('signup-form')
    submitBtn = document.getElementById('submit-btn')
    btnText = submitBtn.querySelector('.btn-text')
    btnSpinner = submitBtn.querySelector('.btn-spinner')
    
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
    
    // Special handling for password confirmation
    const confirmPassword = document.getElementById('confirm-password')
    const password = document.getElementById('signup-password')
    
    if (confirmPassword && password) {
        // Validate confirm password when either field changes
        const validatePasswordMatch = () => {
            if (confirmPassword.value || password.value) {
                validateField(confirmPassword)
            }
        }
        
        confirmPassword.addEventListener('input', validatePasswordMatch)
        password.addEventListener('input', validatePasswordMatch)
    }
    
    // Password toggle functionality
    const passwordToggle = document.getElementById('toggle-password')
    const confirmPasswordToggle = document.getElementById('toggle-confirm-password')
    
    if (passwordToggle) {
        passwordToggle.addEventListener('click', () => togglePasswordVisibility('signup-password', passwordToggle))
    }
    
    if (confirmPasswordToggle) {
        confirmPasswordToggle.addEventListener('click', () => togglePasswordVisibility('confirm-password', confirmPasswordToggle))
    }
    
    console.log('Register page initialized')
})

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault()
    
    console.log('Form submission started')
    
    // Validate all fields
    const isValid = validateForm()
    if (!isValid) {
        console.log('Form validation failed')
        // Force validation of all fields to show errors
        validateField(document.getElementById('signup-email'))
        validateField(document.getElementById('signup-password'))
        validateField(document.getElementById('confirm-password'))
        validateField(document.getElementById('terms-checkbox'))
        return
    }
    
    // Get form data
    const formData = new FormData(form)
    const email = formData.get('email')
    const password = formData.get('password')
    
    // Show loading state
    setLoadingState(true)
    
    // Also show unified loading if available
    if (window.showDashboardLoading) {
        window.showDashboardLoading('Creating your account...')
    }
    
    try {
        console.log('Attempting registration for:', email)
        
        // Use the existing signUp function from auth.js
        const success = await signUp(email, password)
        
        if (success) {
            console.log('Registration successful')
            // The auth.js signUp function will handle showing the appropriate modal
            // (either email confirmation or success modal)
            // No need to show additional modals here as it's handled by auth.js
        } else {
            console.log('Registration failed')
            // Error handling is done in auth.js
        }
        
    } catch (error) {
        console.error('Registration error:', error)
        
        // Show error modal
        window.openModal({
            title: 'Registration Failed',
            content: `
                <div class="modal-error-content">
                    <div class="modal-icon error">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h4 style="color: var(--text-primary); margin: 16px 0 8px 0; font-weight: 600;">
                        Registration Error
                    </h4>
                    <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;">
                        ${error.message || 'An unexpected error occurred. Please try again.'}
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
        
    } finally {
        // Hide loading state
        setLoadingState(false)
        
        // Hide unified loading if it was shown
        if (window.hideDashboardLoading) {
            window.hideDashboardLoading()
        }
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
    const formData = new FormData(form)
    let isValid = true
    
    console.log('Validating entire form...')
    
    // Validate email
    const emailValid = validateField(document.getElementById('signup-email'))
    console.log('Email validation result:', emailValid)
    if (!emailValid) isValid = false
    
    // Validate password
    const passwordValid = validateField(document.getElementById('signup-password'))
    console.log('Password validation result:', passwordValid)
    if (!passwordValid) isValid = false
    
    // Validate confirm password
    const confirmPasswordValid = validateField(document.getElementById('confirm-password'))
    console.log('Confirm password validation result:', confirmPasswordValid)
    if (!confirmPasswordValid) isValid = false
    
    // Validate terms checkbox
    const termsValid = validateField(document.getElementById('terms-checkbox'))
    console.log('Terms validation result:', termsValid)
    if (!termsValid) isValid = false
    
    console.log('Overall form validation result:', isValid)
    return isValid
}

// Validate individual field
function validateField(field) {
    const fieldName = field.name
    const value = field.type === 'checkbox' ? field.checked : field.value.trim()
    const rules = VALIDATION_RULES[fieldName]
    
    if (!rules) {
        return true // No validation rules for this field
    }
    
    let isValid = true
    let errorMessage = ''
    
    // Check required
    if (rules.required && (!value || value === '')) {
        isValid = false
        errorMessage = 'This field is required'
    }
    
    // Check email pattern
    if (isValid && fieldName === 'email' && rules.pattern && !rules.pattern.test(value)) {
        isValid = false
        errorMessage = rules.message
    }
    
    // Check password length
    if (isValid && fieldName === 'password' && rules.minLength && value.length < rules.minLength) {
        isValid = false
        errorMessage = rules.message
    }
    
    // Check password confirmation
    if (isValid && fieldName === 'confirmPassword' && rules.match) {
        const passwordField = document.getElementById('signup-password')
        console.log('Validating password match:', { fieldName, value, passwordValue: passwordField?.value })
        if (passwordField && value !== passwordField.value) {
            isValid = false
            errorMessage = rules.message
            console.log('Password mismatch detected:', { confirmValue: value, passwordValue: passwordField.value })
        }
    }
    
    // Check terms checkbox
    if (isValid && fieldName === 'terms' && rules.required && !value) {
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
    
    console.log('showFieldError called:', { fieldName, message, errorElement: !!errorElement })
    
    if (!errorElement) {
        console.error('Error element not found for field:', fieldName)
        return
    }
    
    if (message) {
        console.log('Showing error message:', message)
        errorElement.textContent = message
        errorElement.style.display = 'block'
        field.classList.add('error', 'invalid')
        field.classList.remove('valid')
    } else {
        console.log('Clearing error message')
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
if (!document.querySelector('#auth-register-styles')) {
    const styles = document.createElement('style')
    styles.id = 'auth-register-styles'
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

console.log('Auth register module loaded')
