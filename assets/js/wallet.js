// Wallet Module

// Helper function to show modals with alert fallback
function showModalOrAlert(title, message, type = 'info') {
    if (window.openModal) {
        const iconColor = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981'
        const iconSvg = type === 'error' ? 
            '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>' :
            type === 'warning' ?
            '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2"/>' :
            '<path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>'
        
        window.openModal({
            title: title,
            content: `
                <div class="modal-${type}-content">
                    <div class="modal-icon ${type}" style="color: ${iconColor};">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            ${iconSvg}
                        </svg>
                    </div>
                    <h3>${title}</h3>
                    <p>${message}</p>
                </div>
            `,
            primaryButton: { text: 'OK', action: () => window.closeModal() },
            closable: true
        })
    } else {
        alert(`${title}: ${message}`)
    }
}
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Global variables
let userWallet = 0
let withdrawals = []
let notifications = []

// Load wallet balance
async function loadWallet() {
    try {
        console.log('Loading wallet...')
        
        // Check if account is disabled
        if (window.isAccountDisabledCheck && window.isAccountDisabledCheck()) {
            console.log('Account is disabled, showing disabled message')
            showDisabledWalletMessage()
            return
        }
        
        // Check if supabaseClient is available
        if (!supabaseClient) {
            console.error('Supabase client not available')
            return
        }
        
        const userId = getCurrentUserId()
        if (!userId) {
            console.error('Cannot load wallet: no user ID')
            return
        }
        
        const { data: profileData, error } = await supabaseClient
            .from('profiles')
            .select('balance')
            .eq('id', userId)
            .single()
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error loading wallet:', error)
            return
        }
        
        userWallet = profileData?.balance || 0
        console.log('Wallet balance:', userWallet)
        
        // Render wallet immediately after loading data
        renderWallet()
        
    } catch (error) {
        console.error('Error loading wallet:', error)
        // Don't show alert for network errors, just log them
        if (error.message && !error.message.includes('Failed to fetch')) {
            showModalOrAlert('Error Loading Wallet', error.message, 'error')
        }
    }
}

// Load withdrawals
async function loadWithdrawals() {
    try {
        console.log('Loading withdrawals...')
        
        // Check if supabaseClient is available
        if (!supabaseClient) {
            console.error('Supabase client not available')
            return
        }
        
        const userId = getCurrentUserId()
        if (!userId) {
            console.error('Cannot load withdrawals: no user ID')
            return
        }
        
        const { data: withdrawalsData, error } = await supabaseClient
            .from('withdrawals')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        
        if (error) {
            console.error('Error loading withdrawals:', error)
            return
        }
        
        withdrawals = withdrawalsData || []
        console.log('Loaded withdrawals:', withdrawals.length)
        
        // Render withdrawals immediately after loading data
        console.log('Calling renderWithdrawals...')
        await renderWithdrawals()
        console.log('renderWithdrawals completed')
        
        // Also re-render wallet to update total withdrawn
        renderWallet()
        
    } catch (error) {
        console.error('Error loading withdrawals:', error)
        // Don't show alert for network errors, just log them
        if (error.message && !error.message.includes('Failed to fetch')) {
            showModalOrAlert('Error Loading Withdrawals', error.message, 'error')
        }
    }
}

