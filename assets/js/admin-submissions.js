// Admin Submissions Module
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Global variables
let pendingSubmissions = []

// Load pending submissions
async function loadSubmissions() {
    try {
        console.log('Loading submissions...')
        
        // First, get submissions
        const { data: submissionsData, error: submissionsError } = await supabaseClient
            .from('task_submissions')
            .select('*')
            .eq('status', 'pending_review')
            .order('submitted_at', { ascending: false })
        
        if (submissionsError) {
            console.error('Error loading submissions:', submissionsError)
            pendingSubmissions = []
            return
        }
        
        // Then, get tasks for each submission
        const submissionsWithTasks = await Promise.all(
            (submissionsData || []).map(async (submission) => {
                const { data: taskData } = await supabaseClient
                    .from('tasks')
                    .select('id, title, description, reward_amount, category')
                    .eq('id', submission.task_id)
                    .single()
                
                const { data: userData } = await supabaseClient
                    .from('profiles')
                    .select('email')
                    .eq('id', submission.user_id)
                    .single()
                
                return {
                    ...submission,
                    tasks: taskData,
                    user_profiles: { 
                        user_id: submission.user_id, 
                        email: userData?.email || 'Unknown',
                        username: userData?.email || 'Unknown'
                    }
                }
            })
        )
        
        pendingSubmissions = submissionsWithTasks
        console.log('Submissions loaded:', pendingSubmissions.length)
        
    } catch (error) {
        console.error('Error loading submissions:', error)
        pendingSubmissions = []
    }
}

// Render pending submissions
function renderSubmissions() {
    const submissionsList = document.getElementById('submissions-list')
    if (!submissionsList) return
    
    if (pendingSubmissions.length === 0) {
        submissionsList.innerHTML = '<p class="no-submissions">No pending submissions at this time.</p>'
        return
    }
    
    submissionsList.innerHTML = pendingSubmissions.map(submission => {
        const taskData = submission.tasks
        const userData = submission.user_profiles
        
        return `
            <div class="submission-card">
                <div class="submission-header">
                    <h3>${taskData.title}</h3>
                    <span class="submission-reward">₱${taskData.reward_amount}</span>
                </div>
                
                <div class="submission-body">
                    <div class="submission-user">
                        <strong>User:</strong> ${userData.username || userData.email}
                    </div>
                    <div class="submission-task">
                        <strong>Task:</strong> ${taskData.description}
                    </div>
                    <div class="submission-proof">
                        <strong>Proof:</strong> 
                        <a href="${submission.proof_url}" target="_blank" class="proof-link">
                            View Proof
                        </a>
                    </div>
                    ${submission.email_used ? `
                        <div class="submission-email">
                            <strong>Email Used:</strong> ${submission.email_used}
                        </div>
                    ` : ''}
                    <div class="submission-meta">
                        <span class="submission-date">
                            Submitted: ${new Date(submission.submitted_at).toLocaleDateString()}
                        </span>
                        <span class="submission-category">${taskData.category}</span>
                    </div>
                </div>
                
                <div class="submission-actions">
                    <button class="btn btn-success" data-action="approve" data-submission-id="${submission.id}">
                        Approve
                    </button>
                    <button class="btn btn-danger" data-action="reject" data-submission-id="${submission.id}">
                        Reject
                    </button>
                </div>
            </div>
        `
    }).join('')
    
    // Attach event listeners
    attachSubmissionEventListeners()
}

// Attach event listeners to submission action buttons
function attachSubmissionEventListeners() {
    const actionButtons = document.querySelectorAll('[data-action]')
    
    actionButtons.forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault()
            
            const action = this.getAttribute('data-action')
            const submissionId = this.getAttribute('data-submission-id')
            
            if (action === 'approve') {
                await approveSubmission(submissionId)
            } else if (action === 'reject') {
                await rejectSubmission(submissionId)
            }
        })
    })
}

