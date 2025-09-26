// UI Modal Component - Reusable modal system
// Provides openModal() and closeModal() functions for consistent UI

// Global modal state
let currentModal = null

/**
 * Open a modal with specified options
 * @param {Object} options - Modal configuration
 * @param {string} options.title - Modal title
 * @param {string} options.content - HTML content for modal body
 * @param {Object} options.primaryButton - Primary button configuration
 * @param {Object} options.secondaryButton - Secondary button configuration (optional)
 * @param {boolean} options.closable - Whether modal can be closed by clicking outside or ESC (default: true)
 */
function openModal(options) {
    // Close any existing modal first
    closeModal()
    
    // Default options
    const config = {
        title: 'Modal',
        content: '',
        primaryButton: {
            text: 'OK',
            action: () => closeModal()
        },
        secondaryButton: null,
        closable: true,
        ...options
    }
    
    // Create modal HTML
    const modalHTML = `
        <div id="modal-overlay" class="modal-overlay">
            <div class="modal-container">
                <div class="modal-header">
                    <h3 class="modal-title">${config.title}</h3>
                    ${config.closable ? '<button class="modal-close" id="modal-close-btn">&times;</button>' : ''}
                </div>
                <div class="modal-body">
                    ${config.content}
                </div>
                <div class="modal-footer">
                    ${config.secondaryButton ? 
                        `<button class="modal-btn modal-btn-secondary" id="modal-secondary-btn">${config.secondaryButton.text}</button>` : 
                        ''
                    }
                    ${config.primaryButton ? 
                        `<button class="modal-btn modal-btn-primary" id="modal-primary-btn">${config.primaryButton.text}</button>` : 
                        ''
                    }
                </div>
            </div>
        </div>
    `
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML)
    currentModal = document.getElementById('modal-overlay')
    
    // Attach event listeners
    attachModalEventListeners(config)
    
    // Show modal with animation
    requestAnimationFrame(() => {
        currentModal.classList.add('modal-show')
    })
    
    // Focus primary button for accessibility (if it exists)
    const primaryBtn = document.getElementById('modal-primary-btn')
    if (primaryBtn) {
        primaryBtn.focus()
    }
}

/**
 * Close the current modal
 */
function closeModal() {
    if (currentModal) {
        currentModal.classList.remove('modal-show')
        
        // Remove modal after animation
        setTimeout(() => {
            if (currentModal && currentModal.parentNode) {
                currentModal.parentNode.removeChild(currentModal)
            }
            currentModal = null
        }, 200) // Match CSS transition duration
    }
}

/**
 * Attach event listeners to modal elements
 * @param {Object} config - Modal configuration
 */
function attachModalEventListeners(config) {
    if (!currentModal) return
    
    // Primary button
    const primaryBtn = document.getElementById('modal-primary-btn')
    if (primaryBtn) {
        primaryBtn.addEventListener('click', async () => {
            console.log('Primary button clicked')
            if (config.primaryButton && config.primaryButton.action) {
                try {
                    console.log('Calling primary button action')
                    const result = config.primaryButton.action()
                    console.log('Action result:', result)
                    // If the action returns a promise, wait for it
                    if (result && typeof result.then === 'function') {
                        const shouldClose = await result
                        console.log('Promise resolved, should close:', shouldClose)
                        // Only close modal if action returns true
                        if (shouldClose === true) {
                            console.log('Closing modal due to true result')
                            closeModal()
                        }
                    } else if (result === true) {
                        console.log('Closing modal due to synchronous true result')
                        // If action returns true synchronously, close modal
                        closeModal()
                    } else {
                        console.log('Not closing modal, result was:', result)
                    }
                } catch (error) {
                    console.error('Error in modal action:', error)
                }
            } else {
                console.log('No primary button action, closing modal')
                closeModal()
            }
        })
    }
    
    // Secondary button
    const secondaryBtn = document.getElementById('modal-secondary-btn')
    if (secondaryBtn && config.secondaryButton) {
        secondaryBtn.addEventListener('click', () => {
            if (config.secondaryButton.action) {
                config.secondaryButton.action()
            } else {
                closeModal()
            }
        })
    }
    
    // Close button
    const closeBtn = document.getElementById('modal-close-btn')
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal)
    }
    
    // Overlay click (only if closable)
    if (config.closable) {
        currentModal.addEventListener('click', (e) => {
            if (e.target === currentModal) {
                closeModal()
            }
        })
    }
    
    // ESC key (only if closable)
    if (config.closable) {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal()
                document.removeEventListener('keydown', handleEsc)
            }
        }
        document.addEventListener('keydown', handleEsc)
    }
}

// Make functions globally available
window.openModal = openModal
window.closeModal = closeModal