// Load notifications
async function loadNotifications() {
    try {
        console.log('Loading notifications...')
        
        const userId = getCurrentUserId()
        if (!userId) {
            console.error('Cannot load notifications: no user ID')
            return
        }
        
        const { data: notificationsData, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
        
        if (error) {
            console.error('Error loading notifications:', error)
            return
        }
        
        notifications = notificationsData || []
        console.log('Loaded notifications:', notifications.length)
        
    } catch (error) {
        console.error('Error loading notifications:', error)
        showModalOrAlert('Error Loading Notifications', error.message, 'error')
    }
}

// Render wallet info
function renderWallet() {
    console.log('Rendering wallet with balance:', userWallet)
    
    // Update all balance elements in the dashboard
    const balanceElements = [
        'wallet-preview-amount',
        'mobile-wallet-amount', 
        'wallet-balance',
        'wallet-balance-detailed',
        'current-balance'
    ]
    
    balanceElements.forEach(elementId => {
        const element = document.getElementById(elementId)
        if (element) {
            element.textContent = `₱${userWallet.toFixed(2)}`
            console.log(`Updated ${elementId} to ₱${userWallet.toFixed(2)}`)
        } else {
            console.log(`Element ${elementId} not found`)
        }
    })
    
    // Update wallet stats
    const totalEarnedElement = document.getElementById('total-earned');
    const totalWithdrawnElement = document.getElementById('total-withdrawn');
    
    if (totalEarnedElement) {
        totalEarnedElement.textContent = `₱${userWallet.toFixed(2)}`;
        console.log('Updated total-earned to', `₱${userWallet.toFixed(2)}`);
    }
    
    if (totalWithdrawnElement) {
        // Calculate total withdrawn from approved withdrawals
        const totalWithdrawn = calculateTotalWithdrawn();
        totalWithdrawnElement.textContent = `₱${totalWithdrawn.toFixed(2)}`;
        console.log('Updated total-withdrawn to', `₱${totalWithdrawn.toFixed(2)}`);
    }
    
    // Also update the wallet container if it exists (for backward compatibility)
    const walletContainer = document.getElementById('wallet')
    if (walletContainer) {
    walletContainer.innerHTML = `
        <div class="wallet-info">
            <span class="wallet-label">Wallet Balance:</span>
            <span class="wallet-amount">₱${userWallet.toFixed(2)}</span>
        </div>
    `
    }
}

// Render withdrawals
async function renderWithdrawals() {
    console.log('Rendering withdrawals:', withdrawals.length)
    console.log('Available notifications:', notifications.length)
    
    // Update transaction list in the new layout
    const transactionList = document.getElementById('transaction-list')
    if (transactionList) {
        // Create transaction history from notifications (task completions, rewards, etc.)
        let transactions = []
        
        if (notifications.length === 0) {
            transactionList.innerHTML = `
                <div class="no-transactions">
                    <div class="no-transactions-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <h4>No Transactions Yet</h4>
                    <p>Your transaction history will appear here once you complete tasks or make withdrawals.</p>
                </div>
            `
        } else {
            // Load actual transactions from the transactions table
            try {
                const userId = getCurrentUserId()
                if (userId) {
                    const { data: transactionsData, error: transactionsError } = await supabaseClient
                        .from('transactions')
                        .select('*')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false })
                    
                    if (transactionsError) {
                        console.error('Error loading transactions:', transactionsError)
                        transactions = []
                    } else {
                        console.log('Loaded transactions from database:', transactionsData)
                        
                        // Also load withdrawal data to get receipt URLs
                        const { data: withdrawalsData, error: withdrawalsError } = await supabaseClient
                            .from('withdrawals')
                            .select('id, receipt_url, status')
                            .eq('user_id', userId)
                        
                        if (withdrawalsError) {
                            console.error('Error loading withdrawals:', withdrawalsError)
                        }
                        
                        // Create a map of withdrawal IDs to receipt URLs
                        const withdrawalReceipts = {}
                        if (withdrawalsData) {
                            withdrawalsData.forEach(withdrawal => {
                                if (withdrawal.receipt_url) {
                                    withdrawalReceipts[withdrawal.id] = withdrawal.receipt_url
                                }
                            })
                        }
                        
                        transactions = (transactionsData || []).map(transaction => {
                            let type = 'credit'
                            let icon = 'reward'
                            
                            // Debug log to see actual transaction data
                            console.log('Processing transaction:', transaction)
                            
                            // Determine transaction type and icon based on transaction type
                            if (transaction.type === 'reward' || transaction.type === 'credit') {
                                type = 'credit'
                                icon = 'reward'
                            } else if (transaction.type === 'withdrawal') {
                                type = 'debit'
                                icon = 'withdrawal'
                            } else if (transaction.type === 'refund') {
                                type = 'credit'
                                icon = 'refund'
                            } else {
                                // Default to credit for unknown types that look like rewards
                                if (transaction.description && transaction.description.toLowerCase().includes('reward')) {
                                    type = 'credit'
                                    icon = 'reward'
                                } else if (transaction.description && transaction.description.toLowerCase().includes('withdrawal')) {
                                    type = 'debit'
                                    icon = 'withdrawal'
                                } else {
                                    // Default fallback
                                    type = 'credit'
                                    icon = 'reward'
                                }
                            }
                            
                            // Check if this transaction has a receipt URL from withdrawals
                            let receiptUrl = null
                            if (transaction.type === 'withdrawal' && transaction.withdrawal_id) {
                                receiptUrl = withdrawalReceipts[transaction.withdrawal_id]
                            }
                            
                            return {
                                id: transaction.id,
                                amount: parseFloat(transaction.amount) || 0,
                                type: type,
                                icon: icon,
                                description: transaction.description || 'Transaction',
                                date: transaction.created_at,
                                status: 'completed',
                                receipt_url: receiptUrl,
                                reference: transaction.reference
                            }
                        })
                    }
                } else {
                    transactions = []
                }
            } catch (error) {
                console.error('Error loading transactions:', error)
                transactions = []
            }
            
            if (transactions.length === 0) {
                // Fallback to notifications if no transactions found
                console.log('No transactions found, falling back to notifications')
                console.log('Available notifications:', notifications.length)
                const notificationTransactions = notifications
                    .filter(notification => 
                        notification.message?.includes('₱') || 
                        notification.title?.includes('approved') ||
                        notification.title?.includes('reward')
                    )
                    .map(notification => {
                        let amount = 0
                        let type = 'credit'
                        let icon = 'reward'
                        let description = notification.message || notification.title
                        
                        // Parse amount from notification message
                        const amountMatch = notification.message?.match(/₱(\d+\.?\d*)/)
                        if (amountMatch) {
                            amount = parseFloat(amountMatch[1])
                        }
                        
                        // Determine transaction type based on notification content
                        if (notification.message?.includes('earned') || notification.title?.includes('approved') || notification.message?.includes('reward')) {
                            type = 'credit'
                            icon = 'reward'
                        } else if (notification.message?.includes('withdrawal')) {
                            type = 'debit'
                            icon = 'withdrawal'
                        } else {
                            // Default to credit for rewards
                            type = 'credit'
                            icon = 'reward'
                        }
                        
                        return {
                            id: notification.id,
                            amount: amount,
                            type: type,
                            icon: icon,
                            description: description,
                            date: notification.created_at,
                            status: 'completed'
                        }
                    })
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                
                if (notificationTransactions.length === 0) {
                    transactionList.innerHTML = `
                        <div class="no-transactions">
                            <div class="no-transactions-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h4>No Transactions Yet</h4>
                            <p>Your transaction history will appear here once you complete tasks or make withdrawals.</p>
                        </div>
                    `
                } else {
                    transactions = notificationTransactions
                }
            }
            
            if (transactions.length > 0) {
                transactionList.innerHTML = `
                    <div class="transaction-history-section">
                        <h3 class="transaction-history-title">Transaction History</h3>
                        <div class="transaction-list">
                            ${transactions.map(transaction => `
                                <div class="transaction-item" data-transaction-id="${transaction.id}">
                                    <div class="transaction-icon ${transaction.icon}">
                                        ${getTransactionIcon(transaction.icon)}
                                    </div>
                                    <div class="transaction-details">
                                        <div class="transaction-description">${transaction.description}</div>
                                        <div class="transaction-reference">Reference: ${transaction.reference || String(transaction.id).slice(0, 8)}</div>
                                        <div class="transaction-time">${formatTransactionTime(transaction.date)}</div>
                                        ${transaction.receipt_url ? `
                                            <div class="transaction-receipt">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                    <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                </svg>
                                                <span>Receipt attached</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="transaction-actions">
                                        <div class="transaction-amount ${transaction.type}">
                                            <div class="amount-value ${transaction.type}">${transaction.type === 'credit' ? '+' : '-'}₱${Math.abs(transaction.amount).toFixed(2)}</div>
                                            <div class="amount-label">${transaction.type === 'credit' ? 'Earned' : 'Deducted'}</div>
                                        </div>
                                        <button class="view-details-btn" onclick="showTransactionDetails('${transaction.id}')">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/>
                                                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                                            </svg>
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `
            }
        }
        console.log(`Updated transaction-list with ${transactions.length} transactions`)
        
        // Force refresh icons after a short delay to ensure DOM is updated
        setTimeout(() => {
            forceRefreshTransactionIcons();
        }, 100);
        
        // Also force refresh after a longer delay to catch any late updates
        setTimeout(() => {
            forceRefreshTransactionIcons();
        }, 500);
    } else {
        console.log('Transaction list element not found')
    }
    
    // Also update the old withdrawals table if it exists (for backward compatibility)
    const withdrawalsTable = document.getElementById('withdrawals-table')
    if (withdrawalsTable) {
    if (withdrawals.length === 0) {
        withdrawalsTable.innerHTML = '<p class="no-withdrawals">No withdrawal history.</p>'
        return
    }
    
    withdrawalsTable.innerHTML = `
        <table class="withdrawals-table">
            <thead>
                <tr>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Account Info</th>
                    <th>Status</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${withdrawals.map(withdrawal => `
                    <tr>
                        <td>₱${withdrawal.amount}</td>
                        <td>${withdrawal.method.toUpperCase()}</td>
                        <td>${withdrawal.account_info}</td>
                        <td><span class="status-badge ${withdrawal.status}">${withdrawal.status}</span></td>
                        <td>${new Date(withdrawal.created_at).toLocaleDateString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `
    }
}

// Render notifications
async function renderNotifications() {
    const notificationCount = document.getElementById('notification-count')
    const notificationList = document.getElementById('notification-list')
    
    if (!notificationCount || !notificationList) return
    
    // Update notification count
    const unreadCount = notifications.filter(n => !n.is_read).length
    if (unreadCount > 0) {
        notificationCount.textContent = unreadCount
        notificationCount.style.display = 'inline'
    } else {
        notificationCount.style.display = 'none'
    }
    
    // Render notification list
    if (notifications.length === 0) {
        notificationList.innerHTML = '<p class="no-notifications">No notifications yet.</p>'
        return
    }
    
    console.log('Rendering notifications:', notifications.length)
    
    notificationList.innerHTML = notifications.map(notification => {
        const isUnread = !notification.is_read
        const timeAgo = getTimeAgo(notification.created_at)
        
        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" data-notification-id="${notification.id}">
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                ${isUnread ? '<div class="unread-indicator"></div>' : ''}
            </div>
        `
    }).join('')
}

