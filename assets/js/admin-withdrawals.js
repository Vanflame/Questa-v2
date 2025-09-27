// Admin Withdrawals Module
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Create notification function for admin panel
async function createAdminNotification(userId, title, message, type = 'info') {
    try {
        console.log('Creating admin notification:', { userId, title, message, type })
        
        const { error } = await supabaseClient
            .from('notifications')
            .insert({
                user_id: userId,
                title: title,
                message: message,
                type: type,
                is_read: false,
                created_at: new Date().toISOString()
            })
        
        if (error) {
            console.error('Error creating notification:', error)
        } else {
            console.log('Notification created successfully')
        }
        
    } catch (error) {
        console.error('Error in createAdminNotification:', error)
    }
}

// Global variables
let allWithdrawals = []
let currentWithdrawalFilter = 'pending'
let isProcessingWithdrawalApproval = false
let isProcessingWithdrawalRejection = false
let withdrawalEventListenersAttached = false

// Lazy loading variables
let isLoadingWithdrawals = false
let currentPage = 1
let itemsPerPage = 20
let hasMoreWithdrawals = true
let userDataCache = new Map() // Cache user data to avoid repeated fetches

// Load withdrawals data with lazy loading
async function loadWithdrawals(reset = false) {
    if (isLoadingWithdrawals) {
        console.log('Already loading withdrawals, skipping...')
        return
    }
    
    if (reset) {
        allWithdrawals = []
        currentPage = 1
        hasMoreWithdrawals = true
    }
    
    if (!hasMoreWithdrawals) {
        console.log('No more withdrawals to load')
        return
    }
    
    try {
        isLoadingWithdrawals = true
        console.log(`Loading withdrawals page ${currentPage}...`)
        
        // Load withdrawals with pagination
        const { data: withdrawalsData, error: withdrawalsError } = await supabaseClient
            .from('withdrawals')
            .select('*')
            .order('created_at', { ascending: false })
            .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)
        
        if (withdrawalsError) {
            console.error('Error loading withdrawals:', withdrawalsError)
            return
        }
        
        if (!withdrawalsData || withdrawalsData.length === 0) {
            hasMoreWithdrawals = false
            console.log('No more withdrawals to load')
            return
        }
        
        // Check if we got fewer items than requested (last page)
        if (withdrawalsData.length < itemsPerPage) {
            hasMoreWithdrawals = false
        }
        
        // Add to existing withdrawals
        allWithdrawals = [...allWithdrawals, ...withdrawalsData]
        
        console.log(`Loaded ${withdrawalsData.length} withdrawals (total: ${allWithdrawals.length})`)
        
        // Update navigation badge (only count pending from loaded data)
        const pendingWithdrawals = allWithdrawals.filter(w => w.status === 'pending').length
        const withdrawalsBadge = document.getElementById('withdrawals-badge')
        if (withdrawalsBadge) {
            withdrawalsBadge.textContent = pendingWithdrawals
        }
        
        // Update stats
        const statsPendingWithdrawals = document.getElementById('stats-pending-withdrawals')
        if (statsPendingWithdrawals) {
            statsPendingWithdrawals.textContent = pendingWithdrawals
        }
        
        // Increment page for next load
        currentPage++
        
    } catch (error) {
        console.error('Error loading withdrawals:', error)
    } finally {
        isLoadingWithdrawals = false
    }
}

// Load user data for a specific withdrawal (lazy loading)
async function loadUserDataForWithdrawal(withdrawal) {
    // Check cache first
    if (userDataCache.has(withdrawal.user_id)) {
        return {
            ...withdrawal,
            user_profiles: userDataCache.get(withdrawal.user_id)
        }
    }
    
    try {
        const { data: userData } = await supabaseClient
            .from('profiles')
            .select('email')
            .eq('id', withdrawal.user_id)
            .single()
        
        const userProfile = {
            user_id: withdrawal.user_id,
            email: userData?.email || 'Unknown',
            username: userData?.email || 'Unknown'
        }
        
        // Cache the user data
        userDataCache.set(withdrawal.user_id, userProfile)
        
        return {
            ...withdrawal,
            user_profiles: userProfile
        }
    } catch (error) {
        console.error('Error loading user data:', error)
        return {
            ...withdrawal,
            user_profiles: {
                user_id: withdrawal.user_id,
                email: 'Unknown',
                username: 'Unknown'
            }
        }
    }
}

