// Tasks Module
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Global variables
let tasks = []
let userSubmissions = []

// Check for expired submissions and update their status
async function checkExpiredSubmissions() {
    try {
        // Check if supabaseClient is available
        if (!supabaseClient) {
            console.log('Supabase client not available, skipping expired submissions check')
            return
        }
        
        const userId = getCurrentUserId()
        if (!userId) return
        
        // Get all in_progress submissions for this user
        const { data: submissions, error } = await supabaseClient
            .from('task_submissions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'in_progress')
        
        if (error) {
            console.error('Error checking expired submissions:', error)
            // Don't show alert for network errors, just log them
            if (error.message && !error.message.includes('Failed to fetch')) {
                console.error('Database error checking expired submissions:', error)
            }
            return
        }
        
        const now = new Date()
        const expiredSubmissions = []
        
        // Check each submission for expiration
        for (const submission of submissions || []) {
            // Check user deadline (timer)
            if (submission.user_deadline && new Date(submission.user_deadline) <= now) {
                expiredSubmissions.push(submission.id)
            }
        }
        
        // Update expired submissions to 'expired' status and free up emails
        if (expiredSubmissions.length > 0) {
            const { error: updateError } = await supabaseClient
                .from('task_submissions')
                .update({ status: 'expired' })
                .in('id', expiredSubmissions)
            
            if (updateError) {
                console.error('Error updating expired submissions:', updateError)
            } else {
                console.log(`Updated ${expiredSubmissions.length} expired submissions`)
                
                // Free up emails for expired submissions only
                // This is the ONLY case where emails should be freed up
                // (when user runs out of time, not when they restart or get rejected)
                try {
                    const { error: emailFreeError } = await supabaseClient
                        .from('task_email_usage')
                        .delete()
                        .in('submission_id', expiredSubmissions)
                    
                    if (emailFreeError) {
                        console.error('Error freeing up emails for expired submissions:', emailFreeError)
                    } else {
                        console.log(`Freed up emails for ${expiredSubmissions.length} expired submissions`)
                    }
                } catch (emailError) {
                    console.error('Error in email freeing process:', emailError)
                    // Don't fail the entire process for email freeing errors
                }
            }
        }
    } catch (error) {
        console.error('Error in checkExpiredSubmissions:', error)
    }
}

// Load tasks and user submissions
export async function loadTasks() {
    try {
        console.log('Loading tasks...')
        
        // Load active tasks (quests)
        const { data: tasksData, error: tasksError } = await supabaseClient
            .from('tasks')
            .select('*')
            .eq('status', 'active')
        
        if (tasksError) {
            console.error('Error loading tasks:', tasksError)
            return
        }
        
        tasks = tasksData || []
        console.log('Loaded tasks:', tasks.length)
        
        // Check for expired submissions and update them (with delay to ensure client is ready)
        setTimeout(async () => {
            try {
                await checkExpiredSubmissions()
            } catch (error) {
                console.error('Error in delayed checkExpiredSubmissions:', error)
                // Don't fail the entire task loading for this
            }
        }, 500)
        
        // Load user's task submissions
        const userId = getCurrentUserId()
        if (!userId) {
            console.error('Cannot load tasks: no user ID')
            return
        }
        
        const { data: submissionsData, error: submissionsError } = await supabaseClient
            .from('task_submissions')
            .select('*')
            .eq('user_id', userId)
        
        if (submissionsError) {
            console.error('Error loading submissions:', submissionsError)
            return
        }
        
        userSubmissions = submissionsData || []
        console.log('Loaded user submissions:', userSubmissions.length)
        
    } catch (error) {
        console.error('Error loading dashboard data:', error)
        alert('Error loading tasks: ' + error.message)
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
        console.error('No current user found in tasks module')
        return null
    }
    return user.id
}

// Render tasks into the DOM
export async function renderTasks() {
    const tasksContainer = document.getElementById('tasks')
    if (!tasksContainer) {
        console.error('Tasks container not found')
        return
    }
    
    if (tasks.length === 0) {
        tasksContainer.innerHTML = '<p class="no-tasks">No active tasks available at this time.</p>'
        return
    }
    
    console.log('Rendering tasks...')
    
    tasksContainer.innerHTML = tasks.map(task => {
        const submission = userSubmissions.find(sub => sub.task_id === task.id)
        let status = submission ? submission.status : 'available'
        
        // Check if task has ended (task deadline reached)
        if (task.task_deadline && new Date() > new Date(task.task_deadline)) {
            status = 'ended'
        }
        
        // Check if user's time has expired
        if (submission && submission.user_deadline && new Date() > new Date(submission.user_deadline) && status === 'in_progress') {
            status = 'expired'
        }
        
        return `
            <div class="task-card ${status}">
                <div class="task-header">
                    <h3 class="task-title">${task.title}</h3>
                    <span class="task-reward">₱${task.reward_amount}</span>
                </div>
                
                <div class="task-body">
                    <p class="task-description">${task.description}</p>
                    ${task.instruction ? `<div class="task-instruction"><strong>Instructions:</strong><br>${task.instruction}</div>` : ''}
                    <div class="task-meta">
                        <span class="task-category">${task.category || 'General'}</span>
                        <span class="task-difficulty difficulty-${task.difficulty?.toLowerCase() || 'easy'}">${task.difficulty || 'Easy'}</span>
                        <span class="task-status ${status}">${getStatusDisplay(status)}</span>
                    </div>
                    ${task.task_deadline || task.user_deadline ? `
                        <div class="task-deadlines">
                            ${task.task_deadline ? `<div><strong>Task Deadline:</strong> ${new Date(task.task_deadline).toLocaleDateString()}</div>` : ''}
                            ${task.user_deadline ? `<div><strong>Time Limit:</strong> ${task.user_deadline} hours</div>` : ''}
                        </div>
                    ` : ''}
                    ${submission && submission.user_deadline && status === 'in_progress' ? `
                        <div class="timer-display">
                            <strong>Time Remaining:</strong> <span id="timer-${submission.id}" class="timer-countdown"></span>
                        </div>
                    ` : ''}
                    ${task.referral_required ? `
                        <div class="referral-required">
                            <strong>📧 Email Required:</strong> Get email from your referrer<br>
                            <small>You must get one of the valid emails from your referrer to start this task. Contact your referrer for the specific email.</small>
                        </div>
                    ` : ''}
                    ${submission && submission.status === 'rejected' && submission.admin_notes ? `<div class="admin-notes">Admin Notes: ${submission.admin_notes}</div>` : ''}
                    ${submission && submission.status === 'rejected' ? `<div class="resubmit-info">💡 You can resubmit with new proof using the same email.</div>` : ''}
                </div>
                
                <div class="task-actions">
                    ${getActionButton(task, submission)}
                </div>
            </div>
        `
    }).join('')
    
    // Attach event listeners
    attachTaskEventListeners()
    
    // Start timers for in-progress tasks
    startTimers()
}

// Start countdown timers for in-progress tasks
function startTimers() {
    userSubmissions.forEach(submission => {
        if (submission.status === 'in_progress' && submission.user_deadline) {
            updateTimer(submission.id, submission.user_deadline)
        }
    })
}

// Update timer display
function updateTimer(submissionId, deadline) {
    const timerElement = document.getElementById(`timer-${submissionId}`)
    if (!timerElement) return
    
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const timeLeft = deadlineDate - now
    
    if (timeLeft <= 0) {
        timerElement.textContent = 'EXPIRED'
        timerElement.style.color = 'red'
        timerElement.style.fontWeight = 'bold'
        return
    }
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)
    
    timerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    
    // Update every second
    setTimeout(() => updateTimer(submissionId, deadline), 1000)
}

