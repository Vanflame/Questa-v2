// Admin Submissions Module
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Global variables
let pendingSubmissions = []
let isProcessingReject = false
let isProcessingApprove = false

// Create notification function (copied from wallet.js for admin context)
async function createNotification(userId, title, message, type = 'info') {
    try {
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
        
        console.log('Notification created successfully:', { userId, title, type })
        return true
    } catch (error) {
        console.error('Error creating notification:', error)
        return false
    }
}

// Make createNotification available globally
window.createNotification = createNotification

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
        
        console.log('Raw submissions data:', submissionsData)
        
        // Debug each submission's email data
        if (submissionsData && submissionsData.length > 0) {
            console.log('Email data for each submission:')
            submissionsData.forEach((sub, index) => {
                console.log(`Submission ${index + 1}:`, {
                    id: sub.id,
                    email_used: sub.email_used,
                    task_id: sub.task_id,
                    user_id: sub.user_id,
                    status: sub.status
                })
            })
        }
        
        if (submissionsError) {
            console.error('Error loading submissions:', submissionsError)
            pendingSubmissions = []
            return
        }
        
        // Then, get tasks for each submission
        const submissionsWithTasks = await Promise.all(
            (submissionsData || []).map(async (submission) => {
                const { data: taskData, error: taskError } = await supabaseClient
                    .from('tasks')
                    .select('id, title, description, reward_amount, category, referral_required')
                    .eq('id', submission.task_id)
                    .single()
                
                if (taskError) {
                    console.error('Error fetching task data for submission:', submission.id, taskError)
                } else {
                    console.log('Task data for submission:', submission.id, {
                        title: taskData?.title,
                        referral_required: taskData?.referral_required,
                        id: taskData?.id
                    })
                }
                
                const { data: userData } = await supabaseClient
                    .from('profiles')
                    .select('email')
                    .eq('id', submission.user_id)
                    .single()
                
                // If email_used is missing but task requires referral, try to get it from task_email_usage
                let emailUsed = submission.email_used
                console.log('Initial email check for submission:', submission.id, {
                    email_used: submission.email_used,
                    referral_required: taskData?.referral_required
                })
                
                // Handle both boolean and string values for referral_required
                const isReferralRequired = taskData?.referral_required === true || taskData?.referral_required === 'true'
                
                if (!emailUsed && isReferralRequired) {
                    console.log('Checking task_email_usage for submission:', submission.id)
                    try {
                        const { data: emailUsageData, error: emailUsageError } = await supabaseClient
                            .from('task_email_usage')
                            .select('email')
                            .eq('submission_id', submission.id)
                            .single()
                        
                        if (emailUsageError) {
                            console.log('No email usage data found for submission:', submission.id, emailUsageError)
                            
                            // If task_email_usage table doesn't exist or has issues, 
                            // and we have email_list, show a generic message
                            if (taskData?.email_list && taskData.email_list.length > 0) {
                                emailUsed = `[One of ${taskData.email_list.length} valid emails]`
                                console.log('Using fallback email display:', emailUsed)
                            }
                        } else if (emailUsageData) {
                            emailUsed = emailUsageData.email
                            console.log('Found email from task_email_usage:', emailUsed)
                        }
                    } catch (error) {
                        console.log('Error checking task_email_usage:', error)
                        
                        // Fallback: show generic message if email list exists
                        if (taskData?.email_list && taskData.email_list.length > 0) {
                            emailUsed = `[One of ${taskData.email_list.length} valid emails]`
                            console.log('Using fallback email display after error:', emailUsed)
                        }
                    }
                }
                
                return {
                    ...submission,
                    email_used: emailUsed, // Override with found email
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
        console.log('Submission IDs:', pendingSubmissions.map(s => s.id))
        
        // Debug final processed data
        console.log('Final processed submissions:')
        pendingSubmissions.forEach((sub, index) => {
            console.log(`Final submission ${index + 1}:`, {
                id: sub.id,
                email_used: sub.email_used,
                referral_required: sub.tasks?.referral_required,
                task_title: sub.tasks?.title
            })
        })
        
        // Additional debug: Check the specific task that's showing "Required but missing"
        if (pendingSubmissions.length > 0) {
            const firstSubmission = pendingSubmissions[0]
            console.log('Debugging first submission task:', firstSubmission.tasks)
            
            // Direct query to check the task
            const { data: directTaskData, error: directTaskError } = await supabaseClient
                .from('tasks')
                .select('id, title, referral_required, email_list')
                .eq('id', firstSubmission.task_id)
                .single()
            
            console.log('Direct task query result:', { directTaskData, directTaskError })
        }
        
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
    
    submissionsList.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>User</th>
                    <th>Task</th>
                    <th>Reward</th>
                    <th>Proof</th>
                    <th>Email Used</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${pendingSubmissions.map(submission => {
                    const taskData = submission.tasks
                    const userData = submission.user_profiles
                    
                    // Debug email data
                    console.log('Submission email data:', {
                        id: submission.id,
                        email_used: submission.email_used,
                        referral_required: taskData?.referral_required,
                        task_title: taskData?.title
                    })
                    
                    return `
                        <tr>
                            <td>${userData.username || userData.email}</td>
                            <td>
                                <div><strong>${taskData.title}</strong></div>
                                <div class="text-muted">${taskData.description.length > 50 ? taskData.description.substring(0, 50) + '...' : taskData.description}</div>
                            </td>
                            <td>₱${taskData.reward_amount.toFixed(2)}</td>
                            <td>
                                <a href="${submission.proof_url}" target="_blank" class="admin-btn admin-btn-info admin-btn-sm">
                                    View Proof
                                </a>
                            </td>
                            <td>
                                ${submission.email_used ? 
                                    (submission.email_used.startsWith('[One of') ? 
                                        `<span class="email-fallback" style="color: #f59e0b; background: rgba(245, 158, 11, 0.1); padding: 2px 8px; border-radius: 4px; font-size: 0.875rem;">${submission.email_used}</span>` :
                                        `<span class="email-used">${submission.email_used}</span>`
                                    ) : 
                                    ((taskData?.referral_required === true || taskData?.referral_required === 'true') ? 
                                        '<span class="email-missing" style="color: #ef4444;">Required but missing</span>' : 
                                        '<span class="email-not-required" style="color: #6b7280;">Not required</span>'
                                    )
                                }
                            </td>
                            <td>${new Date(submission.submitted_at).toLocaleDateString()}</td>
                            <td>
                                <button class="admin-btn admin-btn-success admin-btn-sm" data-action="approve" data-submission-id="${submission.id}">
                                    Approve
                                </button>
                                <button class="admin-btn admin-btn-danger admin-btn-sm" data-action="reject" data-submission-id="${submission.id}">
                                    Reject
                                </button>
                            </td>
                        </tr>
                    `
                }).join('')}
            </tbody>
        </table>
    `
    
    // Attach event listeners
    attachSubmissionEventListeners()
}

// Attach event listeners to submission action buttons
function attachSubmissionEventListeners() {
    console.log('Attaching submission event listeners...')
    
    const submissionsList = document.getElementById('submissions-list')
    if (submissionsList) {
        submissionsList.addEventListener('click', function(e) {
            const button = e.target.closest('[data-action]')
            if (!button) return
            
            e.preventDefault()
            e.stopPropagation()
            
            const action = button.getAttribute('data-action')
            const submissionId = button.getAttribute('data-submission-id')
            
            console.log('Submission action clicked:', action, 'ID:', submissionId)
            
            // Prevent multiple rapid clicks
            if (button.disabled) {
                console.log('Button already processing, ignoring click')
                return
            }
            
            if (action === 'approve') {
                if (button.disabled) {
                    console.log('Approve button already disabled, ignoring click')
                    return
                }
                button.disabled = true
                button.textContent = 'Processing...'
                approveSubmission(submissionId).finally(() => {
                    button.disabled = false
                    button.textContent = 'Approve'
                })
            } else if (action === 'reject') {
                if (button.disabled) {
                    console.log('Reject button already disabled, ignoring click')
                    return
                }
                button.disabled = true
                button.textContent = 'Processing...'
                rejectSubmission(submissionId).finally(() => {
                    button.disabled = false
                    button.textContent = 'Reject'
                })
            }
        })
    }
}

// Approve a submission
async function approveSubmission(submissionId) {
    // Prevent multiple simultaneous approvals
    if (isProcessingApprove) {
        console.log('Already processing an approval, ignoring request for:', submissionId)
        return
    }
    
    isProcessingApprove = true
    
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
                            <h3>Error Fetching Submission</h3>
                            <p>Unable to fetch submission details. Please try again.</p>
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
                alert('Error fetching submission: ' + fetchError.message)
            }
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
        
        console.log('Status update result:', { updateError, submissionId })
        
        // Verify the update worked by checking the current status
        const { data: verifyData, error: verifyError } = await supabaseClient
            .from('task_submissions')
            .select('status')
            .eq('id', submissionId)
            .single()
        
        console.log('Verification query result:', { verifyData, verifyError })
        
        if (updateError) {
            console.error('Error updating submission:', updateError)
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
                            <h3>Error Approving Submission</h3>
                            <p>Unable to approve submission. Please try again.</p>
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
                alert('Error approving submission: ' + updateError.message)
            }
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
                            <h3>Error Updating Wallet</h3>
                            <p>Unable to update user wallet. Please try again.</p>
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
                alert('Error updating wallet: ' + walletError.message)
            }
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
            if (window.openModal) {
                window.openModal({
                    title: 'Warning',
                    content: `
                        <div class="modal-warning-content">
                            <div class="modal-icon warning">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2"/>
                                    <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/>
                                    <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Profile Balance Update Failed</h3>
                            <p>Wallet was updated successfully, but profile balance update failed. Balance might not display correctly.</p>
                            <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.05)); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #d97706; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon warning-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">The user's wallet balance has been updated, but the profile balance sync failed.</span>
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: { text: 'OK', action: () => window.closeModal() },
                    closable: true
                })
            } else {
                alert('Warning: Wallet updated but profile balance update failed. Balance might not display correctly.')
            }
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
                        <h3>Submission Approved</h3>
                        <p>Submission has been successfully approved and user wallet has been updated.</p>
                        <div style="background: linear-gradient(135deg, rgba(5, 150, 105, 0.1), rgba(16, 185, 129, 0.05)); border: 1px solid rgba(5, 150, 105, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #059669; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon info-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">Reward: ₱${combinedData.tasks.reward_amount.toFixed(2)} for "${combinedData.tasks.title}"</span>
                            </p>
                        </div>
                    </div>
                `,
                primaryButton: { text: 'OK', action: () => window.closeModal() },
                closable: true
            })
        } else {
            alert('Submission approved successfully! User wallet updated.')
        }
        
        // Create notification for user
        try {
            await createNotification(
                combinedData.user_profiles.user_id,
                'Task Approved!',
                `Your submission for "${combinedData.tasks.title}" has been approved. You earned ₱${combinedData.tasks.reward_amount}!`,
                'success'
            )
        } catch (notificationError) {
            console.error('Error creating notification:', notificationError)
            // Don't fail the approval for notification errors
        }
        
        // Reload data with a small delay to ensure transaction is committed
        setTimeout(async () => {
            try {
                console.log('Refreshing submissions after approval...')
                await loadSubmissions()
                console.log('Submissions after reload:', pendingSubmissions.length)
                console.log('Submission IDs after reload:', pendingSubmissions.map(s => s.id))
                await window.loadDashboardStats()
                renderSubmissions()
                console.log('UI refresh completed successfully')
                // Don't call renderDashboardStats() here as it overwrites withdrawal count
                // window.renderDashboardStats()
            } catch (error) {
                console.error('Error during UI refresh after approval:', error)
            } finally {
                // Reset processing flag after completion
                isProcessingApprove = false
            }
        }, 500)
        
    } catch (error) {
        // Reset processing flag on error
        isProcessingApprove = false
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
                        <p>An unexpected error occurred while approving submission.</p>
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
            alert('Error approving submission: ' + error.message)
        }
    }
}

// Reject a submission
async function rejectSubmission(submissionId) {
    console.log('rejectSubmission called with ID:', submissionId)
    
    // Prevent multiple calls
    if (isProcessingReject) {
        console.log('Already processing reject, ignoring call')
        return
    }
    
    isProcessingReject = true
    
    // Show reason input modal
    if (window.openModal) {
        window.openModal({
            title: 'Reject Submission',
            content: `
                <div class="modal-form-content">
                    <div class="modal-warning-content">
                        <div class="modal-warning-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2"/>
                                <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2"/>
                                <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <div class="modal-warning-text">
                            <h3 class="modal-warning-title">Reject Submission</h3>
                            <p class="modal-warning-description">Please provide a reason for rejecting this submission. The user will be able to resubmit with the same email.</p>
                        </div>
                    </div>
                    
                    <form id="reject-submission-form">
                        <div class="form-group">
                            <label for="rejection-reason">Reason for Rejection</label>
                            <textarea id="rejection-reason" rows="4" placeholder="Please provide a detailed reason for rejecting this submission..." required></textarea>
                            <small>This reason will be sent to the user via notification.</small>
                        </div>
                        <div id="reject-error" class="error-message" style="display: none;"></div>
                    </form>
                </div>
            `,
            primaryButton: { 
                text: 'Reject Submission', 
                action: () => {
                    console.log('Reject button clicked, checking form...')
                    const reason = document.getElementById('rejection-reason').value.trim()
                    console.log('Reason entered:', reason)
                    
                    if (!reason) {
                        console.log('No reason provided, showing error')
                        document.getElementById('reject-error').textContent = 'Please provide a reason for rejection'
                        document.getElementById('reject-error').style.display = 'block'
                        return
                    }
                    
                    console.log('Reason valid, showing loading state...')
                    // Show loading state
                    const submitBtn = document.querySelector('.modal-primary-btn')
                    if (submitBtn) {
                        submitBtn.disabled = true
                        submitBtn.innerHTML = `
                            <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation: spin 1s linear infinite;">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Rejecting...
                        `
                    }
                    
                    console.log('Calling processSubmissionRejection...')
                    // Don't close modal here - let processSubmissionRejection handle it
                    processSubmissionRejection(submissionId, reason)
                }
            },
            closable: true
        })
        
        // Add custom form handler to prevent modal closing
        setTimeout(() => {
            const form = document.getElementById('reject-submission-form')
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault()
                    console.log('Form submit prevented')
                })
            }
        }, 100)
    } else {
        const reason = prompt('Please provide a reason for rejection:')
        if (!reason) {
            alert('Rejection requires a reason.')
            return
        }
        processSubmissionRejection(submissionId, reason)
    }
}

// Process submission rejection with reason
async function processSubmissionRejection(submissionId, reason) {
    try {
        console.log('Rejecting submission:', submissionId, 'Reason:', reason)
        console.log('Modal should still be open at this point')

        // Get submission details
        const { data: submissionData, error: fetchError } = await supabaseClient
            .from('task_submissions')
            .select('*')
            .eq('id', submissionId)
            .single()
        
        if (fetchError) {
            console.error('Error fetching submission:', fetchError)
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
                            <h3>Error Fetching Submission</h3>
                            <p>Unable to fetch submission details. Please try again.</p>
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
                alert('Error fetching submission: ' + fetchError.message)
            }
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
            // Reset button state
            resetRejectButton()
            
            // Reset processing flag
            isProcessingReject = false
            
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
                            <h3>Error Rejecting Submission</h3>
                            <p>Unable to reject submission. Please try again.</p>
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
                        <p>An unexpected error occurred while rejecting submission.</p>
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
            alert('Error rejecting submission: ' + error.message)
        }
            }
            return
        }
        
        // Keep email locked for rejected submission (user can resubmit with same email)
        // Don't free up email - user should be able to resubmit without restarting
        console.log('Email remains locked for resubmission')
        
        // Close the original rejection form modal first
        window.closeModal()
        
        // Reset processing flag
        isProcessingReject = false
        
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
                        <h3>Submission Rejected</h3>
                        <p>Submission has been successfully rejected. The user can resubmit with the same email.</p>
                        <div style="background: linear-gradient(135deg, rgba(5, 150, 105, 0.1), rgba(16, 185, 129, 0.05)); border: 1px solid rgba(5, 150, 105, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #059669; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon info-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">Task: "${combinedData.tasks.title}"</span>
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
            alert('Submission rejected successfully!')
        }
        
        // Create notification for user
        try {
            await createNotification(
                combinedData.user_id,
                'Task Submission Rejected',
                `Your submission for "${combinedData.tasks.title}" was rejected. Reason: ${reason}. You can click "Resubmit" to upload new proof with the same email.`,
                'warning'
            )
        } catch (notificationError) {
            console.error('Error creating notification:', notificationError)
            // Don't fail the rejection for notification errors
        }
        
        // Reload data
        await loadSubmissions()
        await window.loadDashboardStats()
        renderSubmissions()
        // Don't call renderDashboardStats() here as it overwrites withdrawal count
        // window.renderDashboardStats()
        
    } catch (error) {
        // Reset button state
        resetRejectButton()
        
        // Reset processing flag
        isProcessingReject = false
        
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
                        <p>An unexpected error occurred while rejecting submission.</p>
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
            alert('Error rejecting submission: ' + error.message)
        }
    }
}

// Reset reject button to original state
function resetRejectButton() {
    const submitBtn = document.querySelector('.modal-primary-btn')
    if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = 'Reject Submission'
    }
}

// Export functions for global access
window.loadSubmissions = loadSubmissions
window.renderSubmissions = renderSubmissions
window.attachSubmissionEventListeners = attachSubmissionEventListeners
window.approveSubmission = approveSubmission
window.rejectSubmission = rejectSubmission