// Get time ago string
function getTimeAgo(dateString) {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
}

// Get transaction icon based on type
function getTransactionIcon(iconType) {
    let iconSvg = '';
    switch (iconType) {
        case 'reward':
            iconSvg = '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
            break;
        case 'withdrawal':
            iconSvg = '<path d="M21 12V7H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 5v14a2 2 0 0 0 2 2h15v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 15l3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            break;
        case 'refund':
            iconSvg = '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 21v-5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            break;
        default:
            iconSvg = '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    
    return `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            ${iconSvg}
        </svg>
    `;
}

// Format transaction time
function formatTransactionTime(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    })
}

// Get receipt display info from transaction
function getReceiptDisplay(transaction) {
    // Check if transaction has direct receipt_url
    if (transaction.receipt_url) {
        return {
            url: transaction.receipt_url,
            hasReceipt: true
        };
    }
    
    // Check if this is a withdrawal transaction with receipt
    if (transaction.type === 'withdrawal' && transaction.status === 'approved') {
        // Check if withdrawal has receipt_url in the database
        // This will be populated when admin approves with receipt
        return null; // No receipt available
    }
    
    return null;
}

 // Submit withdrawal request with comprehensive validation
async function submitWithdrawal(amount, method, accountName, accountInfo) {
    try {
        console.log('Submitting withdrawal:', { amount, method, accountName, accountInfo })
        
        // Check if account is disabled
        if (window.isAccountDisabledCheck && window.isAccountDisabledCheck()) {
            console.log('Account is disabled, cannot submit withdrawal')
            window.showAccountDisabledMessage()
            return false
        }
        
        const userId = getCurrentUserId()
        if (!userId) {
            console.error('Cannot submit withdrawal: no user ID')
            if (window.openModal) {
                window.openModal({
                    title: 'Error',
                    content: 'You must be logged in to submit a withdrawal request.',
                    primaryButton: { text: 'OK', action: () => window.closeModal() }
                })
            } else {
                alert('You must be logged in to submit a withdrawal request.')
            }
            return false
        }
        
        // Validate amount
        const withdrawalAmount = parseFloat(amount)
        if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
            if (window.openModal) {
                window.openModal({
                    title: 'Invalid Amount',
                    content: 'Please enter a valid withdrawal amount greater than 0.',
                    primaryButton: { text: 'OK', action: () => window.closeModal() }
                })
            } else {
                alert('Please enter a valid withdrawal amount greater than 0.')
            }
            return false
        }
        
        // Check minimum withdrawal amount
        const minimumWithdrawal = 1
        if (withdrawalAmount < minimumWithdrawal) {
            if (window.openModal) {
                window.openModal({
                    title: 'Minimum Withdrawal',
                    content: `Minimum withdrawal amount is ₱${minimumWithdrawal}. Please enter a higher amount.`,
                    primaryButton: { text: 'OK', action: () => window.closeModal() }
                })
            } else {
                alert(`Minimum withdrawal amount is ₱${minimumWithdrawal}. Please enter a higher amount.`)
            }
            return false
        }
        
        // Check if user has sufficient balance
        if (withdrawalAmount > userWallet) {
            if (window.openModal) {
                window.openModal({
                    title: 'Insufficient Balance',
                    content: `You don't have enough balance. Current balance: ₱${userWallet.toFixed(2)}. Requested: ₱${withdrawalAmount.toFixed(2)}.`,
                    primaryButton: { text: 'OK', action: () => window.closeModal() }
                })
            } else {
                alert(`Insufficient balance! Current balance: ₱${userWallet.toFixed(2)}. Requested: ₱${withdrawalAmount.toFixed(2)}.`)
            }
            return false
        }
        
        // Check for spam protection (30 seconds cooldown)
        const lastWithdrawalKey = `lastWithdrawal_${userId}`
        const lastWithdrawal = localStorage.getItem(lastWithdrawalKey)
        const now = Date.now()
        const cooldownPeriod = 30 * 1000 // 30 seconds
        
        if (lastWithdrawal && (now - parseInt(lastWithdrawal)) < cooldownPeriod) {
            const remainingTime = Math.ceil((cooldownPeriod - (now - parseInt(lastWithdrawal))) / 1000)
            if (window.openModal) {
                window.openModal({
                    title: 'Withdrawal Cooldown',
                    content: `Please wait ${remainingTime} seconds before submitting another withdrawal request. This prevents spam and ensures system stability.`,
                    primaryButton: { text: 'OK', action: () => window.closeModal() }
                })
            } else {
                alert(`Please wait ${remainingTime} seconds before submitting another withdrawal request.`)
            }
            return false
        }
        
        // Validate method and account info
        if (!method || method.trim() === '') {
            if (window.openModal) {
                window.openModal({
                    title: 'Invalid Payment Method',
                    content: 'Please select a payment method for your withdrawal.',
                    primaryButton: { text: 'OK', action: () => window.closeModal() }
                })
            } else {
                alert('Please select a payment method for your withdrawal.')
            }
            return false
        }
        
        if (!accountInfo || accountInfo.trim() === '') {
            if (window.openModal) {
                window.openModal({
                    title: 'Invalid Account Information',
                    content: 'Please provide your account information for the withdrawal.',
                    primaryButton: { text: 'OK', action: () => window.closeModal() }
                })
            } else {
                alert('Please provide your account information for the withdrawal.')
            }
            return false
        }
        
        // Check if balance would go negative after withdrawal
        const newBalance = userWallet - withdrawalAmount
        if (newBalance < 0) {
            if (window.openModal) {
                window.openModal({
                    title: 'Invalid Transaction',
                    content: 'This withdrawal would result in a negative balance, which is not allowed.',
                    primaryButton: { text: 'OK', action: () => window.closeModal() }
                })
            } else {
                alert('This withdrawal would result in a negative balance, which is not allowed.')
            }
            return false
        }
        
        // Set spam protection
        localStorage.setItem(lastWithdrawalKey, now.toString())
        
        // Generate unique withdrawal reference
        const withdrawalReference = generateWithdrawalReference()
        
        // Insert withdrawal request
        const { data: withdrawalData, error: withdrawalError } = await supabaseClient
            .from('withdrawals')
            .insert({
                user_id: userId,
                amount: withdrawalAmount,
                method: method.trim(),
                account_name: accountName.trim(),
                account_info: accountInfo.trim(),
                status: 'pending',
                reference: withdrawalReference,
                created_at: new Date().toISOString()
            })
            .select()
            .single()
        
        if (withdrawalError) {
            console.error('Error creating withdrawal:', withdrawalError)
            if (window.openModal) {
                window.openModal({
                    title: 'Error',
                    content: `Failed to create withdrawal request: ${withdrawalError.message}`,
                    primaryButton: { text: 'OK', action: () => window.closeModal() }
                })
            } else {
            alert('Error creating withdrawal: ' + withdrawalError.message)
            }
            return false
        }
        
        // Deduct from user wallet immediately (withdrawal is pending but balance is held)
        const { error: walletError } = await supabaseClient
            .from('user_wallets')
            .upsert({
                user_id: userId,
                balance: newBalance
            })
        
        if (walletError) {
            console.error('Error updating wallet:', walletError)
            if (window.openModal) {
                window.openModal({
                    title: 'Error',
                    content: `Failed to update wallet balance: ${walletError.message}`,
                    primaryButton: { text: 'OK', action: () => window.closeModal() }
                })
            } else {
            alert('Error updating wallet: ' + walletError.message)
            }
            return false
        }
        
        // Also update profiles table
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .update({
                balance: newBalance
            })
            .eq('id', userId)
        
        if (profileError) {
            console.error('Error updating profile balance:', profileError)
            // Don't return here, wallet update was successful
        }
        
        // Create transaction record for withdrawal
        const { error: transactionError } = await supabaseClient
            .from('transactions')
            .insert({
                user_id: userId,
                amount: -withdrawalAmount, // Negative amount for withdrawal
                type: 'withdrawal',
                description: `Withdrawal request: ₱${withdrawalAmount} via ${method} - ${accountInfo}`,
                withdrawal_id: withdrawalData.id,
                reference: withdrawalReference,
                created_at: new Date().toISOString()
            })
        
        if (transactionError) {
            console.error('Error creating transaction record:', transactionError)
            // Don't fail the withdrawal for transaction errors
        }
        
        // Update local wallet state
        userWallet = newBalance
        
        // Create notification for user
        await createNotification(
            userId,
            'Withdrawal Request Submitted',
            `Your withdrawal request of ₱${withdrawalAmount.toFixed(2)} has been submitted and is pending review.`,
            'info'
        )
        
        console.log('Withdrawal submitted successfully')
        
        // Success message will be handled by the calling function
        console.log('Withdrawal submitted successfully:', withdrawalData)
        
        // Reload wallet and withdrawals
        await loadWallet()
        await loadWithdrawals()
        // renderWallet() is already called in loadWithdrawals()
        // await renderWithdrawals() is already called in loadWithdrawals()
        
        return true
        
    } catch (error) {
        console.error('Error submitting withdrawal:', error)
        if (window.openModal) {
            window.openModal({
                title: 'Error',
                content: `An unexpected error occurred: ${error.message}`,
                primaryButton: { text: 'OK', action: () => window.closeModal() }
            })
        } else {
        alert('Error submitting withdrawal: ' + error.message)
        }
        return false
    }
}

