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

// Check for ended tasks and update ongoing submissions
async function checkEndedTasks() {
    try {
        // Check if supabaseClient is available
        if (!supabaseClient) {
            console.log('Supabase client not available, skipping ended tasks check')
            return
        }
        
        const userId = getCurrentUserId()
        if (!userId) return
        
        // Get all in_progress submissions for this user
        const { data: submissions, error: submissionsError } = await supabaseClient
            .from('task_submissions')
            .select('*, tasks(*)')
            .eq('user_id', userId)
            .eq('status', 'in_progress')
        
        if (submissionsError) {
            console.error('Error checking ended tasks:', submissionsError)
            return
        }
        
        const now = new Date()
        const endedSubmissions = []
        
        // Check each submission's task deadline
        for (const submission of submissions || []) {
            const task = submission.tasks
            if (task && task.task_deadline && new Date(task.task_deadline) < now) {
                endedSubmissions.push(submission.id)
            }
        }
        
        // Update submissions for ended tasks to 'ended' status
        if (endedSubmissions.length > 0) {
            const { error: updateError } = await supabaseClient
                .from('task_submissions')
                .update({ 
                    status: 'ended',
                    updated_at: new Date().toISOString()
                })
                .in('id', endedSubmissions)
            
            if (updateError) {
                console.error('Error updating ended submissions:', updateError)
            } else {
                console.log(`Updated ${endedSubmissions.length} submissions for ended tasks`)
                
                // Free up emails for ended submissions
                try {
                    const { error: emailFreeError } = await supabaseClient
                        .from('task_email_usage')
                        .delete()
                        .in('submission_id', endedSubmissions)
                    
                    if (emailFreeError) {
                        console.error('Error freeing up emails for ended submissions:', emailFreeError)
                    } else {
                        console.log(`Freed up emails for ${endedSubmissions.length} ended submissions`)
                    }
                } catch (emailError) {
                    console.error('Error in email freeing process for ended tasks:', emailError)
                }
            }
        }
    } catch (error) {
        console.error('Error in checkEndedTasks:', error)
    }
}