// Get status display name
function getStatusDisplay(status) {
    const statusMap = {
        'available': 'Available',
        'in_progress': 'In Progress',
        'pending_review': 'Pending Review',
        'approved': 'Approved',
        'completed': 'Completed',
        'rejected': 'Rejected',
        'expired': 'Expired',
        'ended': 'Ended'
    }
    return statusMap[status] || status
}

// Get action button based on task and submission status
function getActionButton(task, submission) {
    if (!submission) {
        return `<button class="btn btn-primary" data-action="start" data-task-id="${task.id}">Start</button>`
    }
    
    const canRestart = submission.restart_count < task.restart_limit && 
                      (submission.status === 'rejected' || 
                       submission.status === 'completed' || submission.status === 'approved')
    
    switch (submission.status) {
        case 'available':
            return `<button class="btn btn-primary" data-action="start" data-task-id="${task.id}">Start</button>`
            
        case 'in_progress':
            let inProgressButtons = `
                <button class="btn btn-success" data-action="complete" data-submission-id="${submission.id}">
                    Complete (upload proof)
                </button>
            `
            if (canRestart) {
                inProgressButtons += `
                    <button class="btn btn-secondary" data-action="restart" data-submission-id="${submission.id}" data-task-id="${task.id}">
                        Restart
                    </button>
                `
            }
            return inProgressButtons
            
        case 'pending_review':
            return `<span class="task-status-text">Pending review</span>`
            
        case 'approved':
        case 'completed':
            let completedButtons = `<span class="task-status-text">Completed</span>`
            if (canRestart) {
                completedButtons += `
                    <button class="btn btn-secondary" data-action="restart" data-submission-id="${submission.id}" data-task-id="${task.id}">
                        Restart
                    </button>
                `
            }
            return completedButtons
            
        case 'rejected':
            let rejectedButtons = `<button class="btn btn-warning" data-action="resubmit" data-submission-id="${submission.id}">Resubmit</button>`
            if (canRestart) {
                rejectedButtons += `
                    <button class="btn btn-secondary" data-action="restart" data-submission-id="${submission.id}" data-task-id="${task.id}">
                        Restart
                    </button>
                `
            }
            return rejectedButtons
            
        case 'exhausted':
            return `<span class="task-status-text">No more restarts available</span>`
            
        case 'expired':
            return `<button class="btn btn-primary" data-action="start" data-task-id="${task.id}">Start Again</button>`
            
        case 'ended':
            return `<span class="task-status-text">Task has ended</span>`
            
        default:
            return `<span class="task-status-text">Unknown status</span>`
    }
}