// Render withdrawals based on current filter with lazy loading
async function renderWithdrawals() {
    const withdrawalsList = document.getElementById('withdrawals-list')
    if (!withdrawalsList) {
        console.error('withdrawals-list element not found')
        return
    }
    
    console.log('Rendering withdrawals with filter:', currentWithdrawalFilter)
    console.log('Total withdrawals:', allWithdrawals.length)
    
    // Filter withdrawals based on current filter
    let filteredWithdrawals = allWithdrawals
    if (currentWithdrawalFilter !== 'all') {
        filteredWithdrawals = allWithdrawals.filter(w => w.status === currentWithdrawalFilter)
    }
    
    console.log('Filtered withdrawals:', filteredWithdrawals.length)
    
    if (filteredWithdrawals.length === 0) {
        withdrawalsList.innerHTML = '<p class="no-withdrawals">No withdrawals found for the selected filter.</p>'
        return
    }
    
    // Show loading state for first render
    if (allWithdrawals.length === 0) {
        withdrawalsList.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading withdrawals...</p>
            </div>
        `
        return
    }
    
    // Render table with lazy loading for user data
    withdrawalsList.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Account Name</th>
                    <th>Account Number</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${filteredWithdrawals.map(withdrawal => {
                    const user = withdrawal.user_profiles
                    const userName = user?.username || user?.email || 'Loading...'
                    
                    return `
                        <tr data-withdrawal-id="${withdrawal.id}">
                            <td class="user-cell" data-user-id="${withdrawal.user_id}">
                                ${userName}
                            </td>
                            <td>₱${withdrawal.amount.toFixed(2)}</td>
                            <td>${withdrawal.method.toUpperCase()}</td>
                            <td>${withdrawal.account_name || 'Not provided'}</td>
                            <td>${withdrawal.account_info}</td>
                            <td><span class="status-badge ${withdrawal.status}">${withdrawal.status.toUpperCase()}</span></td>
                            <td>${new Date(withdrawal.created_at).toLocaleDateString()}</td>
                            <td>
                                ${getWithdrawalActions(withdrawal)}
                            </td>
                        </tr>
                    `
                }).join('')}
            </tbody>
        </table>
        ${hasMoreWithdrawals ? `
            <div class="load-more-container">
                <button id="load-more-withdrawals" class="btn-load-more">
                    <div class="loading-spinner" style="display: none;"></div>
                    <span>Load More Withdrawals</span>
                </button>
            </div>
        ` : ''}
    `
    
    // Attach event listeners after rendering
    attachWithdrawalEventListeners()
    
    // Load user data for visible withdrawals (lazy loading)
    await loadUserDataForVisibleWithdrawals(filteredWithdrawals)
}

// Load user data for visible withdrawals
async function loadUserDataForVisibleWithdrawals(withdrawals) {
    const userCells = document.querySelectorAll('.user-cell[data-user-id]')
    
    for (const cell of userCells) {
        const userId = cell.getAttribute('data-user-id')
        const withdrawal = withdrawals.find(w => w.user_id === userId)
        
        if (withdrawal && !withdrawal.user_profiles) {
            // Load user data for this withdrawal
            const withdrawalWithUser = await loadUserDataForWithdrawal(withdrawal)
            
            // Update the cell content
            const userName = withdrawalWithUser.user_profiles?.username || withdrawalWithUser.user_profiles?.email || 'Unknown User'
            cell.textContent = userName
            
            // Update the withdrawal in our array
            const index = allWithdrawals.findIndex(w => w.id === withdrawal.id)
            if (index !== -1) {
                allWithdrawals[index] = withdrawalWithUser
            }
        }
    }
}

// Get withdrawal action buttons based on status
function getWithdrawalActions(withdrawal) {
    if (withdrawal.status === 'pending') {
        return `
            <button class="admin-btn admin-btn-success admin-btn-sm" data-action="approve-withdrawal" data-withdrawal-id="${withdrawal.id}">
                Approve
            </button>
            <button class="admin-btn admin-btn-danger admin-btn-sm" data-action="reject-withdrawal" data-withdrawal-id="${withdrawal.id}">
                Reject
            </button>
        `
    } else {
        return `<span class="no-actions">No actions available</span>`
    }
}

// Update withdrawal in local array
function updateWithdrawalInList(withdrawalId, updates) {
    // Convert withdrawalId to number for comparison
    const id = parseInt(withdrawalId)
    const index = allWithdrawals.findIndex(w => w.id === id)
    if (index !== -1) {
        allWithdrawals[index] = { ...allWithdrawals[index], ...updates }
        console.log('Updated withdrawal in list:', id, updates)
    } else {
        console.warn('Withdrawal not found in list:', id, 'Available IDs:', allWithdrawals.map(w => w.id))
        // If not found, reload the withdrawals to get the latest data
        loadWithdrawals()
    }
}

// Load more withdrawals
async function loadMoreWithdrawals() {
    const loadMoreBtn = document.getElementById('load-more-withdrawals')
    if (loadMoreBtn) {
        const spinner = loadMoreBtn.querySelector('.loading-spinner')
        const text = loadMoreBtn.querySelector('span')
        
        // Show loading state
        spinner.style.display = 'inline-block'
        text.textContent = 'Loading...'
        loadMoreBtn.disabled = true
        
        try {
            await loadWithdrawals()
            await renderWithdrawals()
        } finally {
            // Hide loading state
            spinner.style.display = 'none'
            text.textContent = 'Load More Withdrawals'
            loadMoreBtn.disabled = false
        }
    }
}

// Attach withdrawal event listeners
function attachWithdrawalEventListeners() {
    console.log('Attaching withdrawal event listeners...')
    
    // Only attach listeners once
    if (withdrawalEventListenersAttached) {
        console.log('Withdrawal event listeners already attached, skipping...')
        return
    }
    
    // Filter buttons
    const filterButtons = document.querySelectorAll('.admin-filter-btn')
    console.log('Found filter buttons:', filterButtons.length)
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Filter button clicked:', this.getAttribute('data-filter'))
            
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'))
            this.classList.add('active')
            
            // Update filter and re-render
            currentWithdrawalFilter = this.getAttribute('data-filter')
            console.log('Current filter set to:', currentWithdrawalFilter)
            renderWithdrawals()
        })
    })
    
    // Withdrawal action buttons - use event delegation with specific selectors
    const withdrawalsList = document.getElementById('withdrawals-list')
    if (withdrawalsList) {
        withdrawalsList.addEventListener('click', async function(e) {
            const button = e.target.closest('[data-action="approve-withdrawal"], [data-action="reject-withdrawal"], [data-action="load-more-withdrawals"]')
            if (!button) return
            
            e.preventDefault()
            e.stopPropagation()
            
            const action = button.getAttribute('data-action')
            const withdrawalId = button.getAttribute('data-withdrawal-id')
            
            console.log('Withdrawal action clicked:', action, 'ID:', withdrawalId)
            
            // Handle load more button
            if (action === 'load-more-withdrawals') {
                await loadMoreWithdrawals()
                return
            }
            
            // Prevent multiple rapid clicks
            if (button.disabled) {
                console.log('Button already processing, ignoring click')
                return
            }
            
            if (action === 'approve-withdrawal') {
                if (isProcessingWithdrawalApproval) {
                    console.log('Already processing withdrawal approval, ignoring click')
                    return
                }
                // Just show the approval modal, don't process yet
                await approveWithdrawal(withdrawalId)
            } else if (action === 'reject-withdrawal') {
                if (isProcessingWithdrawalRejection) {
                    console.log('Already processing withdrawal rejection, ignoring click')
                    return
                }
                // Just show the rejection modal, don't process yet
                await rejectWithdrawal(withdrawalId)
            }
        })
        
        // Mark as attached
        withdrawalEventListenersAttached = true
        console.log('Withdrawal event listeners attached successfully')
    }
}

