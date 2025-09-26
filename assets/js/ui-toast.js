// Toast Notification System
// Simple toast notification system for user feedback

// Toast configuration
const TOAST_CONFIG = {
    duration: 5000, // 5 seconds
    maxToasts: 3,   // Maximum number of toasts to show at once
    position: 'top-right' // Position on screen
}

// Toast types
const TOAST_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
}

// Global toast container
let toastContainer = null

// Initialize toast container
function initToastContainer() {
    if (toastContainer) return
    
    toastContainer = document.createElement('div')
    toastContainer.id = 'toast-container'
    toastContainer.className = `toast-container toast-${TOAST_CONFIG.position}`
    document.body.appendChild(toastContainer)
    
    // Add CSS styles if not already present
    if (!document.querySelector('#toast-styles')) {
        const styles = document.createElement('style')
        styles.id = 'toast-styles'
        styles.textContent = `
            .toast-container {
                position: fixed;
                z-index: 10000;
                pointer-events: none;
            }
            
            .toast-container.toast-top-right {
                top: 20px;
                right: 20px;
            }
            
            .toast-container.toast-top-left {
                top: 20px;
                left: 20px;
            }
            
            .toast-container.toast-bottom-right {
                bottom: 20px;
                right: 20px;
            }
            
            .toast-container.toast-bottom-left {
                bottom: 20px;
                left: 20px;
            }
            
            .toast {
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 16px;
                margin-bottom: 12px;
                max-width: 400px;
                min-width: 300px;
                pointer-events: auto;
                display: flex;
                align-items: flex-start;
                gap: 12px;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                position: relative;
            }
            
            .toast.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .toast.success {
                border-left: 4px solid var(--color-success);
            }
            
            .toast.error {
                border-left: 4px solid var(--color-error);
            }
            
            .toast.warning {
                border-left: 4px solid var(--color-warning);
            }
            
            .toast.info {
                border-left: 4px solid var(--color-info);
            }
            
            .toast-icon {
                width: 20px;
                height: 20px;
                flex-shrink: 0;
                margin-top: 2px;
            }
            
            .toast-content {
                flex: 1;
            }
            
            .toast-title {
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 4px;
                font-size: 14px;
            }
            
            .toast-message {
                color: var(--text-secondary);
                font-size: 13px;
                line-height: 1.4;
            }
            
            .toast-close {
                background: none;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                padding: 0;
                width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            
            .toast-close:hover {
                background-color: var(--color-bg);
            }
            
            @media (max-width: 480px) {
                .toast-container.toast-top-right,
                .toast-container.toast-top-left {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                }
                
                .toast {
                    max-width: none;
                    min-width: auto;
                }
            }
        `
        document.head.appendChild(styles)
    }
}

// Get icon for toast type
function getToastIcon(type) {
    const icons = {
        success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>`,
        error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
               </svg>`,
        warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64584 18.3024 1.5729 18.6453 1.61286 18.9873C1.65282 19.3293 1.80334 19.6547 2.04238 19.9101C2.28142 20.1655 2.59668 20.3373 2.93984 20.3998C3.283 20.4623 3.636 20.4126 3.95 20.257L12 16.77L20.05 20.257C20.364 20.4126 20.717 20.4623 21.0602 20.3998C21.4033 20.3373 21.7186 20.1655 21.9576 19.9101C22.1967 19.6547 22.3472 19.3293 22.3871 18.9873C22.4271 18.6453 22.3542 18.3024 22.18 18L13.71 3.86C13.5322 3.56622 13.2515 3.34751 12.9182 3.24293C12.5849 3.13835 12.2194 3.15502 11.8988 3.28935C11.5782 3.42368 11.3219 3.66758 11.1773 3.97454C11.0327 4.2815 11.0095 4.63026 11.1127 4.954L12 7.33L10.89 4.954C10.7868 4.63026 10.7636 4.2815 10.9082 3.97454C11.0528 3.66758 11.3091 3.42368 11.6297 3.28935C11.9503 3.15502 12.3158 3.13835 12.6491 3.24293C12.9824 3.34751 13.2631 3.56622 13.4409 3.86H13.71Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                 </svg>`,
        info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 16V12M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>`
    }
    return icons[type] || icons.info
}

// Show toast notification
function showToast(title, message, type = TOAST_TYPES.INFO, duration = TOAST_CONFIG.duration) {
    // Initialize container if needed
    initToastContainer()
    
    // Limit number of toasts
    const existingToasts = toastContainer.querySelectorAll('.toast')
    if (existingToasts.length >= TOAST_CONFIG.maxToasts) {
        // Remove oldest toast
        existingToasts[0].remove()
    }
    
    // Create toast element
    const toast = document.createElement('div')
    toast.className = `toast ${type}`
    
    const icon = getToastIcon(type)
    
    toast.innerHTML = `
        <div class="toast-icon">
            ${icon}
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
    `
    
    // Add to container
    toastContainer.appendChild(toast)
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show')
    }, 10)
    
    // Auto remove
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.remove('show')
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove()
                }
            }, 300)
        }, duration)
    }
    
    return toast
}

// Convenience functions
function showSuccessToast(title, message, duration) {
    return showToast(title, message, TOAST_TYPES.SUCCESS, duration)
}

function showErrorToast(title, message, duration) {
    return showToast(title, message, TOAST_TYPES.ERROR, duration)
}

function showWarningToast(title, message, duration) {
    return showToast(title, message, TOAST_TYPES.WARNING, duration)
}

function showInfoToast(title, message, duration) {
    return showToast(title, message, TOAST_TYPES.INFO, duration)
}

// Export functions for global access
window.showToast = showToast
window.showSuccessToast = showSuccessToast
window.showErrorToast = showErrorToast
window.showWarningToast = showWarningToast
window.showInfoToast = showInfoToast

console.log('Toast notification system loaded')