// Mark notification as read
async function markNotificationRead(notificationId) {
    try {
        console.log('Marking notification as read:', notificationId)
        
        const { error } = await supabaseClient
            .from('notifications')
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId)
        
        if (error) {
            console.error('Error marking notification as read:', error)
            return
        }
        
        console.log('Notification marked as read successfully')
        
        // Update local data and re-render
        const notification = notifications.find(n => n.id === notificationId)
        if (notification) {
            notification.is_read = true
            notification.read_at = new Date().toISOString()
        }
        
        await renderNotifications()
        
    } catch (error) {
        console.error('Error marking notification as read:', error)
    }
}

// Handle withdrawal rejection (refund to user)
async function handleWithdrawalRejection(withdrawalId, reason) {
    try {
        console.log('Handling withdrawal rejection:', { withdrawalId, reason })
        
        const userId = getCurrentUserId()
        if (!userId) {
            console.error('Cannot handle withdrawal rejection: no user ID')
            return false
        }
        
        // Get withdrawal details
        const { data: withdrawal, error: withdrawalError } = await supabaseClient
            .from('withdrawals')
            .select('*')
            .eq('id', withdrawalId)
            .single()
        
        if (withdrawalError || !withdrawal) {
            console.error('Error fetching withdrawal:', withdrawalError)
            return false
        }
        
        // Refund the amount back to user wallet
        const refundAmount = withdrawal.amount
        
        // Get current wallet balance from database
        const { data: currentWallet, error: walletFetchError } = await supabaseClient
            .from('user_wallets')
            .select('balance')
            .eq('user_id', userId)
            .single()
        
        if (walletFetchError) {
            console.error('Error fetching current wallet balance:', walletFetchError)
            return false
        }
        
        // Update user_wallets table by adding the refund amount
        const { error: walletError } = await supabaseClient
            .from('user_wallets')
            .update({
                balance: currentWallet.balance + refundAmount
            })
            .eq('user_id', userId)
        
        if (walletError) {
            console.error('Error updating wallet after rejection:', walletError)
            return false
        }
        
        // Also update profiles table
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .update({
                balance: currentWallet.balance + refundAmount
            })
            .eq('id', userId)
        
        if (profileError) {
            console.error('Error updating profile balance after rejection:', profileError)
            // Don't return here, wallet update was successful
        }
        
        // Create transaction record for refund
        const { error: transactionError } = await supabaseClient
            .from('transactions')
            .insert({
                user_id: userId,
                amount: refundAmount,
                type: 'refund',
                description: `Withdrawal refund: ${withdrawal.method} - ${reason || 'Withdrawal rejected'}`,
                reference: withdrawal.reference,
                created_at: new Date().toISOString()
            })
        
        if (transactionError) {
            console.error('Error creating refund transaction record:', transactionError)
            // Don't fail the refund for transaction errors
        }
        
        // Update local wallet state
        userWallet = currentWallet.balance + refundAmount
        
        // Create notification for user
        await createNotification(
            userId,
            'Withdrawal Rejected',
            `Your withdrawal request of ₱${refundAmount.toFixed(2)} has been rejected. The amount has been refunded to your wallet. Reason: ${reason || 'No reason provided'}`,
            'warning'
        )
        
        console.log('Withdrawal rejection handled successfully')
        return true
        
    } catch (error) {
        console.error('Error handling withdrawal rejection:', error)
        return false
    }
}

