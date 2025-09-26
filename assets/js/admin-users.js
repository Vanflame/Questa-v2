// Admin Users Module
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Global variables
let allUsers = []
let dashboardStats = {
    totalUsers: 0,
    activeTasks: 0,
    pendingSubmissions: 0,
    totalRewardsPaid: 0,
    totalEarnings: 0,
    completedTasks: 0,
    activeTasksCount: 0,
    pendingWithdrawals: 0,
    totalWithdrawals: 0
}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        console.log('Loading comprehensive dashboard statistics...')
        
        // Execute all queries in parallel for better performance
        const [
            usersResult,
            tasksResult,
            submissionsResult,
            withdrawalsResult,
            transactionsResult
        ] = await Promise.all([
        // Total users count (exclude admin accounts)
            supabaseClient
            .from('profiles')
            .select('*', { count: 'exact', head: true })
                .eq('role', 'user'),
            
            // All tasks for comprehensive stats
            supabaseClient
                .from('tasks')
                .select('id, status, reward_amount, created_at'),
            
            // All submissions for comprehensive stats
            supabaseClient
                .from('task_submissions')
                .select('id, status, task_id, created_at'),
            
            // All withdrawals for comprehensive stats
            supabaseClient
                .from('withdrawals')
                .select('id, status, amount, created_at'),
            
            // All transactions for accurate financial tracking
            supabaseClient
                .from('transactions')
                .select('amount, type, created_at')
        ])
        
        // Process users data
        const totalUsers = usersResult.count || 0
        console.log('Total users:', totalUsers)
        
        // Process tasks data
        const allTasks = tasksResult.data || []
        const activeTasksCount = allTasks.filter(task => task.status === 'active').length
        const completedTasksCount = allTasks.filter(task => task.status === 'completed').length
        console.log('Tasks stats:', { total: allTasks.length, active: activeTasksCount, completed: completedTasksCount })
        
        // Process submissions data
        const allSubmissions = submissionsResult.data || []
        const pendingSubmissionsCount = allSubmissions.filter(sub => sub.status === 'pending_review').length
        const approvedSubmissionsCount = allSubmissions.filter(sub => sub.status === 'approved').length
        console.log('Submissions stats:', { total: allSubmissions.length, pending: pendingSubmissionsCount, approved: approvedSubmissionsCount })
        
        // Process withdrawals data
        const allWithdrawals = withdrawalsResult.data || []
        const pendingWithdrawalsCount = allWithdrawals.filter(w => w.status === 'pending').length
        const totalWithdrawalsAmount = allWithdrawals
            .filter(w => w.status === 'approved')
            .reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0)
        console.log('Withdrawals stats:', { total: allWithdrawals.length, pending: pendingWithdrawalsCount, totalAmount: totalWithdrawalsAmount })
        
        // Process transactions data
        const allTransactions = transactionsResult.data || []
        const rewardTransactions = allTransactions.filter(t => t.type === 'reward')
        const totalRewardsPaid = rewardTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
        
        // Calculate total earnings (sum of all task rewards)
        const totalEarnings = allTasks.reduce((sum, task) => sum + (parseFloat(task.reward_amount) || 0), 0)
        
        console.log('Financial stats:', { 
            totalRewardsPaid, 
            totalEarnings, 
            totalWithdrawals: totalWithdrawalsAmount 
        })
        
        // Update dashboard stats
        dashboardStats = {
            totalUsers,
            activeTasks: activeTasksCount,
            pendingSubmissions: pendingSubmissionsCount,
            totalRewardsPaid,
            totalEarnings,
            completedTasks: approvedSubmissionsCount, // Using approved submissions as completed tasks
            activeTasksCount,
            pendingWithdrawals: pendingWithdrawalsCount,
            totalWithdrawals: totalWithdrawalsAmount
        }
        
        console.log('Dashboard stats loaded:', dashboardStats)
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error)
        dashboardStats = {
            totalUsers: 0,
            activeTasks: 0,
            pendingSubmissions: 0,
            totalRewardsPaid: 0,
            totalEarnings: 0,
            completedTasks: 0,
            activeTasksCount: 0,
            pendingWithdrawals: 0,
            totalWithdrawals: 0
        }
    }
}

