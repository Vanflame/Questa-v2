import { supabaseClient } from './supabase.js'

// Upload proof file to Supabase Storage
async function uploadProof(userId, file) {
    try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}_${Date.now()}.${fileExt}`
        
        // First, try uploading to storage with user-specific path
        try {
        const { data, error } = await supabaseClient.storage
            .from('proofs')
                .upload(`${userId}/${fileName}`, file, {
                    cacheControl: '3600',
                    upsert: false
                })
        
        if (error) {
                console.log('Storage upload failed, using base64 fallback:', error.message)
                throw error
        }
        
            // Get the public URL
        const { data: { publicUrl } } = supabaseClient.storage
            .from('proofs')
                .getPublicUrl(data.path)
        
            console.log('File uploaded to storage successfully:', publicUrl)
        return publicUrl
        } catch (storageError) {
            console.log('Storage failed, converting to base64...')
            
            // Fallback: Convert file to base64 and store as data URL
            return new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = function(e) {
                    const base64Data = e.target.result
                    console.log('File converted to base64 successfully')
                    resolve(base64Data)
                }
                reader.onerror = function(error) {
                    console.error('Error converting file to base64:', error)
                    reject(error)
                }
                reader.readAsDataURL(file)
            })
        }
    } catch (error) {
        console.error('Error in uploadProof:', error)
        return null
    }
}

// Submit proof for a task
// Define function directly on window object to ensure global access
window.openProofUploadModal = async function(submissionId, isResubmit = false) {
    try {
        console.log('Opening proof upload modal for submission:', submissionId, 'Resubmit:', isResubmit)
            
            // Get the task to check if email is required
            const { data: submission } = await supabaseClient
                .from('task_submissions')
                .select('*, tasks(*)')
                .eq('id', submissionId)
                .single()
            
            if (!submission) {
            showErrorModal('Error', 'Submission not found')
                return
            }
            
            const task = submission.tasks
    
        // Show proof upload modal
        showProofUploadModal(submissionId, task, submission, isResubmit)
        
    } catch (error) {
        console.error('Error opening proof upload modal:', error)
        showErrorModal('Error', 'Error opening proof upload: ' + error.message)
    }
}

// Show proof upload modal
function showProofUploadModal(submissionId, task, submission, isResubmit) {
    const modalContent = `
        <div class="proof-upload-modal">
            <!-- Task Info Section -->
            <div class="proof-task-info">
                <div class="proof-task-header">
                    <div class="proof-task-title-section">
                        <h3 class="proof-task-title">${task.title}</h3>
                        <p class="proof-task-description">${task.description}</p>
                    </div>
                    <div class="proof-task-reward">
                        <svg class="reward-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                        </svg>
                        <span class="reward-amount">₱${task.reward_amount}</span>
                    </div>
                </div>
                <div class="proof-task-badges">
                    <span class="proof-task-difficulty difficulty-${task.difficulty?.toLowerCase() || 'easy'}">
                        ${getDifficultyStars(task.difficulty)} ${task.difficulty || 'Easy'}
                    </span>
                    <span class="proof-task-category">${task.category || 'General'}</span>
                </div>
            </div>
            
            <!-- Upload Section -->
            <div class="proof-upload-section">
                <div class="upload-section-header">
                    <h4 class="upload-title">Upload Your Proof</h4>
                    <p class="upload-subtitle">Select a file to prove you completed this task</p>
                </div>
                
                <div class="upload-area" id="upload-area">
                    <div class="upload-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <polyline points="17,8 12,3 7,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="upload-content">
                        <p class="upload-text">Click to select file or drag and drop</p>
                        <p class="upload-subtext">Images (JPEG, PNG, GIF, WebP) or Documents (PDF, DOC, DOCX)</p>
                        <p class="upload-limit">Maximum file size: 10MB</p>
                    </div>
                </div>
                
                <div class="file-preview" id="file-preview" style="display: none;">
                    <div class="file-info">
                        <div class="file-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div class="file-details">
                            <p class="file-name" id="file-name"></p>
                            <p class="file-size" id="file-size"></p>
                        </div>
                        <button type="button" class="remove-file-btn" id="remove-file-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- File input outside of upload area so it's always accessible -->
                <input type="file" id="proof-file-input" accept="image/*,.pdf,.doc,.docx" style="display: none;">
            </div>
            
            <!-- Email Section (if required) -->
            ${task.referral_required ? `
                <div class="proof-email-section">
                    <div class="email-section-header">
                        <h4 class="email-title">Email Verification</h4>
                        <p class="email-subtitle">Please enter the email you used to complete this task</p>
                    </div>
                    <div class="form-group">
                        <label for="proof-email">Email Used *</label>
                        <input type="email" id="proof-email" placeholder="Enter your email" required>
                        <small class="email-help">This must match the email you used when starting the task</small>
                    </div>
                </div>
            ` : ''}
        </div>
    `
    
        // Show modal
        if (window.openModal) {
            window.openModal({
                title: isResubmit ? 'Resubmit Proof' : 'Submit Proof',
                content: modalContent,
                primaryButton: {
                    text: isResubmit ? 'Resubmit' : 'Submit',
                    action: async () => {
                        // Return the result so modal knows whether to close
                        return await handleProofSubmission(submissionId, task, submission, isResubmit)
                    }
                },
                secondaryButton: {
                    text: 'Cancel',
                    action: () => window.closeModal()
                },
                closable: true,
                scrollable: true
            })
        
        // Setup file upload functionality
        setupFileUpload()
    } else {
        alert(`Submit Proof for: ${task.title}`)
    }
}

// Setup file upload functionality
function setupFileUpload() {
    const uploadArea = document.getElementById('upload-area')
    const fileInput = document.getElementById('proof-file-input')
    const filePreview = document.getElementById('file-preview')
    const fileName = document.getElementById('file-name')
    const fileSize = document.getElementById('file-size')
    const removeFileBtn = document.getElementById('remove-file-btn')
    
    if (!uploadArea || !fileInput) return
    
    // Click to select file
    uploadArea.addEventListener('click', () => {
        fileInput.click()
    })
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault()
        uploadArea.classList.add('drag-over')
    })
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over')
    })
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault()
        uploadArea.classList.remove('drag-over')
        const files = e.dataTransfer.files
        if (files.length > 0) {
            handleFileSelect(files[0])
        }
    })
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0])
        }
    })
    
    // Remove file
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', () => {
            fileInput.value = ''
            filePreview.style.display = 'none'
            uploadArea.style.display = 'block'
        })
    }
    
    function handleFileSelect(file) {
        // Set the file input value
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        fileInput.files = dataTransfer.files
        
        // Add loading overlay without replacing the file input
        const loadingOverlay = document.createElement('div')
        loadingOverlay.className = 'upload-loading-overlay'
        loadingOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10;
        `
        loadingOverlay.innerHTML = `
            <svg class="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <p class="upload-text">Processing file...</p>
        `
        
        // Make upload area relative positioned
        uploadArea.style.position = 'relative'
        uploadArea.appendChild(loadingOverlay)
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showInlineError('File size must be less than 10MB')
            loadingOverlay.remove()
            resetUploadArea()
                        return
                    }
        
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        if (!allowedTypes.includes(file.type)) {
            showInlineError('Please upload an image (JPEG, PNG, GIF, WebP) or document (PDF, DOC, DOCX)')
            loadingOverlay.remove()
            resetUploadArea()
                        return
                    }
        
        // Show file preview after validation
        setTimeout(() => {
            // Remove loading overlay
            loadingOverlay.remove()
            
            // Show file preview
            fileName.textContent = file.name
            fileSize.textContent = formatFileSize(file.size)
            filePreview.style.display = 'block'
            uploadArea.style.display = 'none'
        }, 500) // Small delay to show processing
    }
    
    function resetUploadArea() {
        // Clear the file input
        if (fileInput) {
            fileInput.value = ''
        }
        
        // Remove any loading overlays
        const loadingOverlay = document.querySelector('.upload-loading-overlay')
        if (loadingOverlay) {
            loadingOverlay.remove()
        }
        
        // Reset upload area
        uploadArea.innerHTML = `
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <polyline points="17,8 12,3 7,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <p class="upload-text">Click to select file or drag and drop</p>
            <p class="upload-subtext">Images (JPEG, PNG, GIF, WebP) or Documents (PDF, DOC, DOCX)</p>
            <p class="upload-limit">Maximum file size: 10MB</p>
        `
        
        // Reset position
        uploadArea.style.position = ''
        
        // Re-attach event listeners
        setupFileUpload()
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Show inline error message in the modal
function showInlineError(message) {
    // Remove any existing error messages
    const existingError = document.querySelector('.proof-error-message')
    if (existingError) {
        existingError.remove()
    }
    
    // Create error message element
    const errorDiv = document.createElement('div')
    errorDiv.className = 'proof-error-message'
    errorDiv.style.cssText = `
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #dc2626;
        padding: 12px 16px;
        border-radius: 8px;
        margin: 16px 0;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
    `
    errorDiv.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#dc2626" stroke-width="2"/>
            <path d="M15 9L9 15M9 9L15 15" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>${message}</span>
    `
    
    // Insert error message after the modal content
    const modalContent = document.querySelector('.proof-upload-modal')
    if (modalContent) {
        modalContent.appendChild(errorDiv)
        
        // Scroll to error message
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
}

// Handle proof submission
async function handleProofSubmission(submissionId, task, submission, isResubmit) {
    // Get submit button and file input first (outside try block for catch access)
    let submitBtn = document.querySelector('.modal-primary-btn')
    if (!submitBtn) {
        // Try alternative selectors
        submitBtn = document.getElementById('modal-primary-btn')
    }
    if (!submitBtn) {
        // Try by button text
        const buttons = document.querySelectorAll('button')
        submitBtn = Array.from(buttons).find(btn => 
            btn.textContent.includes('Submit') || btn.textContent.includes('Resubmit')
        )
    }
    
    console.log('Submit button found:', submitBtn)
    console.log('Submit button class:', submitBtn?.className)
    console.log('Submit button id:', submitBtn?.id)
    console.log('Submit button text:', submitBtn?.textContent)
    
    // Debug: List all buttons in the modal
    const allButtons = document.querySelectorAll('button')
    console.log('All buttons found:', allButtons.length)
    allButtons.forEach((btn, index) => {
        console.log(`Button ${index}:`, {
            text: btn.textContent,
            className: btn.className,
            id: btn.id,
            disabled: btn.disabled
        })
    })
    
    const originalText = submitBtn ? submitBtn.textContent : 'Submit'
    
    // Get modal overlay reference once for reuse
    const modalOverlay = document.getElementById('modal-overlay')
    
    // Check if already processing
    if (submitBtn && submitBtn.disabled) {
        console.log('Button already disabled, preventing multiple submissions')
        return false
    }
    
    try {
        // Clear any existing error messages
        const existingError = document.querySelector('.proof-error-message')
        if (existingError) {
            existingError.remove()
        }
        
        const fileInput = document.getElementById('proof-file-input')
        
        // Prevent multiple submissions
        if (submitBtn && submitBtn.disabled) {
            return false // Already processing
        }
        
        // Validate file selection first
        if (!fileInput || !fileInput.files[0]) {
            showInlineError('Please select a file to upload.')
            resetSubmitButton(submitBtn, originalText)
            return false // Don't close modal
        }
        
        const file = fileInput.files[0]
        let emailUsed = null
        
        // Validate email FIRST before any upload
        if (task.referral_required) {
            const emailInput = document.getElementById('proof-email')
            if (!emailInput) {
                showInlineError('Email input not found.')
                resetSubmitButton(submitBtn, originalText)
                return false // Don't close modal
            }
            
            emailUsed = emailInput.value.trim()
            if (!emailUsed) {
                showInlineError('Email is required for this task submission.')
                emailInput.focus()
                resetSubmitButton(submitBtn, originalText)
                return false // Don't close modal
            }
            
            // Check if email matches the original email used
            const originalEmail = submission.email_used
            console.log('Email validation:', {
                emailUsed: emailUsed,
                originalEmail: originalEmail,
                submissionId: submissionId
            })
            
            if (originalEmail && emailUsed.toLowerCase() !== originalEmail.toLowerCase()) {
                showInlineError('The email you entered does not match the email you used when starting this task.')
                emailInput.focus()
                resetSubmitButton(submitBtn, originalText)
                return false // Don't close modal
            }
        }
        
        // Validate user ID
        const userId = getCurrentUserId()
        if (!userId) {
            showInlineError('Authentication error. Please log in again.')
            resetSubmitButton(submitBtn, originalText)
            return false // Don't close modal
        }
        
        // NOW show loading state and start upload
        console.log('Setting loading state on submit button...')
        if (submitBtn) {
            submitBtn.disabled = true
            submitBtn.style.opacity = '0.7'
            submitBtn.style.cursor = 'not-allowed'
            submitBtn.textContent = 'Uploading...'
            submitBtn.style.pointerEvents = 'none' // Additional protection
            console.log('Submit button loading state set:', submitBtn.textContent)
            console.log('Submit button disabled:', submitBtn.disabled)
        } else {
            console.error('Submit button not found! Trying to find it again...')
            // Try to find the button again
            submitBtn = document.querySelector('.modal-primary-btn') || 
                       document.getElementById('modal-primary-btn') ||
                       Array.from(document.querySelectorAll('button')).find(btn => 
                           btn.textContent.includes('Submit') || btn.textContent.includes('Resubmit')
                       )
            
            if (submitBtn) {
                console.log('Submit button found on retry:', submitBtn)
                submitBtn.disabled = true
                submitBtn.style.opacity = '0.7'
                submitBtn.style.cursor = 'not-allowed'
                submitBtn.textContent = 'Uploading...'
                submitBtn.style.pointerEvents = 'none' // Additional protection
            } else {
                console.error('Submit button still not found after retry!')
            }
        }
        
        // Show overlay loading state
        if (modalOverlay) {
            modalOverlay.style.background = 'rgba(0, 0, 0, 0.7)'
            modalOverlay.style.backdropFilter = 'blur(4px)'
        }
        
        // Also disable any other buttons in the modal
        const cancelBtn = document.querySelector('.modal-secondary-btn')
        if (cancelBtn) {
            cancelBtn.disabled = true
            cancelBtn.style.opacity = '0.5'
        }
        
        // Disable modal closing during upload
        if (modalOverlay) {
            modalOverlay.style.pointerEvents = 'none'
            const closeBtn = document.getElementById('modal-close-btn')
            if (closeBtn) closeBtn.style.display = 'none'
        }
        
        // Show loading state in upload area
        const uploadArea = document.getElementById('upload-area')
        const filePreview = document.getElementById('file-preview')
        if (uploadArea && filePreview) {
            uploadArea.style.display = 'block'
            filePreview.style.display = 'none'
            uploadArea.innerHTML = `
                <div class="upload-loading">
                    <svg class="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation: spin 1s linear infinite;">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <p class="upload-text">Uploading file...</p>
                </div>
            `
        }
        
        // Upload file with minimum loading time
        const uploadPromise = uploadProof(userId, file)
        const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1500)) // Minimum 1.5 seconds
        
        const [proofUrl] = await Promise.all([uploadPromise, minLoadingTime])
        
            if (!proofUrl) {
            // Re-enable modal closing
            if (modalOverlay) {
                modalOverlay.style.pointerEvents = 'auto'
                const closeBtn = document.getElementById('modal-close-btn')
                if (closeBtn) closeBtn.style.display = 'block'
            }
            resetSubmitButton(submitBtn, originalText)
            
            // Show error popup
            if (window.openModal) {
                window.openModal({
                    title: 'Upload Error',
                    content: `
                        <div style="text-align: center; padding: 20px;">
                            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #EF4444, #DC2626); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h3 style="margin: 0 0 10px 0; color: #dc2626; font-size: 18px;">Upload Failed</h3>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">Error uploading file. Please try again.</p>
                        </div>
                    `,
                    primaryButton: {
                        text: 'Try Again',
                        action: () => {
                            return true // Close modal
                        }
                    }
                })
            }
            return false // Don't close modal
        }
        
        // Update button to show database update
        if (submitBtn) {
            submitBtn.disabled = true
            submitBtn.style.opacity = '0.7'
            submitBtn.style.cursor = 'not-allowed'
            submitBtn.textContent = 'Updating submission...'
            submitBtn.style.pointerEvents = 'none' // Additional protection
            console.log('Button updated to database update state:', submitBtn.textContent)
            console.log('Submit button disabled:', submitBtn.disabled)
        }
        
        // Update submission with proof
            const updateData = {
                proof_url: proofUrl,
                status: 'pending_review',
                updated_at: new Date().toISOString()
            }
            
            // Add email_used if it was provided
            if (emailUsed) {
                updateData.email_used = emailUsed
                console.log('Adding email_used to submission update:', emailUsed)
            }
            
            const { error: updateError } = await supabaseClient
                .from('task_submissions')
                .update(updateData)
                .eq('id', submissionId)
            
            if (updateError) {
                console.error('Error updating submission:', updateError)
            // Re-enable modal closing
            if (modalOverlay) {
                modalOverlay.style.pointerEvents = 'auto'
                const closeBtn = document.getElementById('modal-close-btn')
                if (closeBtn) closeBtn.style.display = 'block'
            }
            resetSubmitButton(submitBtn, originalText)
            
            // Show error popup
            if (window.openModal) {
                window.openModal({
                    title: 'Submission Error',
                    content: `
                        <div style="text-align: center; padding: 20px;">
                            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #EF4444, #DC2626); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h3 style="margin: 0 0 10px 0; color: #dc2626; font-size: 18px;">Submission Failed</h3>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">Error submitting proof: ${updateError.message}</p>
                        </div>
                    `,
                    primaryButton: {
                        text: 'Try Again',
                        action: () => {
                            return true // Close modal
                        }
                    }
                })
            }
            return false // Don't close modal
            }
            
            console.log('Proof submitted successfully')
        
        // Close the proof upload modal first
        if (window.closeModal) {
            window.closeModal()
        }
        
        // Reload tasks in background
        setTimeout(async () => {
            try {
            await window.loadTasks()
            await window.renderTasks()
            } catch (error) {
                console.error('Error reloading tasks:', error)
            }
        }, 500)
        
        // Show success popup modal
        setTimeout(() => {
            if (window.openModal) {
                window.openModal({
                    title: 'Success!',
                    content: `
                        <div style="text-align: center; padding: 20px;">
                            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #22C55E, #16A34A); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h3 style="margin: 0 0 10px 0; color: #064e3b; font-size: 18px;">${isResubmit ? 'Proof Resubmitted!' : 'Proof Submitted!'}</h3>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your submission is now pending review. You'll be notified once it's processed.</p>
                        </div>
                    `,
                    primaryButton: {
                        text: 'OK',
                        action: () => {
                            return true // Close modal
                        }
                    }
                })
            }
        }, 1000)
        
        console.log('Success popup will be shown, returning true to close proof modal')
        return true // Close the proof upload modal
        
    } catch (error) {
        console.error('Error in proof submission:', error)
        // Re-enable modal closing
        if (modalOverlay) {
            modalOverlay.style.pointerEvents = 'auto'
            const closeBtn = document.getElementById('modal-close-btn')
            if (closeBtn) closeBtn.style.display = 'block'
        }
        resetSubmitButton(submitBtn, originalText)
        
        // Show error popup
        if (window.openModal) {
            window.openModal({
                title: 'Error',
                content: `
                    <div style="text-align: center; padding: 20px;">
                        <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #EF4444, #DC2626); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h3 style="margin: 0 0 10px 0; color: #dc2626; font-size: 18px;">Something Went Wrong</h3>
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">Error submitting proof: ${error.message}</p>
                    </div>
                `,
                primaryButton: {
                    text: 'Try Again',
                    action: () => {
                        return true // Close modal
                    }
                }
            })
        }
        return false // Don't close modal
    }
}

// Reset submit button to original state
function resetSubmitButton(submitBtn, originalText) {
    if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.style.opacity = '1'
        submitBtn.style.cursor = 'pointer'
        submitBtn.textContent = originalText
        submitBtn.style.pointerEvents = 'auto' // Re-enable pointer events
        console.log('Submit button reset to:', submitBtn.textContent, 'disabled:', submitBtn.disabled)
    }
    
    // Also re-enable cancel button
    const cancelButton = document.querySelector('.modal-secondary-btn')
    if (cancelButton) {
        cancelButton.disabled = false
        cancelButton.style.opacity = '1'
    }
    
    // Reset overlay state
    const modalOverlay = document.getElementById('modal-overlay')
    if (modalOverlay) {
        modalOverlay.style.background = 'rgba(0, 0, 0, 0.5)'
        modalOverlay.style.backdropFilter = 'blur(2px)'
    }
}

// Get current user ID from auth module
function getCurrentUserId() {
    const user = getCurrentUser()
    if (!user) {
        return null
    }
    return user.id
}

// Get current user from auth module
function getCurrentUser() {
    return window.currentUser || null
}

// Show success modal
function showSuccessModal(title, message) {
    if (window.openModal) {
        window.openModal({
            title: title,
            content: `
                <div class="success-modal-content">
                    <div class="success-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="#10b981" stroke-width="2"/>
                            <path d="M9 12L11 14L15 10" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <p class="success-message">${message}</p>
                </div>
            `,
            primaryButton: {
                text: 'OK',
                action: () => window.closeModal()
            },
            closable: true
        })
    } else {
        alert(`${title}\n\n${message}`)
    }
}

// Show error modal
function showErrorModal(title, message) {
    if (window.openModal) {
        window.openModal({
            title: title,
            content: `
                <div class="error-modal-content">
                    <div class="error-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="#ef4444" stroke-width="2"/>
                            <path d="M15 9L9 15M9 9L15 15" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <p class="error-message">${message}</p>
                </div>
            `,
            primaryButton: {
                text: 'OK',
                action: () => window.closeModal()
            },
            closable: true
        })
    } else {
        alert(`${title}\n\n${message}`)
    }
}

// Get difficulty stars
function getDifficultyStars(difficulty) {
    const level = difficulty?.toLowerCase() || 'easy'
    switch (level) {
        case 'easy':
            return '⭐'
        case 'medium':
            return '⭐⭐'
        case 'hard':
            return '⭐⭐⭐'
        default:
            return '⭐'
    }
}

// Function is now defined directly on window object
console.log('=== SUBMISSIONS.JS LOADED ===')
console.log('openProofUploadModal defined on window:', typeof window.openProofUploadModal)
console.log('Function is callable:', typeof window.openProofUploadModal === 'function')
console.log('Function definition:', window.openProofUploadModal)

// Verify the function is properly available
setTimeout(() => {
    console.log('=== DELAYED CHECK ===')
    console.log('Delayed check - window.openProofUploadModal:', typeof window.openProofUploadModal)
    console.log('Window object has openProofUploadModal:', 'openProofUploadModal' in window)
    console.log('Function is callable after delay:', typeof window.openProofUploadModal === 'function')
    console.log('Function definition after delay:', window.openProofUploadModal)
}, 1000)