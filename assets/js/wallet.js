// Wallet Module
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
export async function loadWallet() {
    try {
        console.log('Loading wallet...')
        
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
        
    } catch (error) {
        console.error('Error loading wallet:', error)
        // Don't show alert for network errors, just log them
        if (error.message && !error.message.includes('Failed to fetch')) {
            alert('Error loading wallet: ' + error.message)
        }
    }
}

// Load withdrawals
export async function loadWithdrawals() {
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
        
    } catch (error) {
        console.error('Error loading withdrawals:', error)
        // Don't show alert for network errors, just log them
        if (error.message && !error.message.includes('Failed to fetch')) {
            alert('Error loading withdrawals: ' + error.message)
        }
    }
}

// Load notifications
export async function loadNotifications() {
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
        alert('Error loading notifications: ' + error.message)
    }
}

// Render wallet info
export function renderWallet() {
    const walletContainer = document.getElementById('wallet')
    if (!walletContainer) {
        console.error('Wallet container not found')
        return
    }
    
    walletContainer.innerHTML = `
        <div class="wallet-info">
            <span class="wallet-label">Wallet Balance:</span>
            <span class="wallet-amount">₱${userWallet.toFixed(2)}</span>
        </div>
    `
}

// Render withdrawals
export function renderWithdrawals() {
    const withdrawalsTable = document.getElementById('withdrawals-table')
    if (!withdrawalsTable) {
        console.error('Withdrawals table not found')
        return
    }
    
    if (withdrawals.length === 0) {
        withdrawalsTable.innerHTML = '<p class="no-withdrawals">No withdrawal history.</p>'
        return
    }
    
    console.log('Rendering withdrawals:', withdrawals.length)
    
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

// Render notifications
export async function renderNotifications() {
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

// Submit withdrawal request
export async function submitWithdrawal(amount, method, accountInfo) {
    try {
        console.log('Submitting withdrawal:', { amount, method, accountInfo })
        
        if (amount > userWallet) {
            alert('Insufficient balance!')
            return false
        }
        
        const userId = getCurrentUserId()
        if (!userId) {
            console.error('Cannot submit withdrawal: no user ID')
            return false
        }
        
        // Insert withdrawal request
        const { data: withdrawalData, error: withdrawalError } = await supabaseClient
            .from('withdrawals')
            .insert({
                user_id: userId,
                amount: amount,
                method: method,
                account_info: accountInfo,
                status: 'pending',
                created_at: new Date().toISOString()
            })
            .select()
            .single()
        
        if (withdrawalError) {
            console.error('Error creating withdrawal:', withdrawalError)
            alert('Error creating withdrawal: ' + withdrawalError.message)
            return false
        }
        
        // Deduct from user wallet
        const newBalance = userWallet - amount
        
        // Update user_wallets table
        const { error: walletError } = await supabaseClient
            .from('user_wallets')
            .upsert({
                user_id: userId,
                balance: newBalance
            })
        
        if (walletError) {
            console.error('Error updating wallet:', walletError)
            alert('Error updating wallet: ' + walletError.message)
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
        
        // Update local wallet state
        userWallet = newBalance
        
        console.log('Withdrawal submitted successfully')
        alert('Withdrawal request submitted successfully!')
        
        // Reload wallet and withdrawals
        await loadWallet()
        await loadWithdrawals()
        renderWallet()
        renderWithdrawals()
        
        return true
        
    } catch (error) {
        console.error('Error submitting withdrawal:', error)
        alert('Error submitting withdrawal: ' + error.message)
        return false
    }
}

// Mark notification as read
export async function markNotificationRead(notificationId) {
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

// Mark all notifications as read
export async function markAllNotificationsRead() {
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
export async function createNotification(userId, title, message, type = 'info') {
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

// Export functions for global access
window.loadWallet = loadWallet
window.loadWithdrawals = loadWithdrawals
window.loadNotifications = loadNotifications
window.renderWallet = renderWallet
window.renderWithdrawals = renderWithdrawals
window.renderNotifications = renderNotifications
window.submitWithdrawal = submitWithdrawal
window.markNotificationRead = markNotificationRead
window.markAllNotificationsRead = markAllNotificationsRead
window.createNotification = createNotification
