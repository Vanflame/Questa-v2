// Admin Withdrawals Module
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Global variables
let allWithdrawals = []
let currentWithdrawalFilter = 'pending'

// Load withdrawals data
async function loadWithdrawals() {
    try {
        console.log('Loading withdrawals...')
        
        // First, get withdrawals
        const { data: withdrawalsData, error: withdrawalsError } = await supabaseClient
            .from('withdrawals')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (withdrawalsError) {
            console.error('Error loading withdrawals:', withdrawalsError)
            allWithdrawals = []
            return
        }
        
        // Then, get user data for each withdrawal
        const withdrawalsWithUsers = await Promise.all(
            (withdrawalsData || []).map(async (withdrawal) => {
                const { data: userData } = await supabaseClient
                    .from('profiles')
                    .select('email')
                    .eq('id', withdrawal.user_id)
                    .single()
                
                return {
                    ...withdrawal,
                    user_profiles: {
                        user_id: withdrawal.user_id,
                        email: userData?.email || 'Unknown',
                        username: userData?.email || 'Unknown'
                    }
                }
            })
        )
        
        allWithdrawals = withdrawalsWithUsers
        
        console.log('Withdrawals loaded:', allWithdrawals.length)
        
    } catch (error) {
        console.error('Error loading withdrawals:', error)
        allWithdrawals = []
    }
}