// Check withdrawal cooldown status
function getWithdrawalCooldownStatus() {
    const userId = getCurrentUserId()
    if (!userId) return null
    
    const lastWithdrawalKey = `lastWithdrawal_${userId}`
    const lastWithdrawal = localStorage.getItem(lastWithdrawalKey)
    const now = Date.now()
    const cooldownPeriod = 30 * 1000 // 30 seconds
    
    if (!lastWithdrawal) return null
    
    const timeSinceLastWithdrawal = now - parseInt(lastWithdrawal)
    const remainingTime = cooldownPeriod - timeSinceLastWithdrawal
    
    if (remainingTime > 0) {
        return {
            isOnCooldown: true,
            remainingSeconds: Math.ceil(remainingTime / 1000),
            totalCooldownSeconds: cooldownPeriod / 1000
        }
    }
    
    return {
        isOnCooldown: false,
        remainingSeconds: 0,
        totalCooldownSeconds: cooldownPeriod / 1000
    }
}

// Mark all notifications as read
async function markAllNotificationsRead() {
    try {
        console.log('Marking all notifications as read')
        
        const unreadNotifications = notifications.filter(n => !n.is_read)
        if (unreadNotifications.length === 0) {
            console.log('No unread notifications to mark')
            return
        }
        
        const userId = getCurrentUserId()
        if (!userId) {
            console.error('Cannot mark notifications as read: no user ID')
            return
        }
        
        const { error } = await supabaseClient
            .from('notifications')
            .update({ 
                is_read: true, 
                read_at: new Date().toISOString() 
            })
            .eq('user_id', userId)
            .eq('is_read', false)
        
        if (error) {
            console.error('Error marking all notifications as read:', error)
            alert('Error marking notifications as read: ' + error.message)
            return
        }
        
        console.log('All notifications marked as read successfully')
        
        // Update local data
        notifications.forEach(notification => {
            if (!notification.is_read) {
                notification.is_read = true
                notification.read_at = new Date().toISOString()
            }
        })
        
        await renderNotifications()
        
    } catch (error) {
        console.error('Error marking all notifications as read:', error)
        alert('Error marking notifications as read: ' + error.message)
    }
}

// Create notification (called from admin actions)
async function createNotification(userId, title, message, type = 'info') {
    try {
        console.log('Creating notification:', { userId, title, message, type })
        
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
            return false
        }
        
        console.log('Notification created successfully')
        return true
        
    } catch (error) {
        console.error('Error creating notification:', error)
        return false
    }
}

// Get current user from auth module
function getCurrentUser() {
    return window.currentUser || null
}

// Get current user ID safely
function getCurrentUserId() {
    const user = getCurrentUser()
    if (!user) {
        console.error('No current user found in wallet module')
        return null
    }
    return user.id
}

// Generate withdrawal reference
function generateWithdrawalReference() {
    const now = new Date()
    const timestamp = now.getTime().toString(36) // Base36 timestamp
    const random = Math.random().toString(36).substring(2, 6) // 4 random chars
    return `WD-${timestamp}-${random}`.toUpperCase()
}

// Calculate total withdrawn amount from approved withdrawals
function calculateTotalWithdrawn() {
    if (!withdrawals || withdrawals.length === 0) {
        return 0
    }
    
    // Sum up all approved withdrawals
    const totalWithdrawn = withdrawals
        .filter(withdrawal => withdrawal.status === 'approved')
        .reduce((sum, withdrawal) => sum + (parseFloat(withdrawal.amount) || 0), 0)
    
    console.log('Calculated total withdrawn:', totalWithdrawn, 'from', withdrawals.length, 'withdrawals')
    return totalWithdrawn
}

// View receipt in full size
function viewReceipt(receiptUrl) {
    if (window.openModal) {
        window.openModal({
            title: 'Receipt Proof',
            content: `
                <div style="text-align: center; padding: 1rem;">
                    <img src="${receiptUrl}" alt="Receipt Proof" style="
                        max-width: 100%;
                        max-height: 70vh;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    " onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <div style="display: none; color: #6b7280; font-size: 1rem; padding: 2rem;">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 1rem;">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <p>Unable to load receipt image</p>
                    </div>
                </div>
            `,
            primaryButton: { text: 'Close', action: () => window.closeModal() },
            closable: true
        })
    } else {
        window.open(receiptUrl, '_blank')
    }
}

// Download receipt
function downloadReceipt(receiptUrl) {
    try {
        const link = document.createElement('a')
        link.href = receiptUrl
        link.download = `receipt_${Date.now()}.png`
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    } catch (error) {
        console.error('Error downloading receipt:', error)
        // Fallback: open in new tab
        window.open(receiptUrl, '_blank')
    }
}

// Force refresh transaction icons
function forceRefreshTransactionIcons() {
    console.log('Force refreshing transaction icons...');
    const transactionIcons = document.querySelectorAll('.transaction-icon');
    transactionIcons.forEach(icon => {
        const iconType = icon.classList.contains('withdrawal') ? 'withdrawal' : 
                        icon.classList.contains('reward') ? 'reward' : 
                        icon.classList.contains('refund') ? 'refund' : 'default';
        console.log('Refreshing icon for type:', iconType);
        icon.innerHTML = getTransactionIcon(iconType);
    });
}