// Approve withdrawal - just show the modal
async function approveWithdrawal(withdrawalId) {
    try {
        console.log('Showing approval modal for withdrawal:', withdrawalId)
        
        // Get withdrawal details first
        const { data: withdrawalData, error: fetchError } = await supabaseClient
            .from('withdrawals')
            .select('*')
            .eq('id', withdrawalId)
            .single()
        
        if (fetchError) {
            console.error('Error fetching withdrawal:', fetchError)
            if (window.openModal) {
                window.openModal({
                    title: 'Error',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Error Fetching Withdrawal</h3>
                            <p>Unable to fetch withdrawal details. Please try again.</p>
                            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon warning-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">${fetchError.message}</span>
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: { text: 'OK', action: () => window.closeModal() },
                    closable: true
                })
            } else {
                alert('Error fetching withdrawal: ' + fetchError.message)
            }
            return
        }

        // Show approval modal with receipt upload option
        showApprovalModal(withdrawalData)
        
    } catch (error) {
        console.error('Error approving withdrawal:', error)
        if (window.openModal) {
            window.openModal({
                title: 'Error',
                content: `
                    <div class="modal-error-content">
                        <div class="modal-icon error">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <h3>Error Approving Withdrawal</h3>
                        <p>An unexpected error occurred while approving the withdrawal.</p>
                        <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon warning-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">${error.message}</span>
                            </p>
                        </div>
                    </div>
                `,
                primaryButton: { text: 'OK', action: () => window.closeModal() },
                closable: true
            })
        } else {
            alert('Error approving withdrawal: ' + error.message)
        }
    }
}

