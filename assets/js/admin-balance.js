// Admin Balance Management
let allUsers = []
let currentBalanceFilter = 'all'

// Format user ID with Q prefix
function formatUserId(userId) {
    if (!userId) return 'Q0000';
    
    // Extract numeric part from UUID (last 4 characters of the first 8)
    const numericPart = userId.substring(4, 8);
    
    // Convert to number and format with leading zeros
    const numericValue = parseInt(numericPart, 16);
    const formattedNumber = numericValue.toString().padStart(4, '0');
    
    return `Q${formattedNumber}`;
}

// Load all users for balance management
export async function loadUsers() {
    try {
        console.log('Loading users for balance management...')
        
        // Load profiles first (exclude admin users)
        const { data: profiles, error: profilesError } = await supabaseClient
            .from('profiles')
            .select('id, email, balance, created_at, role, is_active')
            .neq('role', 'admin')
            .order('created_at', { ascending: false })
        
        if (profilesError) {
            throw profilesError
        }
        
        // Load user wallets separately
        const { data: wallets, error: walletsError } = await supabaseClient
            .from('user_wallets')
            .select('user_id, balance')
        
        if (walletsError) {
            console.warn('Could not load user wallets:', walletsError)
        }
        
        // Combine the data
        const users = profiles.map(profile => {
            const wallet = wallets?.find(w => w.user_id === profile.id)
            return {
                ...profile,
                wallet_balance: wallet?.balance || profile.balance || 0
            }
        })
        
        allUsers = users || []
        console.log('Loaded users:', allUsers.length)
        renderUsers()
        
    } catch (error) {
        console.error('Error loading users:', error)
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
                        <p>An unexpected error occurred while loading users.</p>
                    </div>
                `,
                primaryButton: { text: 'OK', action: () => window.closeModal() },
                closable: true
            })
        } else {
            alert('Error loading users: ' + error.message)
        }
    }
}

// Render users cards
function renderUsers() {
    const usersList = document.getElementById('users-list')
    if (!usersList) return
    
    const filteredUsers = getFilteredUsers()
    
    usersList.innerHTML = `
        <div class="admin-cards-header">
            <div class="admin-cards-filters">
                <button class="admin-filter-btn ${currentBalanceFilter === 'all' ? 'active' : ''}" data-filter="all">
                    All Users (${allUsers.length})
                </button>
                <button class="admin-filter-btn ${currentBalanceFilter === 'with-balance' ? 'active' : ''}" data-filter="with-balance">
                    With Balance (${allUsers.filter(u => u.wallet_balance > 0).length})
                </button>
                <button class="admin-filter-btn ${currentBalanceFilter === 'zero-balance' ? 'active' : ''}" data-filter="zero-balance">
                    Zero Balance (${allUsers.filter(u => u.wallet_balance === 0).length})
                </button>
            </div>
            <div class="admin-cards-actions">
                <button class="admin-btn admin-btn-secondary" id="refresh-users-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 12A9 9 0 0 1 12 3A9 9 0 0 1 21 12A9 9 0 0 1 12 21A9 9 0 0 1 3 12Z" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 3V12L16.5 16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Refresh
                </button>
            </div>
        </div>
        <div class="admin-users-grid">
            ${filteredUsers.map(user => {
                const userName = user.email || 'Unknown User'
                const balance = user.wallet_balance || 0
                const joinDate = new Date(user.created_at).toLocaleDateString()
                const isActive = user.is_active !== false
                
                return `
                    <div class="admin-user-card">
                        <div class="user-card-header">
                            <div class="user-avatar">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <div class="user-status">
                                <span class="status-badge ${isActive ? 'active' : 'inactive'}">
                                    ${isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                        
                        <div class="user-card-body">
                            <h3 class="user-name">${userName}</h3>
                            <p class="user-email">${user.email}</p>
                            <div class="user-balance">
                                <span class="balance-label">Balance</span>
                                <span class="balance-amount">₱${balance.toFixed(2)}</span>
                            </div>
                            <div class="user-meta">
                                <span class="user-role">${user.role || 'User'}</span>
                                <span class="user-join-date">Joined ${joinDate}</span>
                            </div>
                        </div>
                        
                        <div class="user-card-actions">
                            <button class="admin-btn admin-btn-sm admin-btn-primary" data-action="view-details" data-user-id="${user.id}" data-user-name="${userName}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                Details
                            </button>
                            <button class="admin-btn admin-btn-sm admin-btn-secondary" data-action="view-activity" data-user-id="${user.id}" data-user-name="${userName}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 12A9 9 0 0 1 12 3A9 9 0 0 1 21 12A9 9 0 0 1 12 21A9 9 0 0 1 3 12Z" stroke="currentColor" stroke-width="2"/>
                                    <path d="M12 3V12L16.5 16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Activity
                            </button>
                            <button class="admin-btn admin-btn-sm ${isActive ? 'admin-btn-warning' : 'admin-btn-success'}" data-action="toggle-status" data-user-id="${user.id}" data-user-name="${userName}" data-current-status="${isActive}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                ${isActive ? 'Disable' : 'Enable'}
                            </button>
                            <button class="admin-btn admin-btn-sm admin-btn-primary" data-action="adjust-balance" data-user-id="${user.id}" data-user-name="${userName}" data-current-balance="${balance}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M18 12v.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Balance
                            </button>
                        </div>
                    </div>
                `
            }).join('')}
        </div>
    `
    
    attachUserEventListeners()
}

// Get filtered users based on current filter
function getFilteredUsers() {
    switch (currentBalanceFilter) {
        case 'with-balance':
            return allUsers.filter(user => user.wallet_balance > 0)
        case 'zero-balance':
            return allUsers.filter(user => user.wallet_balance === 0)
        default:
            return allUsers
    }
}

// Attach event listeners
function attachUserEventListeners() {
    // Filter buttons
    const filterButtons = document.querySelectorAll('.admin-filter-btn')
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'))
            this.classList.add('active')
            currentBalanceFilter = this.getAttribute('data-filter')
            renderUsers()
        })
    })
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-users-btn')
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadUsers)
    }
    
    // Action buttons
    const actionButtons = document.querySelectorAll('[data-action]')
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action')
            const userId = this.getAttribute('data-user-id')
            const userName = this.getAttribute('data-user-name')
            const currentBalance = parseFloat(this.getAttribute('data-current-balance'))
            const currentStatus = this.getAttribute('data-current-status')
            
            switch (action) {
                case 'adjust-balance':
                    showBalanceAdjustmentModal(userId, userName, currentBalance)
                    break
                case 'view-details':
                    showUserDetailsModal(userId, userName)
                    break
                case 'view-activity':
                    showUserActivityModal(userId, userName)
                    break
                case 'toggle-status':
                    toggleUserStatus(userId, userName, currentStatus === 'true')
                    break
            }
        })
    })
}

// Show balance adjustment modal
function showBalanceAdjustmentModal(userId, userName, currentBalance) {
    if (window.openModal) {
        window.openModal({
            title: 'Adjust User Balance',
            content: `
                <div class="modal-form-content">
                    <div class="modal-info-content">
                        <div class="modal-icon info">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 16V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M12 8H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h3>Balance Adjustment</h3>
                        <p>Adjust the balance for <strong>${userName}</strong></p>
                        <div class="current-balance-display">
                            <span class="balance-label">Current Balance:</span>
                            <span class="balance-amount">₱${currentBalance.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <form id="balance-adjustment-form">
                        <div class="form-group">
                            <label for="adjustment-type">Adjustment Type *</label>
                            <select id="adjustment-type" required>
                                <option value="">Select type...</option>
                                <option value="add">Add Amount</option>
                                <option value="subtract">Subtract Amount</option>
                                <option value="set">Set Amount</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="adjustment-amount">Amount *</label>
                            <input type="number" id="adjustment-amount" step="0.01" min="0" placeholder="0.00" required>
                            <small>Enter the amount in pesos (₱)</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="adjustment-reason">Reason *</label>
                            <textarea id="adjustment-reason" rows="3" placeholder="Enter reason for this balance adjustment..." required></textarea>
                            <small>This reason will be logged in the transaction history</small>
                        </div>
                        
                        <div id="balance-preview" class="balance-preview" style="display: none;">
                            <div class="preview-item">
                                <span class="preview-label">Current Balance:</span>
                                <span class="preview-value">₱${currentBalance.toFixed(2)}</span>
                            </div>
                            <div class="preview-item">
                                <span class="preview-label">Adjustment:</span>
                                <span class="preview-value" id="preview-adjustment">₱0.00</span>
                            </div>
                            <div class="preview-item total">
                                <span class="preview-label">New Balance:</span>
                                <span class="preview-value" id="preview-total">₱${currentBalance.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        <div id="balance-error" class="error-message" style="display: none;"></div>
                    </form>
                </div>
            `,
            primaryButton: { 
                text: 'Apply Adjustment', 
                action: () => processBalanceAdjustment(userId, userName, currentBalance)
            },
            closable: true,
            onOpen: () => setupBalanceAdjustmentForm(currentBalance)
        })
    }
}

// Setup balance adjustment form
function setupBalanceAdjustmentForm(currentBalance) {
    const adjustmentType = document.getElementById('adjustment-type')
    const adjustmentAmount = document.getElementById('adjustment-amount')
    const preview = document.getElementById('balance-preview')
    const previewAdjustment = document.getElementById('preview-adjustment')
    const previewTotal = document.getElementById('preview-total')
    
    function updatePreview() {
        const type = adjustmentType.value
        const amount = parseFloat(adjustmentAmount.value) || 0
        
        if (type && amount > 0) {
            let newBalance = currentBalance
            let adjustmentText = ''
            
            switch (type) {
                case 'add':
                    newBalance = currentBalance + amount
                    adjustmentText = `+₱${amount.toFixed(2)}`
                    break
                case 'subtract':
                    newBalance = currentBalance - amount
                    adjustmentText = `-₱${amount.toFixed(2)}`
                    break
                case 'set':
                    newBalance = amount
                    adjustmentText = `Set to ₱${amount.toFixed(2)}`
                    break
            }
            
            previewAdjustment.textContent = adjustmentText
            previewTotal.textContent = `₱${newBalance.toFixed(2)}`
            preview.style.display = 'block'
        } else {
            preview.style.display = 'none'
        }
    }
    
    adjustmentType.addEventListener('change', updatePreview)
    adjustmentAmount.addEventListener('input', updatePreview)
}

// Process balance adjustment
async function processBalanceAdjustment(userId, userName, currentBalance) {
    try {
        const adjustmentType = document.getElementById('adjustment-type').value
        const adjustmentAmount = parseFloat(document.getElementById('adjustment-amount').value)
        const reason = document.getElementById('adjustment-reason').value.trim()
        
        // Validation
        if (!adjustmentType) {
            showBalanceError('Please select an adjustment type')
            return false
        }
        
        if (!adjustmentAmount || adjustmentAmount <= 0) {
            showBalanceError('Please enter a valid amount')
            return false
        }
        
        if (!reason) {
            showBalanceError('Please provide a reason for this adjustment')
            return false
        }
        
        // Calculate new balance
        let newBalance = currentBalance
        let transactionType = ''
        let transactionDescription = ''
        
        switch (adjustmentType) {
            case 'add':
                newBalance = currentBalance + adjustmentAmount
                transactionType = 'reward'
                transactionDescription = `Admin credit: ${reason}`
                break
            case 'subtract':
                if (adjustmentAmount > currentBalance) {
                    showBalanceError('Cannot subtract more than current balance')
                    return false
                }
                newBalance = currentBalance - adjustmentAmount
                transactionType = 'withdrawal'
                transactionDescription = `Admin debit: ${reason}`
                break
            case 'set':
                newBalance = adjustmentAmount
                transactionType = 'reward'
                transactionDescription = `Admin set balance: ${reason}`
                break
        }
        
        // Update user_wallets table
        const { error: walletError } = await supabaseClient
            .from('user_wallets')
            .update({
                balance: newBalance
            })
            .eq('user_id', userId)
        
        if (walletError) {
            console.error('Error updating wallet:', walletError)
            showBalanceError('Failed to update wallet balance')
            return false
        }
        
        // Update profiles table
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .update({
                balance: newBalance
            })
            .eq('id', userId)
        
        if (profileError) {
            console.error('Error updating profile:', profileError)
            // Don't fail here, wallet update was successful
        }
        
        // Create transaction record
        const { error: transactionError } = await supabaseClient
            .from('transactions')
            .insert({
                user_id: userId,
                amount: Math.abs(adjustmentAmount),
                type: transactionType,
                description: transactionDescription,
                created_at: new Date().toISOString()
            })
        
        if (transactionError) {
            console.error('Error creating transaction record:', transactionError)
            // Don't fail here, balance update was successful
        }
        
        // Create notification for user
        const { error: notificationError } = await supabaseClient
            .from('notifications')
            .insert({
                user_id: userId,
                title: 'Balance Adjusted',
                message: `Your balance has been adjusted by an administrator. New balance: ₱${newBalance.toFixed(2)}. Reason: ${reason}`,
                type: 'info',
                created_at: new Date().toISOString()
            })
        
        if (notificationError) {
            console.error('Error creating notification:', notificationError)
            // Don't fail here, balance update was successful
        }
        
        // Show success message
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
                        <h3>Balance Updated Successfully</h3>
                        <p>User <strong>${userName}</strong>'s balance has been updated.</p>
                        <div class="balance-summary">
                            <div class="summary-item">
                                <span class="summary-label">Previous Balance:</span>
                                <span class="summary-value">₱${currentBalance.toFixed(2)}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">New Balance:</span>
                                <span class="summary-value">₱${newBalance.toFixed(2)}</span>
                            </div>
                            <div class="summary-item">
                                <span class="summary-label">Change:</span>
                                <span class="summary-value ${newBalance > currentBalance ? 'positive' : newBalance < currentBalance ? 'negative' : 'neutral'}">
                                    ${newBalance > currentBalance ? '+' : ''}₱${(newBalance - currentBalance).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                `,
                primaryButton: { text: 'OK', action: () => {
                    window.closeModal()
                    loadUsers() // Refresh the users list
                }},
                closable: true
            })
        }
        
        return true
        
    } catch (error) {
        console.error('Error processing balance adjustment:', error)
        showBalanceError('An unexpected error occurred')
        return false
    }
}