// Load all users
async function loadUsers() {
    try {
        console.log('Loading users...')
        
        // Get users from profiles table (exclude admin accounts)
        const { data: usersData, error: usersError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('role', 'user')
            .order('created_at', { ascending: false })
        
        if (usersError) {
            console.error('Error loading users:', usersError)
            allUsers = []
            return
        }
        
        // Get additional data for each user
        const usersWithDetails = await Promise.all(
            (usersData || []).map(async (user) => {
                const { data: walletData } = await supabaseClient
                    .from('user_wallets')
                    .select('balance')
                    .eq('user_id', user.id)
                    .single()
                
                const { data: submissionsData } = await supabaseClient
                    .from('task_submissions')
                    .select('id, status, created_at')
                    .eq('user_id', user.id)
                
                return {
                    ...user,
                    user_wallets: walletData ? [walletData] : [],
                    task_submissions: submissionsData || []
                }
            })
        )
        
        allUsers = usersWithDetails
        
        console.log('Users loaded:', allUsers.length)
        
        // Render dashboard stats for user-related stats
        renderDashboardStats()
        
    } catch (error) {
        console.error('Error loading users:', error)
        allUsers = []
    }
}

// Render dashboard stats
function renderDashboardStats() {
    console.log('Rendering dashboard stats:', dashboardStats)
    
    // Update all admin stats elements
    const statsElements = {
        // First row - existing stats
        'stats-total-users': dashboardStats.totalUsers || 0,
        'stats-total-tasks': dashboardStats.activeTasksCount || 0,
        'stats-pending-submissions': dashboardStats.pendingSubmissions || 0,
        'stats-pending-withdrawals': dashboardStats.pendingWithdrawals || 0,
        
        // Second row - new comprehensive analytics
        'stats-total-paid': `₱${(dashboardStats.totalRewardsPaid || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        'stats-total-earnings': `₱${(dashboardStats.totalEarnings || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        'stats-completed-tasks': dashboardStats.completedTasks || 0,
        'stats-active-tasks': dashboardStats.activeTasksCount || 0
    }
    
    // Update each stat element
    Object.entries(statsElements).forEach(([id, value]) => {
        const element = document.getElementById(id)
        if (element) {
            element.textContent = value
            console.log(`Updated ${id}: ${value}`)
        } else {
            console.warn(`Element not found: ${id}`)
        }
    })
    
    // Update navigation badges
    const submissionsBadge = document.getElementById('submissions-badge')
    if (submissionsBadge) {
        submissionsBadge.textContent = dashboardStats.pendingSubmissions || 0
    }
    
    console.log('Dashboard stats rendered successfully')
}

// Render users list
function renderUsers() {
    const usersContainer = document.getElementById('users-list')
    if (!usersContainer) return
    
    if (allUsers.length === 0) {
        usersContainer.innerHTML = '<p class="no-users">No users found.</p>'
        return
    }
    
    console.log('Rendering users:', allUsers.length)
    
    usersContainer.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Balance</th>
                    <th>Tasks Completed</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${allUsers.map(user => {
                    const completedTasks = user.task_submissions?.filter(sub => sub.status === 'approved').length || 0
                    const balance = user.user_wallets?.[0]?.balance || 0
                    const isActive = user.is_active !== false
                    // Use email prefix as username if no username is set
                    const displayUsername = user.username || user.email?.split('@')[0] || 'User'
                    
                    return `
                        <tr>
                            <td>${displayUsername}</td>
                            <td>${user.email || 'N/A'}</td>
                            <td>₱${balance.toFixed(2)}</td>
                            <td>${completedTasks}</td>
                            <td>${new Date(user.created_at).toLocaleDateString()}</td>
                            <td><span class="status-badge ${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span></td>
                            <td>
                                <button class="admin-btn admin-btn-secondary admin-btn-sm" data-action="view-user" data-user-id="${user.id}">
                                    View
                                </button>
                                <button class="admin-btn ${isActive ? 'admin-btn-warning' : 'admin-btn-success'} admin-btn-sm" 
                                        data-action="toggle-user" data-user-id="${user.id}">
                                    ${isActive ? 'Disable' : 'Enable'}
                                </button>
                                <button class="admin-btn admin-btn-info admin-btn-sm" data-action="update-balance" data-user-id="${user.id}">
                                    Update Balance
                                </button>
                            </td>
                        </tr>
                    `
                }).join('')}
            </tbody>
        </table>
    `
    
    // Attach event listeners to the buttons
    attachUserEventListeners()
}

// Attach event listeners for user management buttons
function attachUserEventListeners() {
    // View user button
    document.querySelectorAll('[data-action="view-user"]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault()
            const userId = e.target.getAttribute('data-user-id')
            viewUser(userId)
        })
    })
    
    // Toggle user status button
    document.querySelectorAll('[data-action="toggle-user"]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault()
            const userId = e.target.getAttribute('data-user-id')
            toggleUserStatus(userId)
        })
    })
    
    // Update balance button
    document.querySelectorAll('[data-action="update-balance"]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault()
            const userId = e.target.getAttribute('data-user-id')
            updateUserBalance(userId)
        })
    })
}

// View user details
function viewUser(userId) {
    const user = allUsers.find(u => u.id === userId)
    if (!user) {
        alert('User not found')
        return
    }
    
    const completedTasks = user.task_submissions?.filter(sub => sub.status === 'approved').length || 0
    const balance = user.user_wallets?.[0]?.balance || 0
    const displayUsername = user.username || user.email?.split('@')[0] || 'User'
    
    alert(`User Details:
Username: ${displayUsername}
Email: ${user.email}
Balance: ₱${balance.toFixed(2)}
Tasks Completed: ${completedTasks}
Status: ${user.is_active !== false ? 'Active' : 'Inactive'}
Joined: ${new Date(user.created_at).toLocaleDateString()}`)
}

// Toggle user status
async function toggleUserStatus(userId) {
    try {
        console.log('Toggling user status:', userId)
        
        const user = allUsers.find(u => u.id === userId)
        if (!user) {
            alert('User not found')
            return
        }
        
        const newStatus = user.is_active !== false ? false : true
        
        const { error } = await supabaseClient
            .from('profiles')
            .update({ is_active: newStatus })
            .eq('id', userId)
        
        if (error) {
            console.error('Error updating user status:', error)
            alert('Error updating user status: ' + error.message)
            return
        }
        
        console.log('User status updated successfully')
        
        // Show success message with modal
        if (window.openModal) {
            window.openModal({
                title: 'User Status Updated',
                content: `
                    <div class="modal-success-content">
                        <div class="modal-icon success">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <h3>User ${newStatus ? 'Enabled' : 'Disabled'}</h3>
                        <p>User account has been ${newStatus ? 'enabled' : 'disabled'} successfully.</p>
                        <div style="background: linear-gradient(135deg, rgba(5, 150, 105, 0.1), rgba(16, 185, 129, 0.05)); border: 1px solid rgba(5, 150, 105, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #059669; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon info-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">${newStatus ? 'User can now access all platform features.' : 'User cannot access tasks, wallet, or activity features.'}</span>
                            </p>
                        </div>
                    </div>
                `,
                primaryButton: { text: 'OK', action: () => window.closeModal() },
                closable: true
            })
        } else {
            alert(`User ${newStatus ? 'enabled' : 'disabled'} successfully!`)
        }
        
        // Reload users
        await loadUsers()
        renderUsers()
        
    } catch (error) {
        console.error('Error toggling user status:', error)
        alert('Error updating user status: ' + error.message)
    }
}

// Update user balance
async function updateUserBalance(userId) {
    try {
        const newBalance = prompt('Enter new balance amount:')
        if (!newBalance || isNaN(parseFloat(newBalance))) {
            alert('Invalid balance amount')
            return
        }
        
        const balance = parseFloat(newBalance)
        
        console.log('Updating user balance:', userId, balance)
        
        // Update user_wallets table
        const { error: walletError } = await supabaseClient
            .from('user_wallets')
            .upsert({
                user_id: userId,
                balance: balance
            })
        
        if (walletError) {
            console.error('Error updating user wallet:', walletError)
            alert('Error updating user wallet: ' + walletError.message)
            return
        }
        
        // Also update profiles table for consistency
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .update({
                balance: balance
            })
            .eq('id', userId)
        
        if (profileError) {
            console.error('Error updating profile balance:', profileError)
            alert('Warning: Wallet updated but profile balance update failed. Balance might not display correctly.')
            // Don't return here, wallet update was successful
        } else {
            console.log('Profile balance updated successfully to:', balance)
        }
        
        console.log('User balance updated successfully')
        alert('User balance updated successfully!')
        
        // Reload users
        await loadUsers()
        renderUsers()
        
    } catch (error) {
        console.error('Error updating user balance:', error)
        alert('Error updating user balance: ' + error.message)
    }
}

// View user details
async function viewUserDetails(userId) {
    try {
        const user = allUsers.find(u => u.id === userId)
        if (!user) {
            alert('User not found')
            return
        }
        
        const balance = user.user_wallets?.[0]?.balance || 0
        const completedTasks = user.task_submissions?.filter(sub => sub.status === 'approved').length || 0
        const pendingTasks = user.task_submissions?.filter(sub => sub.status === 'pending_review').length || 0
        
        const details = `
User Details:
- Username: ${user.username || 'N/A'}
- Email: ${user.email || 'N/A'}
- Balance: ₱${balance.toFixed(2)}
- Tasks Completed: ${completedTasks}
- Pending Tasks: ${pendingTasks}
- Joined: ${new Date(user.created_at).toLocaleDateString()}
- Status: ${user.is_active !== false ? 'Active' : 'Inactive'}
- Admin: ${user.is_admin ? 'Yes' : 'No'}
        `
        
        alert(details)
        
    } catch (error) {
        console.error('Error viewing user details:', error)
        alert('Error loading user details: ' + error.message)
    }
}

// Refresh analytics data periodically
function startAnalyticsRefresh() {
    // Refresh every 30 seconds
    setInterval(async () => {
        console.log('Refreshing analytics data...')
        await loadDashboardStats()
        renderDashboardStats()
    }, 30000)
}

// Export functions for global access
window.loadDashboardStats = loadDashboardStats
window.loadUsers = loadUsers
window.renderDashboardStats = renderDashboardStats
window.renderUsers = renderUsers
window.toggleUserStatus = toggleUserStatus
window.updateUserBalance = updateUserBalance
window.viewUserDetails = viewUserDetails
window.attachUserEventListeners = attachUserEventListeners
window.viewUser = viewUser
window.startAnalyticsRefresh = startAnalyticsRefresh