// Load tasks and user submissions
export async function loadTasks() {
    try {
        console.log('Loading tasks...')
        
        // Check if account is disabled
        if (window.isAccountDisabledCheck && window.isAccountDisabledCheck()) {
            console.log('Account is disabled, showing disabled message')
            showDisabledAccountMessage()
            return
        }
        
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
                await checkEndedTasks()
            } catch (error) {
                console.error('Error in delayed checks:', error)
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

// Show disabled account message for tasks
function showDisabledAccountMessage() {
    const tasksContainer = document.getElementById('tasks-list')
    if (tasksContainer) {
        tasksContainer.innerHTML = `
            <div class="disabled-account-message">
                <div class="disabled-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <h3>Account Disabled</h3>
                <p>Your account has been disabled by an administrator. You cannot view or complete tasks at this time.</p>
                <p>Please contact support if you believe this is an error.</p>
            </div>
        `
    }
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

// Show task details modal
async function showTaskDetails(taskId) {
    try {
        // Ensure tasks are loaded
        if (tasks.length === 0) {
            console.log('Tasks not loaded, loading now...')
            await loadTasks()
        }
        
        const task = tasks.find(t => t.id == taskId)
        if (!task) {
            alert('Task not found')
            return
        }
        
        // Get user's submission for this task
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
        
        // Create modal content with image
        const modalContent = `
            <div class="modal-task-details">
                <!-- Task Hero Section -->
                <div class="task-detail-hero">
                ${task.image_url ? `
                    <div class="task-detail-image">
                            <img src="${task.image_url}" alt="${task.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="task-detail-placeholder" style="display: none;">
                                <div class="placeholder-icon">
                                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                                <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
                            </svg>
                                </div>
                            </div>
                            <div class="task-image-overlay">
                                <div class="task-reward-badge">₱${task.reward_amount}</div>
                        </div>
                    </div>
                ` : `
                        <div class="task-detail-placeholder">
                            <div class="placeholder-icon">
                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                            <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
                        </svg>
                            </div>
                            <div class="task-reward-badge">₱${task.reward_amount}</div>
                    </div>
                `}
                </div>
                
                <!-- Task Header -->
                <div class="task-detail-header">
                    ${submission && submission.status === 'rejected' && submission.admin_notes ? `
                        <div class="task-admin-notes">
                            <div class="admin-notes-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="admin-notes-content">
                                <strong>Admin Notes:</strong> ${submission.admin_notes}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="task-title-section">
                    <h2 class="task-detail-title">${task.title}</h2>
                    </div>
                </div>
                
                <!-- Task Content -->
                <div class="task-detail-content">
                    <!-- Description Section -->
                    <div class="task-section">
                        <h3 class="section-title">Description</h3>
                        <p class="task-description">${task.description}</p>
                    </div>
                    
                    <!-- Instructions Section -->
                    ${task.instruction ? `
                        <div class="task-section">
                            <h3 class="section-title">Instructions</h3>
                            <div class="instruction-content">
                                ${task.instruction.split('\n').map(instruction => 
                                    instruction.trim() ? `<div class="instruction-item">${instruction}</div>` : ''
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Task Information Grid -->
                    <div class="task-section">
                        <h3 class="section-title">Task Information</h3>
                        <div class="task-info-grid">
                            <div class="info-item">
                                <div class="info-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-7 7a2 2 0 0 1-2.828 0l-7-7A1.994 1.994 0 0 1 3 12V7a4 4 0 0 1 4-4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                        </div>
                                <div class="info-content">
                                    <span class="info-label">Category</span>
                                    <span class="info-value">${task.category || 'General'}</span>
                        </div>
                        </div>
                            
                        ${task.task_deadline ? `
                                <div class="info-item">
                                    <div class="info-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                                            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                                            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                    </div>
                                    <div class="info-content">
                                        <span class="info-label">Task Deadline</span>
                                        <span class="info-value">${new Date(task.task_deadline).toLocaleDateString()}</span>
                                    </div>
                            </div>
                        ` : ''}
                            
                        ${task.user_deadline ? `
                                <div class="info-item">
                                    <div class="info-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                            <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                    </div>
                                    <div class="info-content">
                                        <span class="info-label">Time Limit</span>
                                        <span class="info-value">${task.user_deadline} hours</span>
                                    </div>
                            </div>
                        ` : ''}
                            
                        ${task.referral_required ? `
                                <div class="info-item">
                                    <div class="info-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2"/>
                                            <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                    </div>
                                    <div class="info-content">
                                        <span class="info-label">Email Required</span>
                                        <span class="info-value">Yes (${task.email_list ? task.email_list.length : 0} emails available)</span>
                                    </div>
                            </div>
                        ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `
        
        // Show modal using the existing modal system
        if (window.openModal) {
            window.openModal({
                title: 'Task Details',
                content: modalContent,
                primaryButton: {
                    text: 'Close',
                    action: () => window.closeModal()
                },
                closable: true,
                scrollable: true
            })
        } else {
            alert(`Task Details:\n\n${task.title}\n${task.description}\nReward: ₱${task.reward_amount}\nDifficulty: ${task.difficulty}\nCategory: ${task.category || 'General'}`)
        }
        
    } catch (error) {
        console.error('Error showing task details:', error)
        alert('Error loading task details')
    }
}

// Sort tasks by status hierarchy
function sortTasksByStatus(tasks) {
    // Define status priority (lower number = higher priority)
    const statusPriority = {
        'in_progress': 1,     // Highest priority - currently being worked on
        'pending_review': 2,  // Second priority - submitted, waiting for review
        'rejected': 3,        // Third priority - rejected submissions (can be restarted)
        'approved': 4,        // Fourth priority - approved submissions
        'completed': 5,       // Fifth priority - completed tasks
        'available': 6,       // Sixth priority - available to start
        'expired': 7,         // Seventh priority - user's time expired
        'exhausted': 8,       // Eighth priority - exhausted (if applicable)
        'ended': 9            // Lowest priority - tasks that have ended (at bottom)
    }
    
    return tasks.sort((a, b) => {
        // Get submission for each task
        const submissionA = userSubmissions.find(sub => sub.task_id === a.id)
        const submissionB = userSubmissions.find(sub => sub.task_id === b.id)
        
        // Determine status for each task
        let statusA = submissionA ? submissionA.status : 'available'
        let statusB = submissionB ? submissionB.status : 'available'
        
        // Check if task has ended (task deadline reached)
        if (a.task_deadline && new Date() > new Date(a.task_deadline)) {
            statusA = 'ended'
        }
        if (b.task_deadline && new Date() > new Date(b.task_deadline)) {
            statusB = 'ended'
        }
        
        // Check if user's time has expired
        if (submissionA && submissionA.user_deadline && new Date() > new Date(submissionA.user_deadline) && statusA === 'in_progress') {
            statusA = 'expired'
        }
        if (submissionB && submissionB.user_deadline && new Date() > new Date(submissionB.user_deadline) && statusB === 'in_progress') {
            statusB = 'expired'
        }
        
        // Get priority for each status
        const priorityA = statusPriority[statusA] || 10
        const priorityB = statusPriority[statusB] || 10
        
        // Sort by priority (ascending - lower number first)
        if (priorityA !== priorityB) {
            return priorityA - priorityB
        }
        
        // If same priority, sort by deadline (earliest first)
        if (a.task_deadline && b.task_deadline) {
            return new Date(a.task_deadline) - new Date(b.task_deadline)
        }
        
        // If no deadline, sort by creation date (newest first)
        return new Date(b.created_at) - new Date(a.created_at)
    })
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
    
    // Check current view mode
    const currentView = tasksContainer.classList.contains('list-view') ? 'list' : 'cards'
    console.log('Rendering tasks in', currentView, 'view...')
    
    if (currentView === 'list') {
        // Sort tasks by status hierarchy for list view too
        const sortedTasks = sortTasksByStatus(tasks)
        
        tasksContainer.innerHTML = `
        <div class="tasks-list">
            ${sortedTasks.map(task => {
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
            <div class="task-list-item ${status}">
                <!-- Task Image -->
                <div class="task-list-image">
                    ${task.image_url ? `
                        <img src="${task.image_url}" alt="${task.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="task-image-placeholder" style="display: none;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                                <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                    ` : `
                        <div class="task-image-placeholder">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                                <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                    `}
                </div>
                
                <!-- Task Details -->
                <div class="task-list-details">
                    <div class="task-list-header">
                        <h3 class="task-list-title">${task.title}</h3>
                        <div class="task-list-badges">
                            <span class="task-status-badge ${status}">
                                ${getStatusDisplay(status)}
                            </span>
                        </div>
                    </div>
                    
                    <div class="task-list-meta">
                        <div class="task-list-reward">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span>₱${task.reward_amount}</span>
                        </div>
                        
                        <div class="task-list-deadline">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span>${task.task_deadline ? new Date(task.task_deadline).toLocaleDateString() : 'No deadline'}</span>
                        </div>
                        
                        ${task.user_deadline ? `
                            <div class="task-list-time-limit">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <span>${task.user_deadline}h limit</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Task Actions -->
                <div class="task-list-actions">
                    <button class="btn btn-primary btn-sm" data-action="view-details" data-task-id="${task.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        View Details
                    </button>
                    ${getActionButton(task, submission)}
                </div>
            </div>
        `
    }).join('')}
        </div>
    `
    } else {
        // Card view (original) - Sort tasks by status hierarchy
        const sortedTasks = sortTasksByStatus(tasks)
        
        tasksContainer.innerHTML = `
        <div class="tasks-grid">
            ${sortedTasks.map(task => {
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
                <!-- Banner with Badges -->
                ${task.image_url ? `
                    <div class="task-banner">
                        <img src="${task.image_url}" alt="${task.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="task-banner-placeholder" style="display: none;">
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                                <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <div class="task-banner-badges">
                            <span class="task-banner-badge difficulty ${task.difficulty?.toLowerCase() || 'easy'}">${getDifficultyStars(task.difficulty)}</span>
                            <span class="task-banner-badge status ${status.replace('_', '-')}">${getStatusDisplay(status)}</span>
                            <span class="task-banner-badge category">${task.category || 'General'}</span>
                            <span class="task-banner-badge time-limit">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                ${submission && submission.status === 'in_progress' && submission.user_deadline ? 
                                    `<span id="banner-timer-${submission.id}" class="banner-timer">Calculating...</span>` : 
                                    `${task.user_deadline || 'No limit'}h`
                                }
                            </span>
                        </div>
                    </div>
                ` : `
                    <div class="task-banner">
                        <div class="task-banner-placeholder">
                            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                                <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <div class="task-banner-badges">
                            <span class="task-banner-badge difficulty ${task.difficulty?.toLowerCase() || 'easy'}">${getDifficultyStars(task.difficulty)}</span>
                            <span class="task-banner-badge status ${status.replace('_', '-')}">${getStatusDisplay(status)}</span>
                            <span class="task-banner-badge category">${task.category || 'General'}</span>
                            <span class="task-banner-badge time-limit">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                ${submission && submission.status === 'in_progress' && submission.user_deadline ? 
                                    `<span id="banner-timer-${submission.id}" class="banner-timer">Calculating...</span>` : 
                                    `${task.user_deadline || 'No limit'}h`
                                }
                            </span>
                        </div>
                    </div>
                `}
                
                <!-- Title & Reward Row -->
                <div class="task-header">
                    ${submission && submission.status === 'rejected' && submission.admin_notes ? `
                        <div class="task-admin-notes">
                            <div class="admin-notes-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="admin-notes-content">
                                <strong>Admin Notes:</strong> ${submission.admin_notes}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="task-title-row">
                    <h3 class="task-title">${task.title}</h3>
                        <div class="task-reward-badge">
                            <svg class="task-reward-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                            </svg>
                            <span>₱${task.reward_amount}</span>
                        </div>
                </div>
                
                </div>
                
                <!-- Task Description -->
                <div class="task-body">
                    <p class="task-description">${task.description}</p>
                    
                    ${task.instruction ? `
                        <div class="task-instructions">
                            <button class="task-instructions-toggle" onclick="toggleInstructions(this)">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                View Instructions
                            </button>
                            <div class="task-instructions-content" style="display: none;">
                                ${task.instruction.split('\n').map(instruction => 
                                    instruction.trim() ? `<div class="instruction-item">${instruction}</div>` : ''
                                ).join('')}
                    </div>
                        </div>
                    ` : ''}
                    
                    <!-- Email Required Alert -->
                    ${task.referral_required ? `
                        <div class="task-alert task-alert-warning">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            <span>Email verification required</span>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Info Row -->
                <div class="task-info-row">
                    ${task.task_deadline ? `
                        <div class="task-info-item">
                            <svg class="task-info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                                <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                                <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            <span class="task-info-label">Deadline:</span>
                            <span class="task-info-value">${new Date(task.task_deadline).toLocaleDateString()}</span>
                        </div>
                    ` : ''}
                    
                    ${task.user_deadline ? `
                        <div class="task-info-item">
                            <svg class="task-info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
                            </svg>
                            <span class="task-info-label">Time Limit:</span>
                            <span class="task-info-value">
                                ${submission && submission.status === 'in_progress' && submission.user_deadline ? 
                                    `<span id="timer-${submission.id}" class="task-timer">Calculating...</span>` : 
                                    `${task.user_deadline}h`
                                }
                            </span>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Actions: Only Primary Button Visible -->
                <div class="task-actions">
                    <button class="btn btn-primary task-primary-action" data-action="view-details" data-task-id="${task.id}">
                        View Details
                    </button>
                    ${getActionButton(task, submission) ? `
                        <div class="task-secondary-actions">
                    ${getActionButton(task, submission)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `
    }).join('')}
        </div>
    `
    }
    
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
    const bannerTimerElement = document.getElementById(`banner-timer-${submissionId}`)
    
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const timeLeft = deadlineDate - now
    
    if (timeLeft <= 0) {
        const expiredText = 'EXPIRED'
        if (timerElement) {
            timerElement.textContent = expiredText
        timerElement.style.color = 'red'
        timerElement.style.fontWeight = 'bold'
        }
        if (bannerTimerElement) {
            bannerTimerElement.textContent = expiredText
            bannerTimerElement.style.color = 'red'
            bannerTimerElement.style.fontWeight = 'bold'
        }
        return
    }
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)
    
    const timeText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    
    if (timerElement) {
        timerElement.textContent = timeText
    }
    if (bannerTimerElement) {
        bannerTimerElement.textContent = timeText
    }
    
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
        'expired': '⏰ Expired',
        'ended': '🛑 Ended',
        'exhausted': '⚠️ Exhausted'
    }
    return statusMap[status] || status
}

// Get action button based on task and submission status
function getActionButton(task, submission) {
    // Check if task has ended (task deadline reached) - this takes priority
    if (task.task_deadline && new Date() > new Date(task.task_deadline)) {
        return `<span class="task-status-text disabled">Task has ended</span>`
    }
    
    if (!submission) {
        return `<button class="btn btn-primary" data-action="start" data-task-id="${task.id}">Start</button>`
    }
    
    const canRestart = submission.restart_count < task.restart_limit && 
                      (submission.status === 'rejected' || 
                       submission.status === 'completed' || submission.status === 'approved') &&
                      !(task.task_deadline && new Date() > new Date(task.task_deadline))
    
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
            return '' // Status already shown in banner badge
            
        case 'approved':
        case 'completed':
            // Check if task has ended - if so, no restart allowed
            if (task.task_deadline && new Date() > new Date(task.task_deadline)) {
                return `<span class="task-status-text disabled">Task has ended</span>`
            }
            
            let completedButtons = ''
            if (canRestart) {
                completedButtons = `
                    <button class="btn btn-secondary" data-action="restart" data-submission-id="${submission.id}" data-task-id="${task.id}">
                        Restart
                    </button>
                `
            }
            return completedButtons
            
        case 'rejected':
            // Check if task has ended - if so, no resubmit or restart allowed
            if (task.task_deadline && new Date() > new Date(task.task_deadline)) {
                return `<span class="task-status-text disabled">Task has ended</span>`
            }
            
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
            return `<span class="task-status-text disabled">Task has ended</span>`
            
        default:
            return `<span class="task-status-text">Unknown status</span>`
    }
}

// Attach event listeners to task action buttons
function attachTaskEventListeners() {
    // Remove existing event listeners by using event delegation instead
    const tasksContainer = document.querySelector('.tasks-container')
    if (!tasksContainer) return
    
    // Remove any existing event listeners
    tasksContainer.removeEventListener('click', handleTaskAction)
    
    // Add single event listener using delegation
    tasksContainer.addEventListener('click', handleTaskAction)
}

// Handle task action clicks with delegation
async function handleTaskAction(e) {
    const button = e.target.closest('[data-action]')
    if (!button) return
    
            e.preventDefault()
            
    const action = button.getAttribute('data-action')
    const taskId = button.getAttribute('data-task-id')
    const submissionId = button.getAttribute('data-submission-id')
            
            console.log('Action clicked:', action, 'Task ID:', taskId, 'Submission ID:', submissionId)
            
            switch (action) {
                case 'start':
                    await startTask(taskId)
                    break
                case 'complete':
                    console.log('Attempting to call openProofUploadModal, function exists:', typeof window.openProofUploadModal)
                    if (typeof window.openProofUploadModal === 'function') {
                        window.openProofUploadModal(submissionId)
                    } else {
                        console.error('openProofUploadModal is not a function:', typeof window.openProofUploadModal)
                        // Try to wait for the function to be available with timeout
                        let retryCount = 0
                        const maxRetries = 50 // 5 seconds max wait
                        const waitForFunction = () => {
                            retryCount++
                            if (typeof window.openProofUploadModal === 'function') {
                                console.log('Function now available, calling openProofUploadModal')
                                window.openProofUploadModal(submissionId)
                            } else if (retryCount < maxRetries) {
                                console.log(`Still waiting for openProofUploadModal function... (${retryCount}/${maxRetries})`)
                                setTimeout(waitForFunction, 100)
                            } else {
                                console.error('openProofUploadModal function not available after maximum retries')
                                alert('Proof upload function is not available. Please refresh the page.')
                            }
                        }
                        setTimeout(waitForFunction, 100)
                    }
                    break
                case 'resubmit':
                    console.log('Attempting to call openProofUploadModal for resubmit, function exists:', typeof window.openProofUploadModal)
                    if (typeof window.openProofUploadModal === 'function') {
                        window.openProofUploadModal(submissionId, true) // true indicates resubmit
                    } else {
                        console.error('openProofUploadModal is not a function:', typeof window.openProofUploadModal)
                        // Try to wait for the function to be available with timeout
                        let retryCount = 0
                        const maxRetries = 50 // 5 seconds max wait
                        const waitForFunction = () => {
                            retryCount++
                            if (typeof window.openProofUploadModal === 'function') {
                                console.log('Function now available, calling openProofUploadModal for resubmit')
                                window.openProofUploadModal(submissionId, true)
                            } else if (retryCount < maxRetries) {
                                console.log(`Still waiting for openProofUploadModal function... (${retryCount}/${maxRetries})`)
                                setTimeout(waitForFunction, 100)
                            } else {
                                console.error('openProofUploadModal function not available after maximum retries')
                                alert('Proof upload function is not available. Please refresh the page.')
                            }
                        }
                        setTimeout(waitForFunction, 100)
                    }
                    break
                case 'restart':
                    await restartQuest(submissionId, taskId)
                    break
                case 'view-details':
                    await showTaskDetails(taskId)
                    break
            }
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
        
        // Check if task has ended (task deadline reached)
        if (task.task_deadline && new Date() > new Date(task.task_deadline)) {
            showErrorModal('Task Ended', 'This task has ended. The task deadline has passed.')
            return
        }
        
        // Show start task modal with instructions and email input
        showStartTaskModal(task)
        
    } catch (error) {
        console.error('Error starting task:', error)
        alert('Error starting task: ' + error.message)
    }
}

// Show start task modal with instructions and email input
function showStartTaskModal(task) {
    const modalContent = `
        <div class="start-task-modal">
            <!-- Task Hero Section -->
            <div class="task-detail-hero">
                ${task.image_url ? `
                    <div class="task-detail-image">
                        <img src="${task.image_url}" alt="${task.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="task-detail-placeholder" style="display: none;">
                            <div class="placeholder-icon">
                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                                    <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                        </div>
                        <div class="task-image-overlay">
                            <div class="task-reward-badge">₱${task.reward_amount}</div>
                        </div>
                    </div>
                ` : `
                    <div class="task-detail-placeholder">
                        <div class="placeholder-icon">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                                <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <div class="task-reward-badge">₱${task.reward_amount}</div>
                    </div>
                `}
            </div>
            
            <!-- Task Header -->
            <div class="task-detail-header">
                <div class="task-title-section">
                    <h2 class="task-detail-title">${task.title}</h2>
                </div>
            </div>
            
            <!-- Task Content -->
            <div class="task-detail-content">
                <!-- Description Section -->
                <div class="task-section">
                    <h3 class="section-title">Description</h3>
                    <p class="task-description">${task.description}</p>
                </div>
                
                <!-- Instructions Section -->
                ${task.instruction ? `
                    <div class="task-section">
                        <h3 class="section-title">Instructions</h3>
                        <div class="instruction-content">
                            ${task.instruction.split('\n').map(instruction => 
                                instruction.trim() ? `<div class="instruction-item">${instruction}</div>` : ''
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Task Information Grid -->
                <div class="task-section">
                    <h3 class="section-title">Task Information</h3>
                    <div class="task-info-grid">
                        <div class="info-item">
                            <div class="info-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 0 1 0 2.828l-7 7a2 2 0 0 1-2.828 0l-7-7A1.994 1.994 0 0 1 3 12V7a4 4 0 0 1 4-4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="info-content">
                                <span class="info-label">Category</span>
                                <span class="info-value">${task.category || 'General'}</span>
                            </div>
                        </div>
                        
                        ${task.task_deadline ? `
                            <div class="info-item">
                                <div class="info-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                                        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                                        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                </div>
                                <div class="info-content">
                                    <span class="info-label">Task Deadline</span>
                                    <span class="info-value">${new Date(task.task_deadline).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${task.user_deadline ? `
                            <div class="info-item">
                                <div class="info-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                        <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                </div>
                                <div class="info-content">
                                    <span class="info-label">Time Limit</span>
                                    <span class="info-value">${task.user_deadline} hours</span>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${task.referral_required ? `
                            <div class="info-item">
                                <div class="info-icon">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2"/>
                                        <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                </div>
                                <div class="info-content">
                                    <span class="info-label">Email Required</span>
                                    <span class="info-value">Yes (${task.email_list ? task.email_list.length : 0} emails available)</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Email Input Section -->
                ${task.referral_required ? `
                    <div class="task-section">
                        <h3 class="section-title">Email Verification</h3>
                        <div class="email-input-section">
                            <p class="email-description">This task requires a specific email to start. Please enter the email you received from your referrer.</p>
                            <div class="form-group">
                                <label for="start-task-email">Referrer Email *</label>
                                <input type="email" id="start-task-email" placeholder="Enter the email from your referrer" required>
                                <small class="email-help">Contact your referrer for the specific email required for this task.</small>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `
    
    // Show modal using the existing modal system
    if (window.openModal) {
        window.openModal({
            title: 'Start Task',
            content: modalContent,
            primaryButton: {
                text: 'Start Task',
                action: () => {
                    // Prevent modal from closing by not calling closeModal here
                    handleStartTaskSubmission(task)
                }
            },
            secondaryButton: {
                text: 'Cancel',
                action: () => window.closeModal()
            },
            closable: true,
            scrollable: true
        })
    } else {
        alert(`Start Task:\n\n${task.title}\n${task.description}`)
    }
}

// Handle start task submission with email validation
async function handleStartTaskSubmission(task) {
    try {
        // Show loading state on submit button
        const submitBtn = document.querySelector('.modal-primary-btn')
        const originalText = submitBtn ? submitBtn.textContent : 'Start Task'
        
        if (submitBtn) {
            submitBtn.disabled = true
            submitBtn.innerHTML = `
                <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation: spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Validating...
            `
        }
        
        let userEmail = null
        
        // Clear any existing error messages
        clearEmailValidationErrors()
        
        // Check if email is required
        if (task.referral_required) {
            const emailInput = document.getElementById('start-task-email')
            if (!emailInput) {
                showEmailValidationError('Email input not found. Please try again.')
                resetStartTaskButton(submitBtn, originalText)
                return
            }
            
            userEmail = emailInput.value.trim()
            if (!userEmail) {
                showEmailValidationError('Email is required to start this task. Please enter the email from your referrer.')
                emailInput.focus()
                resetStartTaskButton(submitBtn, originalText)
                return
            }
            
            // Validate email against admin-set list
            const validEmails = task.email_list || []
            if (validEmails.length > 0 && !validEmails.includes(userEmail)) {
                showEmailValidationError('Invalid email. Please contact your referrer for one of the valid emails for this task.')
                emailInput.focus()
                resetStartTaskButton(submitBtn, originalText)
                return
            }
            
            // Check if email is already used for this task
            const { data: emailUsage, error: emailUsageError } = await supabaseClient
                .from('task_email_usage')
                .select('email')
                .eq('task_id', task.id)
                .eq('email', userEmail)
                .single()
            
            if (emailUsageError && emailUsageError.code !== 'PGRST116') {
                console.error('Error checking email usage:', emailUsageError)
                showEmailValidationError('Error validating email. Please try again.')
                resetStartTaskButton(submitBtn, originalText)
                return
            }
            
            if (emailUsage) {
                showEmailValidationError('This email has already been used for this task. Please contact your referrer for a different email.')
                emailInput.focus()
                resetStartTaskButton(submitBtn, originalText)
                return
            }
            
            // Store the email for later use
            task.userEnteredEmail = userEmail
        }
        
        // Update loading text for submission
        if (submitBtn) {
            submitBtn.innerHTML = `
                <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation: spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Starting Task...
            `
        }
        
        // Close the modal first
        window.closeModal()
        
        // Now proceed with the actual task start logic
        await proceedWithTaskStart(task.id)
        
    } catch (error) {
        console.error('Error in start task submission:', error)
        showEmailValidationError('Error starting task: ' + error.message)
        resetStartTaskButton(submitBtn, originalText)
    }
}

// Reset start task button to original state
function resetStartTaskButton(submitBtn, originalText) {
    if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = originalText
    }
}

// Show email validation error in the modal
function showEmailValidationError(message) {
    // Remove existing error message
    const existingError = document.getElementById('email-validation-error')
    if (existingError) {
        existingError.remove()
    }
    
    // Create error message element
    const errorDiv = document.createElement('div')
    errorDiv.id = 'email-validation-error'
    errorDiv.className = 'email-validation-error'
    errorDiv.textContent = message
    
    // Insert after the email input
    const emailInput = document.getElementById('start-task-email')
    if (emailInput) {
        emailInput.parentNode.insertBefore(errorDiv, emailInput.nextSibling)
        emailInput.style.borderColor = '#ef4444'
    }
}

// Clear email validation errors
function clearEmailValidationErrors() {
    const existingError = document.getElementById('email-validation-error')
    if (existingError) {
        existingError.remove()
    }
    
    const emailInput = document.getElementById('start-task-email')
    if (emailInput) {
        emailInput.style.borderColor = 'rgba(59, 130, 246, 0.2)'
    }
}

// Show success modal
function showSuccessModal(title, message) {
    if (window.openModal) {
        window.openModal({
            title: title,
            content: `
                <div class="success-modal-content">
                    <div class="success-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="#10b981" stroke-width="2"/>
                            <path d="M9 12L11 14L15 10" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <p class="success-message">${message}</p>
                </div>
            `,
            primaryButton: {
                text: 'OK',
                action: () => window.closeModal()
            },
            closable: true
        })
    } else {
        alert(`${title}\n\n${message}`)
    }
}

// Show error modal
function showErrorModal(title, message) {
    if (window.openModal) {
        window.openModal({
            title: title,
            content: `
                <div class="error-modal-content">
                    <div class="error-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="#ef4444" stroke-width="2"/>
                            <path d="M15 9L9 15M9 9L15 15" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <p class="error-message">${message}</p>
                </div>
            `,
            primaryButton: {
                text: 'OK',
                action: () => window.closeModal()
            },
            closable: true
        })
    } else {
        alert(`${title}\n\n${message}`)
    }
}

// Toggle instructions visibility
function toggleInstructions(button) {
    const content = button.nextElementSibling
    const svg = button.querySelector('svg')
    
    if (!content) {
        console.error('Instructions content not found')
        return
    }
    
    const isVisible = content.style.display !== 'none'
    
    if (isVisible) {
        content.style.display = 'none'
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            View Instructions
        `
    } else {
        content.style.display = 'block'
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Hide Instructions
        `
    }
}

// Get difficulty stars
function getDifficultyStars(difficulty) {
    const level = difficulty?.toLowerCase() || 'easy'
    switch (level) {
        case 'easy':
            return '⭐'
        case 'medium':
            return '⭐⭐'
        case 'hard':
            return '⭐⭐⭐'
        default:
            return '⭐'
    }
}

// Get submission count for a specific task
function getSubmissionCount(taskId) {
    return userSubmissions.filter(sub => sub.task_id === taskId).length
}


// Proceed with actual task start (moved from original startTask function)
async function proceedWithTaskStart(taskId) {
    try {
        const userId = getCurrentUserId()
        if (!userId) {
            console.error('Cannot start task: no user ID')
            return
        }
        
        // Find the task
        const task = tasks.find(t => t.id == taskId)
        if (!task) {
            console.error('Task not found:', taskId)
            return
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
            
            // Update local userSubmissions array
            const submissionIndex = userSubmissions.findIndex(sub => sub.id === existingSubmission.id)
            if (submissionIndex !== -1) {
                userSubmissions[submissionIndex] = data
            }
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
            
            // Update local userSubmissions array
            userSubmissions.push(data)
        }
        
        // Show success modal instead of alert
        showSuccessModal('Task Started Successfully!', 'Your task has been started. You can now begin working on it.')
        
        // Reload tasks
        await loadTasks()
        await renderTasks()
        
        // Start timers for the updated submission
        startTimers()
        
    } catch (error) {
        console.error('Error starting task:', error)
        showErrorModal('Error Starting Task', 'Error starting task: ' + error.message)
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
        
        // Show success modal instead of alert
        if (window.openModal) {
            window.openModal({
                title: 'Quest Restarted',
                content: `
                    <div class="modal-success-content">
                        <div class="modal-icon success">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            </svg>
                        </div>
                        <h3>Quest Restarted Successfully</h3>
                        <p>${message}</p>
                        ${newRestartCount < quest.restart_limit ? `
                            <div style="background: linear-gradient(135deg, rgba(5, 150, 105, 0.1), rgba(16, 185, 129, 0.05)); border: 1px solid rgba(5, 150, 105, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #059669; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon info-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">Restarts used: ${newRestartCount}/${quest.restart_limit}</span>
                                </p>
                            </div>
                        ` : `
                            <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.05)); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #d97706; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon warning-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">This quest is now exhausted and cannot be restarted again.</span>
                                </p>
                            </div>
                        `}
                    </div>
                `,
                primaryButton: { text: 'OK', action: () => window.closeModal() },
                closable: true
            })
        } else {
        alert(message)
        }
        
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
window.toggleInstructions = toggleInstructions