// Render withdrawals based on current filter
function renderWithdrawals() {
    const withdrawalsList = document.getElementById('withdrawals-list')
    if (!withdrawalsList) return
    
    // Filter withdrawals based on current filter
    let filteredWithdrawals = allWithdrawals
    if (currentWithdrawalFilter !== 'all') {
        filteredWithdrawals = allWithdrawals.filter(w => w.status === currentWithdrawalFilter)
    }
    
    if (filteredWithdrawals.length === 0) {
        withdrawalsList.innerHTML = '<p class="no-withdrawals">No withdrawals found for the selected filter.</p>'
        return
    }
    
    console.log('Rendering withdrawals:', filteredWithdrawals.length)
    
    withdrawalsList.innerHTML = `
        <table class="withdrawals-table">
            <thead>
                <tr>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Account Info</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${filteredWithdrawals.map(withdrawal => {
                    const user = withdrawal.user_profiles
                    const userName = user?.username || user?.email || 'Unknown User'
                    
                    return `
                        <tr>
                            <td>${userName}</td>
                            <td>₱${withdrawal.amount.toFixed(2)}</td>
                            <td>${withdrawal.method.toUpperCase()}</td>
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
    `
}

// Get withdrawal action buttons based on status
function getWithdrawalActions(withdrawal) {
    if (withdrawal.status === 'pending') {
        return `
            <button class="btn btn-success" data-action="approve-withdrawal" data-withdrawal-id="${withdrawal.id}">
                Approve
            </button>
            <button class="btn btn-danger" data-action="reject-withdrawal" data-withdrawal-id="${withdrawal.id}">
                Reject
            </button>
        `
    } else {
        return `<span class="no-actions">No actions available</span>`
    }
}

// Attach withdrawal event listeners
function attachWithdrawalEventListeners() {
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn')
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active', 'btn-primary'))
            filterButtons.forEach(btn => btn.classList.add('btn-secondary'))
            this.classList.remove('btn-secondary')
            this.classList.add('active', 'btn-primary')
            
            // Update filter and re-render
            currentWithdrawalFilter = this.getAttribute('data-filter')
            renderWithdrawals()
        })
    })
    
    // Withdrawal action buttons
    const actionButtons = document.querySelectorAll('[data-action]')
    actionButtons.forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault()
            
            const action = this.getAttribute('data-action')
            const withdrawalId = this.getAttribute('data-withdrawal-id')
            
            if (action === 'approve-withdrawal') {
                await approveWithdrawal(withdrawalId)
            } else if (action === 'reject-withdrawal') {
                await rejectWithdrawal(withdrawalId)
            }
        })
    })
}

// Approve withdrawal
async function approveWithdrawal(withdrawalId) {
    try {
        console.log('Approving withdrawal:', withdrawalId)
        
        // Get withdrawal details first
        const { data: withdrawalData, error: fetchError } = await supabaseClient
            .from('withdrawals')
            .select('*')
            .eq('id', withdrawalId)
            .single()
        
        if (fetchError) {
            console.error('Error fetching withdrawal:', fetchError)
            alert('Error fetching withdrawal: ' + fetchError.message)
            return
        }

        const { error } = await supabaseClient
            .from('withdrawals')
            .update({
                status: 'approved',
                processed_at: new Date().toISOString()
            })
            .eq('id', withdrawalId)
        
        if (error) {
            console.error('Error approving withdrawal:', error)
            alert('Error approving withdrawal: ' + error.message)
            return
        }
        
        console.log('Withdrawal approved successfully')
        alert('Withdrawal approved successfully!')
        
        // Create notification for user
        await window.createNotification(
            withdrawalData.user_id,
            'Withdrawal Approved',
            `Your withdrawal of ₱${withdrawalData.amount} via ${withdrawalData.method.toUpperCase()} has been approved and processed.`,
            'success'
        )
        
        // Reload data
        await loadWithdrawals()
        renderWithdrawals()
        
    } catch (error) {
        console.error('Error approving withdrawal:', error)
        alert('Error approving withdrawal: ' + error.message)
    }
}

// Reject withdrawal and return funds
async function rejectWithdrawal(withdrawalId) {
    try {
        console.log('Rejecting withdrawal:', withdrawalId)
        
        // Get withdrawal details first
        const { data: withdrawalData, error: fetchError } = await supabaseClient
            .from('withdrawals')
            .select('*')
            .eq('id', withdrawalId)
            .single()
        
        if (fetchError) {
            console.error('Error fetching withdrawal:', fetchError)
            alert('Error fetching withdrawal: ' + fetchError.message)
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
            alert('Error rejecting withdrawal: ' + updateError.message)
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
            alert('Error fetching wallet: ' + walletFetchError.message)
            return
        }
        
        // Return funds to user wallet
        const newBalance = (currentWallet?.balance || 0) + withdrawalData.amount
        const { error: walletError } = await supabaseClient
            .from('user_wallets')
            .upsert({
                user_id: withdrawalData.user_id,
                balance: newBalance
            })
        
        // Also update profiles table
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .update({
                balance: newBalance
            })
            .eq('id', withdrawalData.user_id)
        
        if (profileError) {
            console.error('Error updating profile balance:', profileError)
            // Don't return here, wallet update was successful
        }
        
        if (walletError) {
            console.error('Error returning funds:', walletError)
            alert('Error returning funds: ' + walletError.message)
            return
        }
        
        console.log('Withdrawal rejected and funds returned successfully')
        alert('Withdrawal rejected successfully! Funds have been returned to user wallet.')
        
        // Create notification for user
        await window.createNotification(
            withdrawalData.user_id,
            'Withdrawal Rejected',
            `Your withdrawal of ₱${withdrawalData.amount} via ${withdrawalData.method.toUpperCase()} was rejected. The amount has been returned to your wallet.`,
            'warning'
        )
        
        // Reload data
        await loadWithdrawals()
        renderWithdrawals()
        
    } catch (error) {
        console.error('Error rejecting withdrawal:', error)
        alert('Error rejecting withdrawal: ' + error.message)
    }
}

// Export functions for global access
window.loadAdminWithdrawals = loadWithdrawals
window.renderAdminWithdrawals = renderWithdrawals
window.attachWithdrawalEventListeners = attachWithdrawalEventListeners
window.approveWithdrawal = approveWithdrawal
window.rejectWithdrawal = rejectWithdrawal
