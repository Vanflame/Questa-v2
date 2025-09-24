// Admin Users Module
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Global variables
let allUsers = []
let dashboardStats = {}

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        // Total users count (exclude admin accounts)
        const { count: totalUsers, error: usersError } = await supabaseClient
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'user')
        
        // Active tasks count
        const { count: activeTasks, error: tasksError } = await supabaseClient
            .from('task_submissions')
            .select('*', { count: 'exact', head: true })
            .in('status', ['available', 'in_progress'])
        
        // Pending submissions count
        const { count: pendingCount, error: pendingError } = await supabaseClient
            .from('task_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_review')
        
        // Total rewards paid - use transactions table for accurate tracking
        let totalRewardsPaid = 0
        try {
            const { data: transactions, error: transactionsError } = await supabaseClient
                .from('transactions')
                .select('amount, type')
                .eq('type', 'reward')
            
            if (transactionsError) {
                console.error('Error loading transactions:', transactionsError)
                // Fallback to old method if transactions table fails
                const { data: approvedSubmissions } = await supabaseClient
                    .from('task_submissions')
                    .select('task_id')
                    .in('status', ['approved', 'completed'])
                
                if (approvedSubmissions && approvedSubmissions.length > 0) {
                    const taskIds = [...new Set(approvedSubmissions.map(s => s.task_id))]
                    if (taskIds.length > 0) {
                        const { data: tasksData } = await supabaseClient
                            .from('tasks')
                            .select('id, reward_amount')
                            .in('id', taskIds)
                        
                        if (tasksData) {
                            const taskCounts = {}
                            approvedSubmissions.forEach(sub => {
                                taskCounts[sub.task_id] = (taskCounts[sub.task_id] || 0) + 1
                            })
                            
                            totalRewardsPaid = tasksData.reduce((sum, task) => {
                                const count = taskCounts[task.id] || 0
                                return sum + (task.reward_amount * count)
                            }, 0)
                        }
                    }
                }
            } else {
                // Use transactions table for accurate calculation
                console.log('Transactions found:', transactions)
                totalRewardsPaid = transactions?.reduce((sum, transaction) => {
                    const amount = parseFloat(transaction.amount) || 0
                    console.log(`Transaction: type=${transaction.type}, amount=${amount}`)
                    return sum + amount
                }, 0) || 0
                console.log('Total rewards paid from transactions:', totalRewardsPaid)
            }
        } catch (error) {
            console.error('Error calculating total rewards paid:', error)
            totalRewardsPaid = 0
        }
        
        dashboardStats = {
            totalUsers: totalUsers || 0,
            activeTasks: activeTasks || 0,
            pendingSubmissions: pendingCount || 0,
            totalRewardsPaid: totalRewardsPaid
        }
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error)
        dashboardStats = {
            totalUsers: 0,
            activeTasks: 0,
            pendingSubmissions: 0,
            totalRewardsPaid: 0
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
        
    } catch (error) {
        console.error('Error loading users:', error)
        allUsers = []
    }
}

// Render dashboard stats
function renderDashboardStats() {
    const statsContainer = document.querySelector('.admin-stats')
    if (!statsContainer) return
    
    statsContainer.innerHTML = `
        <div class="stat-card">
            <h3>${dashboardStats.totalUsers}</h3>
            <p>Total Users</p>
        </div>
        <div class="stat-card">
            <h3>${dashboardStats.activeTasks}</h3>
            <p>Active Tasks</p>
        </div>
        <div class="stat-card">
            <h3>${dashboardStats.pendingSubmissions}</h3>
            <p>Pending Submissions</p>
        </div>
        <div class="stat-card">
            <h3>₱${dashboardStats.totalRewardsPaid.toFixed(2)}</h3>
            <p>Total Rewards Paid</p>
        </div>
    `
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
        <table class="users-table">
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
                                <button class="btn btn-sm btn-primary" data-action="view-user" data-user-id="${user.id}">
                                    View
                                </button>
                                <button class="btn btn-sm ${isActive ? 'btn-warning' : 'btn-success'}" 
                                        data-action="toggle-user" data-user-id="${user.id}">
                                    ${isActive ? 'Disable' : 'Enable'}
                                </button>
                                <button class="btn btn-sm btn-secondary" data-action="update-balance" data-user-id="${user.id}">
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
        alert(`User ${newStatus ? 'enabled' : 'disabled'} successfully!`)
        
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