// Show approval modal with receipt upload
function showApprovalModal(withdrawalData) {
    if (window.openModal) {
        window.openModal({
            title: 'Approve Withdrawal',
            content: `
                <div class="approval-modal-content">
                    <div class="withdrawal-details">
                        <h4>Withdrawal Details</h4>
                        <div class="detail-row">
                            <span>Amount:</span>
                            <span>₱${withdrawalData.amount.toFixed(2)}</span>
                        </div>
                        <div class="detail-row">
                            <span>Method:</span>
                            <span>${withdrawalData.method === 'gcash' ? 'GCash' : 'Bank Account'}</span>
                        </div>
                        <div class="detail-row">
                            <span>Account Name:</span>
                            <span>${withdrawalData.account_name || 'Not provided'}</span>
                        </div>
                        <div class="detail-row">
                            <span>Account Number:</span>
                            <span>${withdrawalData.account_info}</span>
                        </div>
                        <div class="detail-row">
                            <span>Requested:</span>
                            <span>${new Date(withdrawalData.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="receipt-upload-section">
                        <h4>Receipt Proof (Optional)</h4>
                        <p class="upload-note">Upload a receipt or proof of payment for record keeping.</p>
                        
                        <div class="file-upload-area" id="receipt-upload-area">
                            <input type="file" id="receipt-file" accept="image/*,.pdf" style="display: none;">
                            <div class="upload-placeholder" id="upload-placeholder">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <polyline points="10,9 9,9 8,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <p>Click to upload receipt</p>
                                <small>Supports: JPG, PNG, PDF (Max 5MB)</small>
                            </div>
                            <div class="file-preview" id="file-preview" style="display: none;">
                                <div class="preview-content">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    <span id="file-name">File selected</span>
                                </div>
                                <button type="button" id="remove-file" class="remove-file-btn">×</button>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            primaryButton: {
                text: 'Approve & Process',
                action: () => {
                    // Check if already processing
                    if (isProcessingWithdrawalApproval) {
                        console.log('Already processing withdrawal approval, ignoring click')
                        return false
                    }
                    
                    const fileInput = document.getElementById('receipt-file');
                    const file = fileInput.files[0];
                    
                    // Set processing flag
                    isProcessingWithdrawalApproval = true
                    console.log('Setting processing flag to true for withdrawal:', withdrawalData.id)
                    
                    // Show loading state
                    const submitBtn = document.querySelector('.modal-primary-btn');
                    if (submitBtn) {
                        submitBtn.disabled = true;
                        submitBtn.innerHTML = `
                            <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation: spin 1s linear infinite;">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Processing...
                        `;
                    }
                    
                    // Process approval asynchronously
                    processWithdrawalApproval(withdrawalData.id, file)
                        .then(() => {
                            console.log('Withdrawal approval completed successfully');
                            // Close modal after successful approval
                            window.closeModal();
                        })
                        .catch((error) => {
                            console.error('Error in approval action:', error);
                            // Reset processing flag
                            isProcessingWithdrawalApproval = false
                            // Reset button state
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.innerHTML = 'Approve & Process';
                            }
                            // Show error modal
                            if (window.openModal) {
                                window.openModal({
                                    title: 'Error',
                                    content: `
                                        <div class="modal-error-content">
                                            <div class="modal-icon error">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                                </svg>
                                            </div>
                                            <h3>Error Processing Withdrawal</h3>
                                            <p>An error occurred while processing the withdrawal approval. Please try again.</p>
                                        </div>
                                    `,
                                    primaryButton: { text: 'OK', action: () => window.closeModal() },
                                    closable: true
                                });
                            }
                        });
                    
                    // Keep modal open until process completes
                    return false;
                }
            },
            secondaryButton: {
                text: 'Cancel',
                action: () => {
                    // Reset processing flag if user cancels
                    isProcessingWithdrawalApproval = false
                    return true // Close modal
                }
            },
            closable: true
        });
        
        // Setup file upload functionality
        setupReceiptUpload();
    } else {
        // Fallback to direct approval
        processWithdrawalApproval(withdrawalData.id, null);
    }
}

// Setup receipt upload functionality
function setupReceiptUpload() {
    const uploadArea = document.getElementById('receipt-upload-area');
    const fileInput = document.getElementById('receipt-file');
    const placeholder = document.getElementById('upload-placeholder');
    const preview = document.getElementById('file-preview');
    const fileName = document.getElementById('file-name');
    const removeBtn = document.getElementById('remove-file');
    
    if (!uploadArea || !fileInput || !placeholder || !preview) return;
    
    // Click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File selection
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                if (window.openModal) {
                    window.openModal({
                        title: 'File Too Large',
                        content: `
                            <div class="modal-error-content">
                                <div class="modal-icon error">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                </div>
                                <h3>File Too Large</h3>
                                <p>File size must be less than 5MB. Please select a smaller file.</p>
                            </div>
                        `,
                        primaryButton: { text: 'OK', action: () => window.closeModal() },
                        closable: true
                    })
                } else {
                    alert('File size must be less than 5MB');
                }
                fileInput.value = '';
                return;
            }
            
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                if (window.openModal) {
                    window.openModal({
                        title: 'Invalid File Type',
                        content: `
                            <div class="modal-error-content">
                                <div class="modal-icon error">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                </div>
                                <h3>Invalid File Type</h3>
                                <p>Please select a valid file (JPG, PNG, or PDF).</p>
                            </div>
                        `,
                        primaryButton: { text: 'OK', action: () => window.closeModal() },
                        closable: true
                    })
                } else {
                    alert('Please select a valid file (JPG, PNG, or PDF)');
                }
                fileInput.value = '';
                return;
            }
            
            fileName.textContent = file.name;
            placeholder.style.display = 'none';
            preview.style.display = 'flex';
        }
    });
    
    // Remove file
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.value = '';
            placeholder.style.display = 'flex';
            preview.style.display = 'none';
        });
    }
}

// Process withdrawal approval with receipt
async function processWithdrawalApproval(withdrawalId, receiptFile) {
    try {
        console.log('Processing withdrawal approval:', withdrawalId, 'Receipt:', !!receiptFile)
        console.log('Current processing flag state:', isProcessingWithdrawalApproval)
        
        let receiptUrl = null;
        
        // Upload receipt if provided
        if (receiptFile) {
            console.log('Uploading receipt file...')
            const fileExt = receiptFile.name.split('.').pop();
            const fileName = `receipt_${withdrawalId}_${Date.now()}.${fileExt}`;
            
            // Use the 'receipts' bucket for admin uploads
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('receipts')
                .upload(fileName, receiptFile, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (uploadError) {
                console.error('Error uploading receipt:', uploadError)
                // Continue with approval even if receipt upload fails
            } else {
                // Get the public URL for the uploaded file
                const { data: urlData } = supabaseClient.storage
                    .from('receipts')
                    .getPublicUrl(fileName);
                receiptUrl = urlData.publicUrl;
                console.log('Receipt uploaded successfully:', receiptUrl)
                
                // Create notification for user about receipt upload
                const { data: withdrawalData } = await supabaseClient
                    .from('withdrawals')
                    .select('user_id, amount, method')
                    .eq('id', withdrawalId)
                    .single()
                
                if (withdrawalData) {
                    await createAdminNotification(
                        withdrawalData.user_id,
                        'Receipt Proof Uploaded',
                        `A receipt proof has been uploaded for your withdrawal of ₱${withdrawalData.amount} via ${withdrawalData.method === 'gcash' ? 'GCash' : 'Bank Account'}.`,
                        'info'
                    )
                }
            }
        }
        
        // Update withdrawal status
        const updateData = {
            status: 'approved',
            processed_at: new Date().toISOString()
        };
        
        // Store receipt URL in database if receipt was uploaded
        if (receiptUrl) {
            updateData.receipt_url = receiptUrl;
            console.log('Storing receipt URL in database:', receiptUrl);
            console.log('Update data before database call:', updateData);
        } else {
            console.log('No receipt URL to store');
        }
        
        console.log('Updating withdrawal with data:', updateData);
        const { data: updateResult, error } = await supabaseClient
            .from('withdrawals')
            .update(updateData)
            .eq('id', withdrawalId)
            .select()
        
        console.log('Database update result:', { updateResult, error });
        console.log('Updated withdrawal data:', updateResult);
        
        if (error) {
            console.error('Error approving withdrawal:', error)
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            })
            
            // If error is related to receipt_url column, try without it
            if (error.message && error.message.includes('receipt_url')) {
                console.log('Receipt URL column not found, trying without it...');
                const fallbackData = {
                    status: 'approved',
                    processed_at: new Date().toISOString(),
                    admin_notes: receiptUrl ? `Receipt proof: ${receiptUrl}` : 'Withdrawal approved'
                };
                
                const { error: fallbackError } = await supabaseClient
                    .from('withdrawals')
                    .update(fallbackData)
                    .eq('id', withdrawalId)
                
                if (fallbackError) {
                    console.error('Fallback update also failed:', fallbackError);
                } else {
                    console.log('Fallback update successful, receipt stored in admin_notes');
                    // Continue with success flow
                    return await handleApprovalSuccess(withdrawalId, receiptUrl);
                }
            }
            
            if (window.openModal) {
                window.openModal({
                    title: 'Error',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Error Approving Withdrawal</h3>
                            <p>Unable to approve withdrawal. Please try again.</p>
                            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon warning-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">${error.message}</span>
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: { text: 'OK', action: () => window.closeModal() },
                    closable: true
                })
            } else {
                alert('Error approving withdrawal: ' + error.message)
            }
            return
        }
        
        console.log('Withdrawal approved successfully')
        console.log('About to call handleApprovalSuccess with withdrawalId:', withdrawalId, 'receiptUrl:', receiptUrl)
        
        // Add a small delay to ensure the database update is committed
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const result = await handleApprovalSuccess(withdrawalId, receiptUrl);
        console.log('handleApprovalSuccess completed with result:', result)
        return result;
    } catch (error) {
        console.error('Error in processWithdrawalApproval:', error)
        if (window.openModal) {
            window.openModal({
                title: 'Error',
                content: `
                    <div class="modal-error-content">
                        <div class="modal-icon error">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <h3>Error Approving Withdrawal</h3>
                        <p>An unexpected error occurred. Please try again.</p>
                    </div>
                `,
                primaryButton: { text: 'OK', action: () => window.closeModal() },
                closable: true
            })
        } else {
            alert('Error showing approval modal: ' + error.message)
        }
    } finally {
        // Always reset the processing flag
        isProcessingWithdrawalApproval = false
        console.log('Reset processing flag to false')
    }
}

// Handle approval success (extracted to avoid duplication)
async function handleApprovalSuccess(withdrawalId, receiptUrl) {
    console.log('handleApprovalSuccess called with withdrawalId:', withdrawalId, 'receiptUrl:', receiptUrl)
    
    // Get withdrawal data for success modal and notification
    const { data: updatedWithdrawalData, error: fetchError } = await supabaseClient
        .from('withdrawals')
        .select('*')
        .eq('id', withdrawalId)
        .single()
    
    console.log('Fetched updated withdrawal data:', { updatedWithdrawalData, fetchError })
    
    // Show success modal
    if (window.openModal) {
        window.openModal({
            title: 'Success',
            content: `
                <div class="modal-success-content">
                    <div class="modal-icon success">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <h3>Withdrawal Approved</h3>
                    <p>Withdrawal has been successfully approved and processed.</p>
                    ${updatedWithdrawalData ? `
                        <div style="background: linear-gradient(135deg, rgba(5, 150, 105, 0.1), rgba(16, 185, 129, 0.05)); border: 1px solid rgba(5, 150, 105, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #059669; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon info-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">Amount: ₱${updatedWithdrawalData.amount.toFixed(2)} via ${updatedWithdrawalData.method.toUpperCase()}</span>
                            </p>
                            ${receiptUrl ? `
                                <p style="color: #059669; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 8px 0 0 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon info-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">Receipt uploaded successfully</span>
                                </p>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            `,
            primaryButton: { text: 'OK', action: () => window.closeModal() },
            closable: true
        })
    } else {
        alert('Withdrawal approved successfully!')
    }
    
    // Try to update existing transaction record to mark withdrawal as approved
    // This is optional and won't block the approval process
    if (updatedWithdrawalData) {
        console.log('Updating transaction record for withdrawal approval:', updatedWithdrawalData.id)
        try {
            const { error: transactionError } = await supabaseClient
                .from('transactions')
                .update({
                    description: `Withdrawal approved: ₱${updatedWithdrawalData.amount} via ${updatedWithdrawalData.method === 'gcash' ? 'GCash' : 'Bank Account'}`,
                    reference: updatedWithdrawalData.reference
                })
                .eq('withdrawal_id', updatedWithdrawalData.id)
                .eq('type', 'withdrawal')
            
            if (transactionError) {
                console.warn('Could not update transaction record (this is optional):', transactionError.message)
            } else {
                console.log('Withdrawal transaction record updated successfully')
            }
        } catch (error) {
            console.warn('Transaction update failed (this is optional):', error.message)
        }
    }
    
    // Create notification for user
    if (updatedWithdrawalData) {
        console.log('Creating notification for user:', updatedWithdrawalData.user_id)
        const notificationResult = await createAdminNotification(
            updatedWithdrawalData.user_id,
            'Withdrawal Approved',
            `Your withdrawal of ₱${updatedWithdrawalData.amount} via ${updatedWithdrawalData.method === 'gcash' ? 'GCash' : 'Bank Account'} has been approved and processed.`,
            'success'
        )
        console.log('Notification creation result:', notificationResult)
    } else {
        console.log('No updated withdrawal data available for notification')
    }
    
    // Update local withdrawal data instead of reloading all
    updateWithdrawalInList(withdrawalId, { status: 'approved', processed_at: new Date().toISOString() })
    renderWithdrawals()
}

// Reject withdrawal and return funds
async function rejectWithdrawal(withdrawalId) {
    // Prevent multiple simultaneous rejections
    if (isProcessingWithdrawalRejection) {
        console.log('Already processing withdrawal rejection, ignoring request for:', withdrawalId)
        return
    }
    
    isProcessingWithdrawalRejection = true
    
    // Show reason input modal first
    if (window.openModal) {
        window.openModal({
            title: 'Reject Withdrawal',
            content: `
                <div class="modal-form-content">
                    <div class="modal-warning-content">
                        <div class="modal-icon warning">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2"/>
                                <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/>
                                <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <h3>Reject Withdrawal</h3>
                        <p>Please provide a reason for rejecting this withdrawal. The funds will be returned to the user's wallet.</p>
                    </div>
                    
                    <form id="reject-withdrawal-form">
                        <div class="form-group">
                            <label for="rejection-reason">Reason for Rejection *</label>
                            <textarea id="rejection-reason" rows="4" placeholder="Please provide a detailed reason for rejecting this withdrawal..." required></textarea>
                            <small>This reason will be sent to the user via notification.</small>
                        </div>
                        <div id="reject-error" class="error-message" style="display: none;"></div>
                    </form>
                </div>
            `,
            primaryButton: { 
                text: 'Reject Withdrawal', 
                action: () => {
                    const reason = document.getElementById('rejection-reason').value.trim()
                    if (!reason) {
                        document.getElementById('reject-error').textContent = 'Please provide a reason for rejection'
                        document.getElementById('reject-error').style.display = 'block'
                        return false // Keep modal open
                    }
                    
                    // Disable the button and show processing state
                    const button = document.querySelector('.modal-primary-btn')
                    if (button) {
                        button.disabled = true
                        button.innerHTML = '<span class="spinner"></span> Processing...'
                    }
                    
                    // Process rejection and handle result
                    processWithdrawalRejection(withdrawalId, reason)
                        .then(() => {
                            // Success - modal will be closed by the success modal
                            return true
                        })
                        .catch((error) => {
                            // Error - modal will be closed by the error modal
                            console.error('Rejection failed:', error)
                            return true
                        })
                    
                    return false // Keep modal open during processing
                }
            },
            secondaryButton: {
                text: 'Cancel',
                action: () => {
                    // Reset processing flag if user cancels
                    isProcessingWithdrawalRejection = false
                    return true // Close modal
                }
            },
            closable: true
        })
    } else {
        const reason = prompt('Please provide a reason for rejection:')
        if (!reason) {
            if (window.openModal) {
                window.openModal({
                    title: 'Reason Required',
                    content: `
                        <div class="modal-warning-content">
                            <div class="modal-icon warning">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2"/>
                                    <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/>
                                    <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Reason Required</h3>
                            <p>Rejection requires a reason. Please provide a reason for rejecting this withdrawal.</p>
                        </div>
                    `,
                    primaryButton: { text: 'OK', action: () => window.closeModal() },
                    closable: true
                })
            } else {
                alert('Rejection requires a reason.')
            }
            return
        }
        processWithdrawalRejection(withdrawalId, reason)
    }
}

// Process withdrawal rejection with reason
async function processWithdrawalRejection(withdrawalId, reason) {
    try {
        console.log('Rejecting withdrawal:', withdrawalId, 'Reason:', reason)
        
        // Get withdrawal details first
        const { data: withdrawalData, error: fetchError } = await supabaseClient
            .from('withdrawals')
            .select('*')
            .eq('id', withdrawalId)
            .single()
        
        if (fetchError) {
            console.error('Error fetching withdrawal:', fetchError)
            if (window.openModal) {
                window.openModal({
                    title: 'Error',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Error Fetching Withdrawal</h3>
                            <p>Unable to fetch withdrawal details. Please try again.</p>
                            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon warning-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">${fetchError.message}</span>
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: { text: 'OK', action: () => window.closeModal() },
                    closable: true
                })
            } else {
                alert('Error fetching withdrawal: ' + fetchError.message)
            }
            return
        }
        
        // Update withdrawal status
        const { error: updateError } = await supabaseClient
            .from('withdrawals')
            .update({
                status: 'rejected',
                processed_at: new Date().toISOString()
            })
            .eq('id', withdrawalId)
        
        if (updateError) {
            console.error('Error rejecting withdrawal:', updateError)
            if (window.openModal) {
                window.openModal({
                    title: 'Error',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Error Rejecting Withdrawal</h3>
                            <p>Unable to reject withdrawal. Please try again.</p>
                            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon warning-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">${updateError.message}</span>
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: { text: 'OK', action: () => window.closeModal() },
                    closable: true
                })
            } else {
                alert('Error rejecting withdrawal: ' + updateError.message)
            }
            return
        }
        
        // Get current wallet balance first
        const { data: currentWallet, error: walletFetchError } = await supabaseClient
            .from('user_wallets')
            .select('balance')
            .eq('user_id', withdrawalData.user_id)
            .single()
        
        if (walletFetchError) {
            console.error('Error fetching wallet:', walletFetchError)
            if (window.openModal) {
                window.openModal({
                    title: 'Error',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Error Fetching Wallet</h3>
                            <p>Unable to fetch user wallet. Please try again.</p>
                            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon warning-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">${walletFetchError.message}</span>
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: { text: 'OK', action: () => window.closeModal() },
                    closable: true
                })
            } else {
                alert('Error fetching wallet: ' + walletFetchError.message)
            }
            return
        }
        
        // Return funds to user wallet by adding the refund amount
        const { error: walletError } = await supabaseClient
            .from('user_wallets')
            .update({
                balance: currentWallet.balance + withdrawalData.amount
            })
            .eq('user_id', withdrawalData.user_id)
        
        // Also update profiles table
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .update({
                balance: currentWallet.balance + withdrawalData.amount
            })
            .eq('id', withdrawalData.user_id)
        
        if (profileError) {
            console.error('Error updating profile balance:', profileError)
            // Don't return here, wallet update was successful
        }
        
        if (walletError) {
            console.error('Error returning funds:', walletError)
            if (window.openModal) {
                window.openModal({
                    title: 'Error',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Error Returning Funds</h3>
                            <p>Unable to return funds to user wallet. Please try again.</p>
                            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon warning-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">${walletError.message}</span>
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: { text: 'OK', action: () => window.closeModal() },
                    closable: true
                })
            } else {
                alert('Error returning funds: ' + walletError.message)
            }
            return
        }
        
        // Try to update existing withdrawal transaction record to mark as rejected
        // This is optional and won't block the rejection process
        try {
            const { error: withdrawalTransactionError } = await supabaseClient
                .from('transactions')
                .update({
                    description: `Withdrawal rejected: ₱${withdrawalData.amount} via ${withdrawalData.method.toUpperCase()} - Reason: ${reason || 'No reason provided'}`
                })
                .eq('withdrawal_id', withdrawalId)
                .eq('type', 'withdrawal')
            
            if (withdrawalTransactionError) {
                console.warn('Could not update transaction record (this is optional):', withdrawalTransactionError.message)
            } else {
                console.log('Transaction record updated successfully')
            }
        } catch (error) {
            console.warn('Transaction update failed (this is optional):', error.message)
        }
        
        // Create transaction record for refund
        const { error: transactionError } = await supabaseClient
            .from('transactions')
            .insert({
                user_id: withdrawalData.user_id,
                amount: withdrawalData.amount,
                type: 'refund',
                description: `Withdrawal refund: ₱${withdrawalData.amount} via ${withdrawalData.method.toUpperCase()} - Reason: ${reason || 'No reason provided'}`,
                reference: withdrawalData.reference,
                created_at: new Date().toISOString()
            })
        
        if (transactionError) {
            console.error('Error creating refund transaction record:', transactionError)
            // Don't fail the refund for transaction errors
        }
        
        // Notification will be created later using createAdminNotification function
        
        console.log('Withdrawal rejected and funds returned successfully')
        
        // Close the rejection modal first
        if (window.closeModal) {
            window.closeModal()
        }
        
        if (window.openModal) {
            window.openModal({
                title: 'Success',
                content: `
                    <div class="modal-success-content">
                        <div class="modal-icon success">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <h3>Withdrawal Rejected</h3>
                        <p>Withdrawal has been successfully rejected and funds have been returned to the user's wallet.</p>
                        <div style="background: linear-gradient(135deg, rgba(5, 150, 105, 0.1), rgba(16, 185, 129, 0.05)); border: 1px solid rgba(5, 150, 105, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #059669; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon info-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">Amount: ₱${withdrawalData.amount.toFixed(2)} via ${withdrawalData.method.toUpperCase()}</span>
                            </p>
                        </div>
                        <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.05)); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #d97706; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon warning-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">Reason: ${reason}</span>
                            </p>
                        </div>
                    </div>
                `,
                primaryButton: { text: 'OK', action: () => window.closeModal() },
                closable: true
            })
        } else {
            alert('Withdrawal rejected successfully! Funds have been returned to user wallet.')
        }
        
        // Create notification for user
        await createAdminNotification(
            withdrawalData.user_id,
            'Withdrawal Rejected',
            `Your withdrawal of ₱${withdrawalData.amount} via ${withdrawalData.method.toUpperCase()} was rejected.\n\nReason: ${reason}\n\nThe amount has been returned to your wallet.`,
            'warning'
        )
        
        // Update local withdrawal data instead of reloading all
        updateWithdrawalInList(withdrawalId, { status: 'rejected', processed_at: new Date().toISOString() })
        renderWithdrawals()
        
    } catch (error) {
        console.error('Error rejecting withdrawal:', error)
        
        // Close the rejection modal first
        if (window.closeModal) {
            window.closeModal()
        }
        
        if (window.openModal) {
            window.openModal({
                title: 'Error',
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
                        <p>An unexpected error occurred while rejecting withdrawal.</p>
                        <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon warning-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">${error.message}</span>
                            </p>
                        </div>
                    </div>
                `,
                primaryButton: { text: 'OK', action: () => window.closeModal() },
                closable: true
            })
        } else {
            alert('Error rejecting withdrawal: ' + error.message)
        }
    } finally {
        // Reset processing flag
        isProcessingWithdrawalRejection = false
        
        // Re-enable the button if it was disabled
        const button = document.querySelector('.modal-primary-btn')
        if (button && button.disabled) {
            button.disabled = false
            button.innerHTML = 'Reject Withdrawal'
        }
    }
}