// Show balance error
function showBalanceError(message) {
    const errorDiv = document.getElementById('balance-error')
    if (errorDiv) {
        errorDiv.textContent = message
        errorDiv.style.display = 'block'
    }
}

// Show user details modal
function showUserDetailsModal(userId, userName) {
    if (window.openModal) {
        window.openModal({
            title: 'User Details',
            content: `
                <div class="modal-info-content">
                    <div class="modal-icon info">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <h3>User Information</h3>
                    <p>Detailed information for <strong>${userName}</strong></p>
                    <div class="user-details-info">
                        <div class="detail-item">
                            <span class="detail-label">User ID:</span>
                            <span class="detail-value">${formatUserId(userId)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value">Loading...</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Last Active:</span>
                            <span class="detail-value">Loading...</span>
                        </div>
                    </div>
                </div>
            `,
            primaryButton: { text: 'Close', action: () => window.closeModal() },
            closable: true
        })
    }
}

// Show user activity modal
async function showUserActivityModal(userId, userName) {
    if (window.openModal) {
        window.openModal({
            title: 'User Activity',
            content: `
                <div class="modal-info-content">
                    <div class="modal-icon info">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 12A9 9 0 0 1 12 3A9 9 0 0 1 21 12A9 9 0 0 1 12 21A9 9 0 0 1 3 12Z" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 3V12L16.5 16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h3>User Activity</h3>
                    <p>Activity history for <strong>${userName}</strong></p>
                    <div class="activity-list" id="user-activity-list">
                        <div class="activity-item">
                            <div class="activity-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="activity-details">
                                <div class="activity-title">Loading activity...</div>
                                <div class="activity-time">Please wait</div>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            primaryButton: { text: 'Close', action: () => window.closeModal() },
            closable: true
        })
        
        // Load user activity data
        await loadUserActivity(userId)
    }
}

// Load user activity data
async function loadUserActivity(userId) {
    try {
        const activityList = document.getElementById('user-activity-list')
        if (!activityList) return
        
        // Show loading state
        activityList.innerHTML = `
            <div class="activity-loading">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Loading activity...
            </div>
        `
        
        // Load transactions
        const { data: transactions, error: transactionsError } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)
        
        console.log('Transactions loaded:', transactions?.length || 0, transactionsError)
        if (transactions && transactions.length > 0) {
            console.log('Sample transaction:', transactions[0])
        }
        
        // Load withdrawals
        const { data: withdrawals, error: withdrawalsError } = await supabaseClient
            .from('withdrawals')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)
        
        console.log('Withdrawals loaded:', withdrawals?.length || 0, withdrawalsError)
        if (withdrawals && withdrawals.length > 0) {
            console.log('Sample withdrawal:', withdrawals[0])
        }
        
        // Load submissions (handle if table doesn't exist)
        let submissions = []
        let submissionsError = null
        try {
            const { data: submissionsData, error: submissionsErr } = await supabaseClient
                .from('submissions')
                .select('*, tasks(title)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10)
            
            submissions = submissionsData || []
            submissionsError = submissionsErr
            console.log('Submissions loaded:', submissions?.length || 0, submissionsError)
        } catch (err) {
            console.log('Submissions table not found or accessible, skipping...', err)
            submissions = []
            submissionsError = null
        }
        
        // Only throw error if both transactions and withdrawals fail
        if (transactionsError && withdrawalsError) {
            throw new Error('Failed to load activity data')
        }
        
        // Log any errors but continue
        if (transactionsError) {
            console.warn('Failed to load transactions:', transactionsError)
        }
        if (withdrawalsError) {
            console.warn('Failed to load withdrawals:', withdrawalsError)
        }
        
        // Combine and sort all activities
        const activities = []
        
        // Add transactions (exclude withdrawal-related transactions to avoid duplication)
        transactions.forEach(tx => {
            // Skip withdrawal transactions as they're handled separately
            if (tx.type === 'withdrawal' && tx.description && tx.description.includes('withdrawal')) {
                console.log('Skipping duplicate withdrawal transaction:', tx)
                return
            }
            
            const iconData = getTransactionIcon(tx.type)
            activities.push({
                type: 'transaction',
                title: getTransactionTitle(tx.type),
                description: tx.description || '',
                amount: tx.amount,
                created_at: tx.created_at,
                icon: iconData.icon,
                iconColor: iconData.color,
                iconBgColor: iconData.bgColor
            })
        })
        
        // Add withdrawals
        withdrawals.forEach(wd => {
            const iconData = getWithdrawalIcon(wd.status)
            let amount = 0
            let description = `${wd.status.charAt(0).toUpperCase() + wd.status.slice(1)} withdrawal`
            
            // Only show amount for approved withdrawals (as negative)
            if (wd.status === 'approved') {
                amount = -wd.amount
                description = `Approved withdrawal: ₱${wd.amount.toFixed(2)}`
            } else if (wd.status === 'rejected') {
                description = `Rejected withdrawal: ₱${wd.amount.toFixed(2)}`
            } else {
                description = `Pending withdrawal: ₱${wd.amount.toFixed(2)}`
            }
            
            activities.push({
                type: 'withdrawal',
                title: 'Withdrawal Request',
                description: description,
                amount: amount,
                created_at: wd.created_at,
                icon: iconData.icon,
                iconColor: iconData.color,
                iconBgColor: iconData.bgColor,
                status: wd.status
            })
        })
        
        // Add submissions
        submissions.forEach(sub => {
            const iconData = getSubmissionIcon(sub.status)
            activities.push({
                type: 'submission',
                title: 'Task Submission',
                description: sub.tasks?.title || 'Unknown Task',
                amount: 0,
                created_at: sub.created_at,
                icon: iconData.icon,
                iconColor: iconData.color,
                iconBgColor: iconData.bgColor
            })
        })
        
        // Sort by date
        activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        
        // Debug: Log all activities
        console.log('Total activities created:', activities.length)
        activities.forEach((activity, index) => {
            console.log(`Activity ${index + 1}:`, {
                type: activity.type,
                title: activity.title,
                description: activity.description,
                amount: activity.amount,
                status: activity.status
            })
        })
        
        // Add a fallback activity if no data but also no errors
        if (activities.length === 0 && !transactionsError && !withdrawalsError && !submissionsError) {
            activities.push({
                type: 'info',
                title: 'Account Created',
                description: 'User account was created',
                amount: 0,
                created_at: new Date().toISOString(),
                icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                </svg>`
            })
        }
        
        // Render activities
        if (activities.length === 0) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="activity-details">
                        <div class="activity-title">No activity found</div>
                        <div class="activity-time">This user has no recorded activity</div>
                    </div>
                </div>
            `
        } else {
            activityList.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon" style="background-color: ${activity.iconBgColor}; color: ${activity.iconColor};">
                        ${activity.icon}
                    </div>
                    <div class="activity-details">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-description">${activity.description}</div>
                        <div class="activity-time">${new Date(activity.created_at).toLocaleString()}</div>
                    </div>
                    ${activity.amount !== 0 ? `<div class="activity-amount ${activity.amount > 0 ? 'positive' : 'negative'}">${activity.amount > 0 ? '+' : ''}₱${Math.abs(activity.amount).toFixed(2)}</div>` : '<div class="activity-amount zero">—</div>'}
                </div>
            `).join('')
        }
        
    } catch (error) {
        console.error('Error loading user activity:', error)
        const activityList = document.getElementById('user-activity-list')
        if (activityList) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="activity-details">
                        <div class="activity-title">Error loading activity</div>
                        <div class="activity-time">Please try again later</div>
                    </div>
                </div>
            `
        }
    }
}

// Helper functions for activity icons and titles
function getTransactionTitle(type) {
    switch (type) {
        case 'reward': return 'Task Reward'
        case 'withdrawal': return 'Withdrawal'
        case 'refund': return 'Refund'
        default: return 'Transaction'
    }
}

function getTransactionIcon(type) {
    switch (type) {
        case 'reward':
            return {
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
                color: '#10b981', // Green
                bgColor: '#d1fae5'
            }
        case 'withdrawal':
            return {
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12V7H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M3 5v14a2 2 0 0 0 2 2h15v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M17 15l3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
                color: '#ef4444', // Red
                bgColor: '#fee2e2'
            }
        case 'refund':
            return {
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 12h18M12 3l9 9-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
                color: '#f59e0b', // Amber
                bgColor: '#fef3c7'
            }
        default:
            return {
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
                color: '#6b7280', // Gray
                bgColor: '#f3f4f6'
            }
    }
}

function getWithdrawalIcon(status) {
    switch (status) {
        case 'pending':
            return {
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
                color: '#f59e0b', // Amber
                bgColor: '#fef3c7'
            }
        case 'approved':
            return {
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
                color: '#10b981', // Green
                bgColor: '#d1fae5'
            }
        case 'rejected':
            return {
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
                color: '#ef4444', // Red
                bgColor: '#fee2e2'
            }
        default:
            return {
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 12h18M12 3l9 9-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
                color: '#6b7280', // Gray
                bgColor: '#f3f4f6'
            }
    }
}

function getSubmissionIcon(status) {
    switch (status) {
        case 'pending':
            return {
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
                color: '#f59e0b', // Amber
                bgColor: '#fef3c7'
            }
        case 'approved':
            return {
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
                color: '#10b981', // Green
                bgColor: '#d1fae5'
            }
        case 'rejected':
            return {
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
                color: '#ef4444', // Red
                bgColor: '#fee2e2'
            }
        default:
            return {
                icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
                color: '#6b7280', // Gray
                bgColor: '#f3f4f6'
            }
    }
}

// Toggle user status
async function toggleUserStatus(userId, userName, currentStatus) {
    try {
        const newStatus = !currentStatus
        const action = newStatus ? 'enable' : 'disable'
        
        if (window.openModal) {
            window.openModal({
                title: `${newStatus ? 'Enable' : 'Disable'} User`,
                content: `
                    <div class="modal-warning-content">
                        <div class="modal-icon warning">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 9V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M12 17H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h3>${newStatus ? 'Enable' : 'Disable'} User</h3>
                        <p>Are you sure you want to ${action} <strong>${userName}</strong>?</p>
                        <div class="status-change-info">
                            <div class="status-item">
                                <span class="status-label">Current Status:</span>
                                <span class="status-value ${currentStatus ? 'active' : 'inactive'}">${currentStatus ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">New Status:</span>
                                <span class="status-value ${newStatus ? 'active' : 'inactive'}">${newStatus ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>
                    </div>
                `,
                primaryButton: { 
                    text: `${newStatus ? 'Enable' : 'Disable'} User`, 
                    action: async () => {
                        // Update user status in database
                        const { error } = await supabaseClient
                            .from('profiles')
                            .update({ is_active: newStatus })
                            .eq('id', userId)
                        
                        if (error) {
                            console.error('Error updating user status:', error)
                            alert('Failed to update user status')
                            return false
                        }
                        
                        // Show success message
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
                                        <h3>User ${newStatus ? 'Enabled' : 'Disabled'}</h3>
                                        <p><strong>${userName}</strong> has been ${newStatus ? 'enabled' : 'disabled'} successfully.</p>
                                    </div>
                                `,
                                primaryButton: { text: 'OK', action: () => {
                                    window.closeModal()
                                    loadUsers() // Refresh the users list
                                }},
                                closable: true
                            })
                        }
                        return true
                    }
                },
                secondaryButton: { text: 'Cancel', action: () => window.closeModal() },
                closable: true
            })
        }
    } catch (error) {
        console.error('Error toggling user status:', error)
        alert('Failed to update user status')
    }
}

// Export functions for global access
window.loadUsers = loadUsers
window.renderUsers = renderUsers