// Attach event listeners to task action buttons
function attachTaskEventListeners() {
    const actionButtons = document.querySelectorAll('[data-action]')
    
    actionButtons.forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault()
            
            const action = this.getAttribute('data-action')
            const taskId = this.getAttribute('data-task-id')
            const submissionId = this.getAttribute('data-submission-id')
            
            console.log('Action clicked:', action, 'Task ID:', taskId, 'Submission ID:', submissionId)
            
            switch (action) {
                case 'start':
                    await startTask(taskId)
                    break
                case 'complete':
                    await window.submitProof(submissionId)
                    break
                case 'resubmit':
                    await window.submitProof(submissionId, true) // true indicates resubmit
                    break
                case 'restart':
                    await restartQuest(submissionId, taskId)
                    break
            }
        })
    })
}

// Start a task
async function startTask(taskId) {
    try {
        console.log('Starting task:', taskId)
        
        const userId = getCurrentUserId()
        if (!userId) {
            console.error('Cannot start task: no user ID')
            return
        }
        
        // Ensure tasks are loaded
        if (tasks.length === 0) {
            console.log('Tasks not loaded, loading now...')
            await loadTasks()
        }
        
        // Find the task to check referral requirements
        const task = tasks.find(t => t.id == taskId)
        if (!task) {
            console.error('Task not found:', taskId)
            return
        }
        
        // Check if email is required
        if (task.referral_required) {
            const userEmail = prompt(`This task requires a specific email to start.\n\nPlease enter the email you received from your referrer:`)
            if (!userEmail) {
                alert('Email is required to start this task. Please contact your referrer for the required email.')
                return
            }
            
            const trimmedEmail = userEmail.trim()
            
            // Validate email against admin-set list
            const validEmails = task.email_list || []
            if (validEmails.length > 0 && !validEmails.includes(trimmedEmail)) {
                alert(`Invalid email. Please contact your referrer for one of the valid emails for this task.`)
                return
            }
            
            // Check if email is already used for this task
            const { data: emailUsage, error: emailUsageError } = await supabaseClient
                .from('task_email_usage')
                .select('email')
                .eq('task_id', taskId)
                .eq('email', trimmedEmail)
                .single()
            
            if (emailUsageError && emailUsageError.code !== 'PGRST116') {
                console.error('Error checking email usage:', emailUsageError)
                alert('Error checking email availability. Please try again.')
                return
            }
            
            if (emailUsage) {
                alert(`This email has already been used for this task. Please contact your referrer for a different email.`)
                return
            }
            
            // Store the validated email for later use
            task.userEnteredEmail = trimmedEmail
        }
        
        // Check if task has expired (task deadline reached)
        if (task.task_deadline && new Date() > new Date(task.task_deadline)) {
            alert('This task has ended. The task deadline has passed.')
            return
        }
        
        // Check if there's already a submission for this task
        const existingSubmission = userSubmissions.find(sub => sub.task_id == taskId)
        
        if (existingSubmission) {
            // Update existing submission to in_progress
            console.log('Updating existing submission:', existingSubmission.id)
                const updateData = {
                    status: 'in_progress'
                }
                
                // Reset user deadline timer if task has user_deadline
                if (task.user_deadline) {
                    const hours = parseInt(task.user_deadline)
                    if (!isNaN(hours)) {
                        const newDeadline = new Date()
                        newDeadline.setHours(newDeadline.getHours() + hours)
                        updateData.user_deadline = newDeadline.toISOString()
                        console.log('Reset user deadline to:', updateData.user_deadline)
                    }
                }
                
                // Add email if required
                if (task.referral_required && task.userEnteredEmail) {
                    updateData.email_used = task.userEnteredEmail
                }
                
                const { data, error } = await supabaseClient
                    .from('task_submissions')
                    .update(updateData)
                    .eq('id', existingSubmission.id)
                    .select()
                    .single()
            
            if (error) {
                console.error('Error updating submission:', error)
                alert('Error starting task: ' + error.message)
                return
            }
            
            // Record email usage if email is required and not already recorded
            if (task.referral_required && task.userEnteredEmail) {
                // Check if email usage is already recorded for this submission
                const { data: existingUsage } = await supabaseClient
                    .from('task_email_usage')
                    .select('id')
                    .eq('submission_id', existingSubmission.id)
                    .single()
                
                if (!existingUsage) {
                    const { error: emailUsageError } = await supabaseClient
                        .from('task_email_usage')
                        .insert({
                            task_id: taskId,
                            email: task.userEnteredEmail,
                            user_id: userId,
                            submission_id: existingSubmission.id
                        })
                    
                    if (emailUsageError) {
                        console.error('Error recording email usage:', emailUsageError)
                        // Don't fail the task start for this error, just log it
                    } else {
                        console.log('Email usage recorded:', task.userEnteredEmail)
                    }
                }
            }
            
            console.log('Task started successfully (updated):', data)
        } else {
            // Create new submission
            console.log('Creating new submission')
            
            // Calculate user deadline if specified
            let userDeadline = null
            if (task.user_deadline) {
                // Parse user_deadline as hours (e.g., "2" means 2 hours)
                const hours = parseInt(task.user_deadline)
                if (!isNaN(hours)) {
                    userDeadline = new Date()
                    userDeadline.setHours(userDeadline.getHours() + hours)
                    userDeadline = userDeadline.toISOString()
                }
            }
            
                const submissionData = {
                    user_id: userId,
                    task_id: taskId,
                    status: 'in_progress',
                    user_deadline: userDeadline,
                    created_at: new Date().toISOString()
                }
                
                // Add email if required
                if (task.referral_required && task.userEnteredEmail) {
                    submissionData.email_used = task.userEnteredEmail
                }
                
                const { data, error } = await supabaseClient
                    .from('task_submissions')
                    .insert(submissionData)
                    .select()
                    .single()
            
            if (error) {
                console.error('Error creating submission:', error)
                alert('Error starting task: ' + error.message)
                return
            }
            
            // Record email usage if email is required
            if (task.referral_required && task.userEnteredEmail) {
                const { error: emailUsageError } = await supabaseClient
                    .from('task_email_usage')
                    .insert({
                        task_id: taskId,
                        email: task.userEnteredEmail,
                        user_id: userId,
                        submission_id: data.id
                    })
                
                if (emailUsageError) {
                    console.error('Error recording email usage:', emailUsageError)
                    // Don't fail the task start for this error, just log it
                } else {
                    console.log('Email usage recorded:', task.userEnteredEmail)
                }
            }
            
            console.log('Task started successfully (created):', data)
        }
        
        alert('Task started successfully!')
        
        // Reload tasks
        await loadTasks()
        await renderTasks()
        
    } catch (error) {
        console.error('Error starting task:', error)
        alert('Error starting task: ' + error.message)
    }
}