// Reset event listeners (for debugging or re-initialization)
function resetWithdrawalEventListeners() {
    withdrawalEventListenersAttached = false
    console.log('Withdrawal event listeners reset')
}

// Reset processing flags (for debugging or recovery)
function resetWithdrawalProcessingFlags() {
    isProcessingWithdrawalApproval = false
    isProcessingWithdrawalRejection = false
    console.log('Withdrawal processing flags reset')
}

// Initialize admin withdrawals with lazy loading
async function initializeAdminWithdrawals() {
    console.log('Initializing admin withdrawals with lazy loading...')
    
    // Reset state
    allWithdrawals = []
    currentPage = 1
    hasMoreWithdrawals = true
    userDataCache.clear()
    
    // Load first page
    await loadWithdrawals(true)
    
    // Render with loading state
    await renderWithdrawals()
    
    console.log('Admin withdrawals initialized')
}

// Export functions for global access
window.loadAdminWithdrawals = loadWithdrawals
window.renderAdminWithdrawals = renderWithdrawals
window.attachWithdrawalEventListeners = attachWithdrawalEventListeners
window.resetWithdrawalEventListeners = resetWithdrawalEventListeners
window.resetWithdrawalProcessingFlags = resetWithdrawalProcessingFlags
window.approveWithdrawal = approveWithdrawal
window.rejectWithdrawal = rejectWithdrawal
window.initializeAdminWithdrawals = initializeAdminWithdrawals