// Show transaction details modal
async function showTransactionDetails(transactionId) {
    try {
        console.log('Loading transaction details for:', transactionId)
        
        // Get transaction details
        const { data: transaction, error } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .single()
        
        if (error) {
            console.error('Error loading transaction details:', error)
            if (window.openModal) {
                window.openModal({
                    title: 'Error',
                    content: `
                        <div style="text-align: center; padding: 1rem;">
                            <div style="color: #dc2626; font-size: 3rem; margin-bottom: 1rem;">❌</div>
                            <h3 style="margin: 0 0 1rem 0; color: #1f2937;">Error Loading Transaction</h3>
                            <p style="margin: 0; color: #6b7280;">Unable to load transaction details. Please try again.</p>
                        </div>
                    `,
                    primaryButton: { text: 'OK', action: () => window.closeModal() }
                })
            } else {
                alert('Error loading transaction details: ' + error.message)
            }
            return
        }
        
        // If this is a withdrawal transaction, get withdrawal details
        let withdrawalData = null
        console.log('Transaction type:', transaction.type)
        console.log('Transaction withdrawal_id:', transaction.withdrawal_id)
        
        if (transaction.type === 'withdrawal') {
            // Try to find withdrawal by transaction ID or description
            let withdrawalQuery = supabaseClient
                .from('withdrawals')
                .select('*')
            
            if (transaction.withdrawal_id) {
                withdrawalQuery = withdrawalQuery.eq('id', transaction.withdrawal_id)
            } else {
                // If no withdrawal_id, try to find by user and amount
                const userId = getCurrentUserId()
                if (userId) {
                    // Try to extract method and account from description
                    const description = transaction.description || ''
                    const methodMatch = description.match(/Withdrawal request: (\w+)/)
                    const accountMatch = description.match(/- (.+)$/)
                    
                    if (methodMatch && accountMatch) {
                        const method = methodMatch[1].toLowerCase()
                        const accountInfo = accountMatch[1]
                        
                        withdrawalQuery = withdrawalQuery
                            .eq('user_id', userId)
                            .eq('amount', Math.abs(transaction.amount))
                            .eq('method', method)
                            .eq('account_info', accountInfo)
                            .order('created_at', { ascending: false })
                            .limit(1)
                    } else {
                        // Fallback to just user and amount
                        withdrawalQuery = withdrawalQuery
                            .eq('user_id', userId)
                            .eq('amount', Math.abs(transaction.amount))
                            .order('created_at', { ascending: false })
                            .limit(1)
                    }
                }
            }
            
            console.log('Executing withdrawal query...');
            console.log('Query details:', {
                hasWithdrawalId: !!transaction.withdrawal_id,
                withdrawalId: transaction.withdrawal_id,
                userId: getCurrentUserId(),
                amount: transaction.amount
            });
            const { data: withdrawal, error: withdrawalError } = await withdrawalQuery.single()
            
            if (withdrawalError) {
                console.error('Error loading withdrawal details:', withdrawalError)
                console.log('Withdrawal query failed, trying alternative approach...');
                
                // Try to get all withdrawals for this user and find the matching one
                const userId = getCurrentUserId()
                if (userId) {
                    const { data: allWithdrawals, error: allWithdrawalsError } = await supabaseClient
                        .from('withdrawals')
                        .select('*')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false })
                    
                    if (!allWithdrawalsError && allWithdrawals) {
                        console.log('All withdrawals for user:', allWithdrawals);
                        // Find withdrawal that matches the transaction amount
                        const matchingWithdrawal = allWithdrawals.find(w => 
                            Math.abs(w.amount - Math.abs(transaction.amount)) < 0.01
                        );
                        if (matchingWithdrawal) {
                            withdrawalData = matchingWithdrawal;
                            console.log('Found matching withdrawal:', withdrawalData);
                        }
                    }
                }
            } else {
                withdrawalData = withdrawal
                console.log('Loaded withdrawal data:', withdrawalData)
            }
        }
        
        if (!transaction) {
            console.error('Transaction not found:', transactionId)
            if (window.openModal) {
                window.openModal({
                    title: 'Transaction Not Found',
                    content: `
                        <div style="text-align: center; padding: 1rem;">
                            <div style="color: #f59e0b; font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                            <h3 style="margin: 0 0 1rem 0; color: #1f2937;">Transaction Not Found</h3>
                            <p style="margin: 0; color: #6b7280;">The requested transaction could not be found.</p>
                        </div>
                    `,
                    primaryButton: { text: 'OK', action: () => window.closeModal() }
                })
            } else {
                alert('Transaction not found')
            }
            return
        }
        
        // Format transaction details
        let transactionType, amountDisplay
        if (transaction.type === 'reward' || transaction.type === 'credit') {
            transactionType = 'Earned'
            amountDisplay = '+'
        } else if (transaction.type === 'refund') {
            transactionType = 'Refund'
            amountDisplay = '+'
        } else if (transaction.type === 'withdrawal') {
            transactionType = 'Withdrawal'
            amountDisplay = '-'
        } else {
            transactionType = 'Deducted'
            amountDisplay = '-'
        }
        const formattedDate = new Date(transaction.created_at).toLocaleString()
        
        // Get withdrawal status and details
        let withdrawalStatus = 'N/A'
        let withdrawalMethod = 'N/A'
        let accountName = 'N/A'
        let accountNumber = 'N/A'
        let receiptUrl = null
        let processedDate = 'N/A'
        
        console.log('Withdrawal data available:', !!withdrawalData)
        if (withdrawalData) {
            console.log('Withdrawal data:', withdrawalData)
            console.log('Receipt URL from withdrawal data:', withdrawalData.receipt_url)
            withdrawalStatus = withdrawalData.status || 'Unknown'
            withdrawalMethod = withdrawalData.method || 'Unknown'
            accountName = withdrawalData.account_name || 'N/A'
            accountNumber = withdrawalData.account_info || 'N/A'
            receiptUrl = withdrawalData.receipt_url
            console.log('Extracted receipt URL:', receiptUrl)
            
            // Fallback: Check if receipt URL is stored in admin_notes
            if (!receiptUrl && withdrawalData.admin_notes) {
                console.log('Checking admin_notes for receipt URL:', withdrawalData.admin_notes);
                // Look for URL pattern in admin_notes
                const urlMatch = withdrawalData.admin_notes.match(/(https?:\/\/[^\s]+)/);
                if (urlMatch) {
                    receiptUrl = urlMatch[1];
                    console.log('Found receipt URL in admin_notes:', receiptUrl);
                }
            }
            if (withdrawalData.processed_at) {
                processedDate = new Date(withdrawalData.processed_at).toLocaleString()
            }
            
            // Debug: Check if receipt_url column exists by trying to access it
            console.log('Withdrawal data keys:', Object.keys(withdrawalData));
            console.log('Has receipt_url property:', 'receipt_url' in withdrawalData);
        }
        
        // Show transaction details modal
        if (window.openModal) {
            window.openModal({
                title: 'Transaction Details',
                content: `
                    <div class="transaction-details-modal" style="
                        max-width: 500px;
                        margin: 0 auto;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    ">
                        <!-- Transaction Summary Card -->
                        <div class="transaction-summary-card" style="
                            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                            border: 1px solid #e2e8f0;
                            border-radius: 16px;
                            padding: 1.5rem;
                            margin-bottom: 1.5rem;
                            text-align: center;
                        ">
                            <div class="transaction-icon-container" style="
                                display: flex;
                                justify-content: center;
                                margin-bottom: 1rem;
                            ">
                                <div class="transaction-icon-large" style="
                                    width: 64px;
                                    height: 64px;
                                    border-radius: 50%;
                                    background: ${transaction.type === 'reward' || transaction.type === 'credit' || transaction.type === 'refund' ? 
                                        'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                                        'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                                ">
                                    ${getTransactionIcon(transaction.type === 'reward' || transaction.type === 'credit' ? 'reward' : 
                                        transaction.type === 'refund' ? 'refund' : 'withdrawal')}
                                </div>
                            </div>
                            <h3 style="
                                margin: 0 0 0.5rem 0; 
                                color: #1f2937; 
                                font-size: 1.125rem;
                                font-weight: 600;
                            ">${transaction.description}</h3>
                            <div class="transaction-amount" style="
                                font-size: 1.5rem;
                                font-weight: 700;
                                color: ${transaction.type === 'reward' || transaction.type === 'credit' || transaction.type === 'refund' ? '#10b981' : '#ef4444'};
                                margin-bottom: 1rem;
                            ">${amountDisplay}₱${Math.abs(transaction.amount).toFixed(2)}</div>
                            ${withdrawalData ? `
                                <div class="status-badge" style="
                                    display: inline-block;
                                    padding: 0.5rem 1rem;
                                    border-radius: 9999px;
                                    font-size: 0.875rem;
                                    font-weight: 600;
                                    text-transform: uppercase;
                                    letter-spacing: 0.05em;
                                    ${withdrawalStatus === 'approved' ? 'background: #dcfce7; color: #166534;' : 
                                      withdrawalStatus === 'pending' ? 'background: #fef3c7; color: #92400e;' : 
                                      withdrawalStatus === 'rejected' ? 'background: #fee2e2; color: #991b1b;' : 
                                      'background: #f3f4f6; color: #374151;'}
                                ">
                                    ${withdrawalStatus}
                                </div>
                            ` : ''}
                        </div>

                        <!-- Transaction Info Card -->
                        <div class="transaction-info-card" style="
                            background: white;
                            border: 1px solid #e2e8f0;
                            border-radius: 12px;
                            padding: 1.5rem;
                            margin-bottom: 1.5rem;
                        ">
                            <h4 style="
                                margin: 0 0 1rem 0;
                                color: #374151;
                                font-size: 1rem;
                                font-weight: 600;
                                display: flex;
                                align-items: center;
                                gap: 0.5rem;
                            ">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                Transaction Information
                            </h4>
                            <div class="info-grid" style="
                                display: grid;
                                grid-template-columns: 1fr 1fr;
                                gap: 1rem;
                            ">
                                <div class="info-item">
                                    <span class="info-label" style="
                                        display: block;
                                        font-size: 0.75rem;
                                        color: #6b7280;
                                        font-weight: 500;
                                        text-transform: uppercase;
                                        letter-spacing: 0.05em;
                                        margin-bottom: 0.25rem;
                                    ">Reference</span>
                                    <span class="info-value" style="
                                        display: block;
                                        font-size: 0.875rem;
                                        color: #1f2937;
                                        font-weight: 600;
                                        font-family: 'Monaco', 'Menlo', monospace;
                                        word-break: break-all;
                                    ">${transaction.reference || String(transaction.id).slice(0, 8)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label" style="
                                        display: block;
                                        font-size: 0.75rem;
                                        color: #6b7280;
                                        font-weight: 500;
                                        text-transform: uppercase;
                                        letter-spacing: 0.05em;
                                        margin-bottom: 0.25rem;
                                    ">Type</span>
                                    <span class="info-value" style="
                                        display: block;
                                        font-size: 0.875rem;
                                        color: #1f2937;
                                        font-weight: 600;
                                    ">${transactionType}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label" style="
                                        display: block;
                                        font-size: 0.75rem;
                                        color: #6b7280;
                                        font-weight: 500;
                                        text-transform: uppercase;
                                        letter-spacing: 0.05em;
                                        margin-bottom: 0.25rem;
                                    ">Amount</span>
                                    <span class="info-value" style="
                                        display: block;
                                        font-size: 0.875rem;
                                        color: #1f2937;
                                        font-weight: 600;
                                    ">₱${Math.abs(transaction.amount).toFixed(2)}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label" style="
                                        display: block;
                                        font-size: 0.75rem;
                                        color: #6b7280;
                                        font-weight: 500;
                                        text-transform: uppercase;
                                        letter-spacing: 0.05em;
                                        margin-bottom: 0.25rem;
                                    ">Date & Time</span>
                                    <span class="info-value" style="
                                        display: block;
                                        font-size: 0.875rem;
                                        color: #1f2937;
                                        font-weight: 600;
                                    ">${formattedDate}</span>
                                </div>
                            </div>
                        </div>

                        ${withdrawalData ? `
                            <!-- Withdrawal Details Card -->
                            <div class="withdrawal-details-card" style="
                                background: white;
                                border: 1px solid #e2e8f0;
                                border-radius: 12px;
                                padding: 1.5rem;
                                margin-bottom: 1.5rem;
                            ">
                                <h4 style="
                                    margin: 0 0 1rem 0;
                                    color: #374151;
                                    font-size: 1rem;
                                    font-weight: 600;
                                    display: flex;
                                    align-items: center;
                                    gap: 0.5rem;
                                ">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    Withdrawal Details
                                </h4>
                                <div class="withdrawal-grid" style="
                                    display: grid;
                                    grid-template-columns: 1fr 1fr;
                                    gap: 1rem;
                                ">
                                    <div class="withdrawal-item">
                                        <span class="withdrawal-label" style="
                                            display: block;
                                            font-size: 0.75rem;
                                            color: #6b7280;
                                            font-weight: 500;
                                            text-transform: uppercase;
                                            letter-spacing: 0.05em;
                                            margin-bottom: 0.25rem;
                                        ">Payment Method</span>
                                        <span class="withdrawal-value" style="
                                            display: block;
                                            font-size: 0.875rem;
                                            color: #1f2937;
                                            font-weight: 600;
                                        ">${withdrawalMethod.toUpperCase()}</span>
                                    </div>
                                    <div class="withdrawal-item">
                                        <span class="withdrawal-label" style="
                                            display: block;
                                            font-size: 0.75rem;
                                            color: #6b7280;
                                            font-weight: 500;
                                            text-transform: uppercase;
                                            letter-spacing: 0.05em;
                                            margin-bottom: 0.25rem;
                                        ">Account Name</span>
                                        <span class="withdrawal-value" style="
                                            display: block;
                                            font-size: 0.875rem;
                                            color: #1f2937;
                                            font-weight: 600;
                                        ">${accountName}</span>
                                    </div>
                                    <div class="withdrawal-item" style="grid-column: 1 / -1;">
                                        <span class="withdrawal-label" style="
                                            display: block;
                                            font-size: 0.75rem;
                                            color: #6b7280;
                                            font-weight: 500;
                                            text-transform: uppercase;
                                            letter-spacing: 0.05em;
                                            margin-bottom: 0.25rem;
                                        ">Account Number</span>
                                        <span class="withdrawal-value" style="
                                            display: block;
                                            font-size: 0.875rem;
                                            color: #1f2937;
                                            font-weight: 600;
                                            font-family: 'Monaco', 'Menlo', monospace;
                                        ">${accountNumber}</span>
                                    </div>
                                    ${withdrawalStatus === 'approved' && processedDate !== 'N/A' ? `
                                        <div class="withdrawal-item" style="grid-column: 1 / -1;">
                                            <span class="withdrawal-label" style="
                                                display: block;
                                                font-size: 0.75rem;
                                                color: #6b7280;
                                                font-weight: 500;
                                                text-transform: uppercase;
                                                letter-spacing: 0.05em;
                                                margin-bottom: 0.25rem;
                                            ">Processed At</span>
                                            <span class="withdrawal-value" style="
                                                display: block;
                                                font-size: 0.875rem;
                                                color: #1f2937;
                                                font-weight: 600;
                                            ">${processedDate}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        ` : ''}

                        ${receiptUrl ? `
                            <!-- Receipt Card -->
                            <div class="receipt-card" style="
                                background: white;
                                border: 1px solid #e2e8f0;
                                border-radius: 12px;
                                padding: 1.5rem;
                                margin-bottom: 1.5rem;
                            ">
                                <h4 style="
                                    margin: 0 0 1rem 0;
                                    color: #374151;
                                    font-size: 1rem;
                                    font-weight: 600;
                                    display: flex;
                                    align-items: center;
                                    gap: 0.5rem;
                                ">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                    Receipt Proof
                                </h4>
                                <div class="receipt-preview" style="
                                    margin-bottom: 1rem;
                                    text-align: center;
                                ">
                                    <img src="${receiptUrl}" alt="Receipt Preview" style="
                                        max-width: 100%;
                                        max-height: 200px;
                                        border-radius: 8px;
                                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                                        border: 1px solid #e2e8f0;
                                    " onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                    <div style="display: none; color: #6b7280; font-size: 0.875rem; padding: 2rem;">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 0.5rem;">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                        <p>Receipt uploaded by admin</p>
                                    </div>
                                </div>
                                <div class="receipt-actions" style="
                                    display: flex;
                                    gap: 0.75rem;
                                ">
                                    <button onclick="viewReceipt('${receiptUrl}')" style="
                                        flex: 1;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        gap: 0.5rem;
                                        padding: 0.75rem 1rem;
                                        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                                        color: white;
                                        border: none;
                                        border-radius: 8px;
                                        font-size: 0.875rem;
                                        font-weight: 600;
                                        cursor: pointer;
                                        transition: all 0.2s ease;
                                    ">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/>
                                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                        View Full Size
                                    </button>
                                    <button onclick="downloadReceipt('${receiptUrl}')" style="
                                        flex: 1;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        gap: 0.5rem;
                                        padding: 0.75rem 1rem;
                                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                                        color: white;
                                        border: none;
                                        border-radius: 8px;
                                        font-size: 0.875rem;
                                        font-weight: 600;
                                        cursor: pointer;
                                        transition: all 0.2s ease;
                                    ">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                        Download
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `,
                primaryButton: { text: 'Close', action: () => window.closeModal() },
                closable: true
            })
        } else {
            alert(`Transaction Details:\n\nID: ${transaction.id}\nDescription: ${transaction.description}\nAmount: ${amountDisplay}₱${Math.abs(transaction.amount).toFixed(2)}\nDate: ${formattedDate}`)
        }
        
    } catch (error) {
        console.error('Error showing transaction details:', error)
        if (window.openModal) {
            window.openModal({
                title: 'Error',
                content: `
                    <div style="text-align: center; padding: 1rem;">
                        <div style="color: #dc2626; font-size: 3rem; margin-bottom: 1rem;">❌</div>
                        <h3 style="margin: 0 0 1rem 0; color: #1f2937;">Error Loading Details</h3>
                        <p style="margin: 0; color: #6b7280;">An unexpected error occurred while loading transaction details.</p>
                    </div>
                `,
                primaryButton: { text: 'OK', action: () => window.closeModal() }
            })
        } else {
            alert('Error loading transaction details: ' + error.message)
        }
    }
}