// Approve a submission
async function approveSubmission(submissionId) {
    try {
        console.log('Approving submission:', submissionId)
        
        // Get submission details
        const { data: submissionData, error: fetchError } = await supabaseClient
            .from('task_submissions')
            .select('*')
            .eq('id', submissionId)
            .single()
        
        if (fetchError) {
            console.error('Error fetching submission:', fetchError)
            alert('Error fetching submission: ' + fetchError.message)
            return
        }
        
        // Get task details separately
        const { data: taskData } = await supabaseClient
            .from('tasks')
            .select('title, reward_amount')
            .eq('id', submissionData.task_id)
            .single()
        
        // Get user details separately
        const { data: userData } = await supabaseClient
            .from('profiles')
            .select('email')
            .eq('id', submissionData.user_id)
            .single()
        
        // Combine the data
        const combinedData = {
            ...submissionData,
            tasks: taskData,
            user_profiles: {
                user_id: submissionData.user_id,
                email: userData?.email || 'Unknown',
                username: userData?.email || 'Unknown'
            }
        }
        
        // Update submission status
        const { error: updateError } = await supabaseClient
            .from('task_submissions')
            .update({ 
                status: 'approved',
                admin_reviewed_at: new Date().toISOString()
            })
            .eq('id', submissionId)
        
        if (updateError) {
            console.error('Error updating submission:', updateError)
            alert('Error approving submission: ' + updateError.message)
            return
        }
        
        // Allow multiple payments for the same task (users can earn rewards multiple times)
        
        // Get current wallet balance first
        const { data: currentWallet, error: walletFetchError } = await supabaseClient
            .from('user_wallets')
            .select('balance')
            .eq('user_id', combinedData.user_id)
            .single()
        
        if (walletFetchError) {
            console.error('Error fetching wallet:', walletFetchError)
            alert('Error fetching wallet: ' + walletFetchError.message)
            return
        }
        
        // Also get current profile balance for comparison
        const { data: currentProfile, error: profileFetchError } = await supabaseClient
            .from('profiles')
            .select('balance')
            .eq('id', combinedData.user_id)
            .single()
        
        if (profileFetchError) {
            console.error('Error fetching profile:', profileFetchError)
        }
        
        const currentBalance = currentWallet?.balance || 0
        const profileBalance = currentProfile?.balance || 0
        const rewardAmount = combinedData.tasks.reward_amount
        
        console.log('Current wallet balance:', currentBalance)
        console.log('Current profile balance:', profileBalance)
        console.log('Reward amount:', rewardAmount)
        
        // Use the higher of the two balances as the base (in case they're out of sync)
        const baseBalance = Math.max(currentBalance, profileBalance)
        const newBalance = baseBalance + rewardAmount
        
        console.log('Base balance (max of wallet/profile):', baseBalance)
        console.log('New balance will be:', newBalance)
        
        // Update user_wallets table
        const { error: walletError } = await supabaseClient
            .from('user_wallets')
            .upsert({
                user_id: combinedData.user_id,
                balance: newBalance
            })
        
        if (walletError) {
            console.error('Error updating wallet:', walletError)
            alert('Error updating wallet: ' + walletError.message)
            return
        }
        
        // Also update profiles table balance
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .update({
                balance: newBalance
            })
            .eq('id', combinedData.user_id)
        
        if (profileError) {
            console.error('Error updating profile balance:', profileError)
            alert('Warning: Wallet updated but profile balance update failed. Balance might not display correctly.')
            // Don't return here, wallet update was successful
        } else {
            console.log('Profile balance updated successfully to:', newBalance)
        }
        
        // Insert transaction record for tracking payments
        try {
            const transactionData = {
                user_id: combinedData.user_id,
                amount: combinedData.tasks.reward_amount,
                type: 'reward',
                description: `Task completion reward: ${combinedData.tasks.title}`
            }
            
            console.log('Inserting transaction:', transactionData)
            
            const { data: transactionResult, error: transactionError } = await supabaseClient
                .from('transactions')
                .insert(transactionData)
                .select()
            
            if (transactionError) {
                console.error('Error creating transaction:', transactionError)
                // Don't return here, the main approval was successful
            } else {
                console.log('Transaction recorded successfully:', transactionResult)
            }
        } catch (error) {
            console.error('Error creating transaction:', error)
            // Don't fail the approval for transaction errors
        }
        
        alert('Submission approved successfully! User wallet updated.')
        
        // Create notification for user
        await window.createNotification(
            combinedData.user_profiles.user_id,
            'Task Approved!',
            `Your submission for "${combinedData.tasks.title}" has been approved. You earned ₱${combinedData.tasks.reward_amount}!`,
            'success'
        )
        
        // Reload data with a small delay to ensure transaction is committed
        setTimeout(async () => {
            await loadSubmissions()
            await window.loadDashboardStats()
            renderSubmissions()
            window.renderDashboardStats()
        }, 500)
        
    } catch (error) {
        alert('Error approving submission: ' + error.message)
    }
}

// Reject a submission
async function rejectSubmission(submissionId) {
    try {
        console.log('Rejecting submission:', submissionId)
        
        const reason = prompt('Please provide a reason for rejection:')
        if (!reason) {
            alert('Rejection requires a reason.')
            return
        }

        // Get submission details
        const { data: submissionData, error: fetchError } = await supabaseClient
            .from('task_submissions')
            .select('*')
            .eq('id', submissionId)
            .single()
        
        if (fetchError) {
            console.error('Error fetching submission:', fetchError)
            alert('Error fetching submission: ' + fetchError.message)
            return
        }
        
        // Get task details separately
        const { data: taskData } = await supabaseClient
            .from('tasks')
            .select('title')
            .eq('id', submissionData.task_id)
            .single()
        
        // Combine the data
        const combinedData = {
            ...submissionData,
            tasks: taskData
        }
        
        const { error } = await supabaseClient
            .from('task_submissions')
            .update({ 
                status: 'rejected',
                admin_notes: reason,
                admin_reviewed_at: new Date().toISOString()
            })
            .eq('id', submissionId)
        
        if (error) {
            alert('Error rejecting submission: ' + error.message)
            return
        }
        
        // Keep email locked for rejected submission (user can resubmit with same email)
        // Don't free up email - user should be able to resubmit without restarting
        console.log('Email remains locked for resubmission')
        
        alert('Submission rejected successfully!')
        
        // Create notification for user
        await window.createNotification(
            combinedData.user_id,
            'Task Submission Rejected',
            `Your submission for "${combinedData.tasks.title}" was rejected. Reason: ${reason}. You can click "Resubmit" to upload new proof with the same email.`,
            'warning'
        )
        
        // Reload data
        await loadSubmissions()
        await window.loadDashboardStats()
        renderSubmissions()
        window.renderDashboardStats()
        
    } catch (error) {
        alert('Error rejecting submission: ' + error.message)
    }
}

// Export functions for global access
window.loadSubmissions = loadSubmissions
window.renderSubmissions = renderSubmissions
window.approveSubmission = approveSubmission
window.rejectSubmission = rejectSubmission