// Restart a quest
async function restartQuest(submissionId, questId) {
    try {
        console.log('Restarting quest:', questId, 'Submission:', submissionId)
        console.log('Current userSubmissions:', userSubmissions)
        console.log('Current tasks:', tasks)
        
        // First try to find submission and quest in current arrays
        let submission = userSubmissions.find(sub => sub.id == submissionId) // Use == for type coercion
        let quest = tasks.find(task => task.id == questId) // Use == for type coercion
        
        // If submission not found, fetch from database
        if (!submission) {
            console.log('Submission not found in array, fetching from database...')
            const { data: submissionData, error: submissionError } = await supabaseClient
                .from('task_submissions')
                .select('*')
                .eq('id', submissionId)
                .single()
            
            if (submissionError || !submissionData) {
                console.error('Error fetching submission:', submissionError)
                alert('Error: Submission not found in database')
                return
            }
            submission = submissionData
        }
        
        // If quest not found, fetch from database
        if (!quest) {
            console.log('Quest not found in array, fetching from database...')
            const { data: questData, error: questError } = await supabaseClient
                .from('tasks')
                .select('*')
                .eq('id', questId)
                .single()
            
            if (questError || !questData) {
                console.error('Error fetching quest:', questError)
                alert('Error: Quest not found in database')
                return
            }
            quest = questData
        }
        
        const newRestartCount = (submission.restart_count || 0) + 1
        console.log('New restart count:', newRestartCount, 'Quest restart limit:', quest.restart_limit)
        
        let updateData
        
        if (newRestartCount < quest.restart_limit) {
            // Reset submission to available and reset timer
            updateData = {
                status: 'available',
                proof_url: null,
                restart_count: newRestartCount
            }
            
            // Reset user deadline timer if task has user_deadline
            if (quest.user_deadline) {
                const hours = parseInt(quest.user_deadline)
                if (!isNaN(hours)) {
                    const newDeadline = new Date()
                    newDeadline.setHours(newDeadline.getHours() + hours)
                    updateData.user_deadline = newDeadline.toISOString()
                    console.log('Reset user deadline to:', updateData.user_deadline)
                }
            }
            
            console.log('Resetting submission to available status')
        } else {
            // Mark as exhausted
            updateData = {
                status: 'exhausted',
                restart_count: newRestartCount
            }
            console.log('Marking submission as exhausted')
        }
        
        // Update submission
        const { error: updateError } = await supabaseClient
            .from('task_submissions')
            .update(updateData)
            .eq('id', submissionId)
        
        if (updateError) {
            console.error('Error updating submission:', updateError)
            alert('Error restarting quest: ' + updateError.message)
            return
        }
        
        // Note: We don't free up emails for restarted submissions
        // Once an email is used, it should remain marked as used permanently
        // This prevents users from reusing the same email after restarting
        
        console.log('Quest restarted successfully')
        const message = newRestartCount < quest.restart_limit ?
            `Quest restarted successfully! (${newRestartCount}/${quest.restart_limit} restarts used)` :
            'Quest restarted but you have reached the restart limit. This quest is now exhausted.'
        alert(message)
        
        // Reload tasks and wallet
        await loadTasks()
        await window.loadWallet()
        await renderTasks()
        
    } catch (error) {
        console.error('Error restarting quest:', error)
        alert('Error restarting quest: ' + error.message)
    }
}

// Export functions for global access
window.loadTasks = loadTasks
window.renderTasks = renderTasks
window.getTasks = () => tasks