// Export functions for global access
window.loadWallet = loadWallet
window.loadWithdrawals = loadWithdrawals
window.loadNotifications = loadNotifications
window.renderWallet = renderWallet
window.renderWithdrawals = renderWithdrawals
window.renderNotifications = renderNotifications
window.submitWithdrawal = submitWithdrawal
window.handleWithdrawalRejection = handleWithdrawalRejection
window.getWithdrawalCooldownStatus = getWithdrawalCooldownStatus
window.markNotificationRead = markNotificationRead
window.forceRefreshTransactionIcons = forceRefreshTransactionIcons
window.markAllNotificationsRead = markAllNotificationsRead
// Show disabled account message for wallet
function showDisabledWalletMessage() {
    const walletSection = document.getElementById('wallet-section')
    if (walletSection) {
        walletSection.innerHTML = `
            <div class="disabled-account-message">
                <div class="disabled-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <h3>Account Disabled</h3>
                <p>Your account has been disabled by an administrator. You cannot access wallet features or make withdrawals at this time.</p>
                <p>Please contact support if you believe this is an error.</p>
            </div>
        `
    }
}

window.createNotification = createNotification
window.showTransactionDetails = showTransactionDetails
window.viewReceipt = viewReceipt
window.downloadReceipt = downloadReceipt
window.showDisabledWalletMessage = showDisabledWalletMessage
