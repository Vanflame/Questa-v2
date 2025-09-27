// Admin Tasks Module
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Global variables
let allTasks = []

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

// Load all tasks
async function loadTasks() {
    try {
        console.log('Loading tasks...')
        
        const { data: tasksData, error: tasksError } = await supabaseClient
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (tasksError) {
            console.error('Error loading tasks:', tasksError)
            allTasks = []
        } else {
            allTasks = tasksData || []
        }
        
        console.log('Tasks loaded:', allTasks.length)
        
    } catch (error) {
        console.error('Error loading tasks:', error)
        allTasks = []
    }
}

// Render tasks list in card layout
function renderTasks() {
    try {
        const tasksList = document.getElementById('tasks-list')
        if (!tasksList) {
            console.error('tasks-list element not found')
            return
        }
        
        if (allTasks.length === 0) {
            tasksList.innerHTML = `
                <div class="admin-empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <h3>No Tasks Found</h3>
                    <p>Create your first task to get started</p>
                </div>
            `
            return
        }
        
        console.log('Rendering tasks:', allTasks.length)
    
    tasksList.innerHTML = `
        <div class="admin-tasks-grid">
                ${allTasks.map(task => `
                <div class="admin-task-card">
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
                                <span class="task-banner-badge status ${task.status.toLowerCase()}">${task.status.toUpperCase()}</span>
                                <span class="task-banner-badge category">${task.category || 'General'}</span>
                                <span class="task-banner-badge time-limit">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                        <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    ${task.user_deadline || 'No limit'}h
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
                                <span class="task-banner-badge status ${task.status.toLowerCase()}">${task.status.toUpperCase()}</span>
                                <span class="task-banner-badge category">${task.category || 'General'}</span>
                                <span class="task-banner-badge time-limit">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                        <polyline points="12,6 12,12 16,14" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                    ${task.user_deadline || 'No limit'}h
                                </span>
                            </div>
                        </div>
                    `}
                    
                    <!-- Title & Reward Row -->
                    <div class="task-header">
                        <div class="task-title-row">
                            <h3 class="task-title">${task.title}</h3>
                            <div class="task-reward-badge">
                                <svg class="task-reward-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                                </svg>
                                <span>₱${parseFloat(task.reward_amount).toFixed(2)}</span>
                            </div>
                        </div>
                        
                        <div class="task-badges-row">
                            <span class="task-difficulty-badge difficulty-${task.difficulty?.toLowerCase() || 'easy'}">${getDifficultyStars(task.difficulty)} ${task.difficulty || 'Easy'}</span>
                            <span class="task-category-badge">${task.category || 'General'}</span>
                        </div>
                    </div>
                    
                    <div class="task-card-body">
                        <p class="task-description">${task.description || 'No description provided'}</p>
                        
                        <div class="task-details">
                            <div class="detail-item">
                                <span class="detail-label">Category:</span>
                                <span class="detail-value">${task.category || 'General'}</span>
                            </div>
                            
                            <div class="detail-item">
                                <span class="detail-label">Email Required:</span>
                                <span class="detail-value">${task.referral_required ? `Yes (${task.email_list ? task.email_list.length : 0} emails)` : 'No'}</span>
                            </div>
                            
                            ${task.task_deadline ? `
                                <div class="detail-item">
                                    <span class="detail-label">Task Deadline:</span>
                                    <span class="detail-value">${new Date(task.task_deadline).toLocaleDateString()}</span>
                                </div>
                            ` : ''}
                            
                            ${task.user_deadline ? `
                                <div class="detail-item">
                                    <span class="detail-label">User Time Limit:</span>
                                    <span class="detail-value">${task.user_deadline} hours</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="task-card-actions">
                        <button class="admin-btn admin-btn-sm admin-btn-info" data-action="view-task" data-task-id="${task.id}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/>
                                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                            </svg>
                                View
                            </button>
                        <button class="admin-btn admin-btn-sm admin-btn-warning" data-action="toggle-task" data-task-id="${task.id}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z" stroke="currentColor" stroke-width="2"/>
                            </svg>
                                ${task.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                        <button class="admin-btn admin-btn-sm admin-btn-secondary" data-action="edit-task" data-task-id="${task.id}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                                Edit
                            </button>
                        <button class="admin-btn admin-btn-sm admin-btn-danger" data-action="delete-task" data-task-id="${task.id}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                                Delete
                            </button>
                    </div>
                </div>
                `).join('')}
        </div>
    `
    
        // Attach event listeners after rendering
        setTimeout(() => {
            attachTaskEventListeners()
        }, 100)
        
    } catch (error) {
        console.error('Error rendering tasks:', error)
        console.error('Error type:', typeof error)
        console.error('Error message:', error?.message)
        console.error('Error stack:', error?.stack)
        
        const tasksList = document.getElementById('tasks-list')
        if (tasksList) {
            tasksList.innerHTML = `
                <div class="admin-error-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <h3>Error Rendering Tasks</h3>
                    <p>There was an error displaying the tasks. Please refresh the page.</p>
                    <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.375rem; cursor: pointer; margin-top: 1rem;">
                        Refresh Page
                    </button>
                </div>
            `
        }
    }
}

// Show create task modal
function showCreateTaskModal() {
    console.log('showCreateTaskModal called')
    if (window.openModal) {
        window.openModal({
            title: 'Create New Task',
            content: `
                <div class="modal-form-content">
                    <form id="create-task-modal-form" onsubmit="return false;">
                        <div class="form-group">
                            <label for="modal-task-title">Title *</label>
                            <input type="text" id="modal-task-title" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="modal-task-reward">Reward Amount (₱) *</label>
                            <input type="number" id="modal-task-reward" min="0" step="0.01" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="modal-task-description">Description *</label>
                            <textarea id="modal-task-description" rows="3" required></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="modal-task-instruction">Instructions</label>
                            <textarea id="modal-task-instruction" rows="3" placeholder="Detailed step-by-step instructions for completing this task"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="modal-task-image-url">Task Image URL (Optional)</label>
                            <input type="url" id="modal-task-image-url" placeholder="https://example.com/task-image.jpg" onchange="previewModalTaskImage()">
                            <small>Enter a URL to an image that represents this task. This will be shown on the dashboard.</small>
                            <div id="modal-task-image-preview" style="display: none; margin-top: 8px;">
                                <img id="modal-preview-img" src="" alt="Task Image Preview" style="max-width: 100%; height: auto; border-radius: 8px;">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="modal-task-difficulty">Difficulty *</label>
                                <select id="modal-task-difficulty" required>
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="modal-task-category">Category</label>
                                <input type="text" id="modal-task-category" placeholder="e.g., Social Media, Content Creation">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="modal-task-deadline">Task Deadline</label>
                                <input type="datetime-local" id="modal-task-deadline">
                            </div>
                            
                            <div class="form-group">
                                <label for="modal-user-deadline">User Time Limit (Hours)</label>
                                <input type="number" id="modal-user-deadline" min="1" max="168" placeholder="e.g., 2 for 2 hours">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="modal-task-restart-limit">Restart Limit</label>
                                <input type="number" id="modal-task-restart-limit" min="0" value="3">
                            </div>
                            
                            <div class="form-group">
                                <label for="modal-referral-required">Email Required</label>
                                <select id="modal-referral-required" onchange="toggleModalReferralEmail()">
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group" id="modal-referral-email-group" style="display: none;">
                            <label for="modal-email-list">Valid Emails (One per line)</label>
                            <textarea id="modal-email-list" rows="4" placeholder="Enter valid emails, one per line:&#10;user1@example.com&#10;user2@example.com&#10;user3@example.com"></textarea>
                            <small>Users must get one of these emails from their referrer to start this task.</small>
                        </div>
                        
                        <div id="create-task-error" class="error-message" style="display: none;"></div>
                    </form>
                </div>
            `,
            primaryButton: { 
                text: 'Create Task', 
                action: async () => {
                    console.log('Create Task button clicked')
                    try {
                        const title = document.getElementById('modal-task-title').value.trim()
                        const description = document.getElementById('modal-task-description').value.trim()
                        const instruction = document.getElementById('modal-task-instruction').value.trim()
                        const reward = document.getElementById('modal-task-reward').value
                        const difficulty = document.getElementById('modal-task-difficulty').value
                        const category = document.getElementById('modal-task-category').value.trim()
                        const taskDeadline = document.getElementById('modal-task-deadline').value
                        const userDeadlineHours = document.getElementById('modal-user-deadline').value
                        const restartLimit = document.getElementById('modal-task-restart-limit').value
                        const referralRequired = document.getElementById('modal-referral-required').value === 'true'
                        const emailListText = document.getElementById('modal-email-list').value
                        const emailList = emailListText ? emailListText.split('\n').map(email => email.trim()).filter(email => email) : []
                        const imageUrl = document.getElementById('modal-task-image-url').value.trim()
        
                    // Clear any previous errors
                    document.getElementById('create-task-error').style.display = 'none'
        
                    // Validation
                    if (!title || !description || !reward || !difficulty) {
                        document.getElementById('create-task-error').textContent = 'Please fill in all required fields'
                        document.getElementById('create-task-error').style.display = 'block'
                        return false // Don't close modal
                    }
                    
                    if (isNaN(parseFloat(reward)) || parseFloat(reward) < 0) {
                        document.getElementById('create-task-error').textContent = 'Please enter a valid reward amount'
                        document.getElementById('create-task-error').style.display = 'block'
                        return false // Don't close modal
                    }
                    
                    if (isNaN(parseInt(restartLimit)) || parseInt(restartLimit) < 0) {
                        document.getElementById('create-task-error').textContent = 'Please enter a valid restart limit'
                        document.getElementById('create-task-error').style.display = 'block'
                        return false // Don't close modal
                    }
                    
                    if (referralRequired && emailList.length === 0) {
                        document.getElementById('create-task-error').textContent = 'Please add at least one valid email when email requirement is enabled'
                        document.getElementById('create-task-error').style.display = 'block'
                        return false // Don't close modal
                    }
                    
                    // Show loading state
                    const submitBtn = document.querySelector('.modal-primary-btn')
                    if (submitBtn) {
                        submitBtn.disabled = true
                        submitBtn.textContent = 'Creating Task...'
                    }
                    
                    try {
                        // Proceed with creation
                        await createTask(title, description, instruction, reward, difficulty, category, taskDeadline, userDeadlineHours, restartLimit, referralRequired, emailList, imageUrl)
                        return true // Close modal on success
                    } catch (error) {
                        console.error('Error in task creation:', error)
                        document.getElementById('create-task-error').textContent = 'Error creating task: ' + error.message
                        document.getElementById('create-task-error').style.display = 'block'
                        
                        // Reset button state
                        if (submitBtn) {
                            submitBtn.disabled = false
                            submitBtn.textContent = 'Create Task'
                        }
                        return false // Don't close modal on error
                    }
                } catch (error) {
                    console.error('Error in modal action:', error)
                    return false // Don't close modal on error
                }
            }
        },
        closable: true
        })
    } else {
        alert('Modal system not available')
    }
}

// Create new task function (updated to accept parameters)
async function createTask(title, description, instruction, reward, difficulty, category, taskDeadline, userDeadlineHours, restartLimit, referralRequired, emailList, imageUrl) {
    try {
        
        if (!title || !description || !reward || !difficulty) {
            if (window.openModal) {
                window.openModal({
                    title: 'Validation Error',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Missing Required Fields</h3>
                            <p>Please fill in all required fields to create a task.</p>
                            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">Required fields: Title, Description, Reward Amount, and Difficulty</span>
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: { text: 'Got It', action: () => window.closeModal() },
                    closable: true
                })
            } else {
            alert('Please fill in all required fields')
            }
            return
        }
        
        if (referralRequired && emailList.length === 0) {
            if (window.openModal) {
                window.openModal({
                    title: 'Email Requirement Error',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Email List Required</h3>
                            <p>When email requirement is enabled, you must provide at least one valid email address.</p>
                            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">Add email addresses in the Email List field, one per line</span>
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: { text: 'Got It', action: () => window.closeModal() },
                    closable: true
                })
            } else {
            alert('Please add at least one valid email when email requirement is enabled')
            }
            return
        }
        
        console.log('Creating task:', { title, description, instruction, reward, difficulty, category, taskDeadline, userDeadlineHours, restartLimit, referralRequired, emailList, imageUrl })
        
        const { data: taskData, error: taskError } = await supabaseClient
            .from('tasks')
            .insert({
                title: title,
                description: description,
                instruction: instruction,
                reward_amount: reward,
                difficulty: difficulty,
                category: category || 'General',
                task_deadline: taskDeadline || null,
                user_deadline: userDeadlineHours ? parseInt(userDeadlineHours) : null,
                restart_limit: restartLimit || 0,
                referral_required: referralRequired,
                email_list: emailList,
                image_url: imageUrl || null,
                status: 'active',
                created_at: new Date().toISOString()
            })
            .select()
            .single()
        
        if (taskError) {
            console.error('Error creating task:', taskError)
            if (window.openModal) {
                window.openModal({
                    title: 'Task Creation Failed',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Failed to Create Task</h3>
                            <p>There was an error creating the task. Please try again.</p>
                            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">Error: ${taskError.message}</span>
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: { text: 'Try Again', action: () => window.closeModal() },
                    closable: true
                })
            } else {
            alert('Error creating task: ' + taskError.message)
            }
            return
        }
        
        console.log('Task created successfully:', taskData)
        
        // Show success message in the form instead of a separate modal
        const errorElement = document.getElementById('create-task-error')
        if (errorElement) {
            errorElement.style.display = 'block'
            errorElement.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))'
            errorElement.style.border = '1px solid rgba(16, 185, 129, 0.2)'
            errorElement.style.color = '#064e3b'
            errorElement.textContent = `Task "${title}" created successfully!`
        }
        
        // Reset form
        const form = document.getElementById('create-task-modal-form')
        if (form) {
            form.reset()
        }
        
        // Reload tasks
        await loadTasks()
        renderTasks()
        attachTaskEventListeners()
        
    } catch (error) {
        console.error('Error creating task:', error)
        console.error('Error type:', typeof error)
        console.error('Error message:', error?.message)
        console.error('Error stack:', error?.stack)
        
        const errorMessage = error?.message || error?.toString() || 'Unknown error occurred'
        alert('Error creating task: ' + errorMessage)
    }
}

// Toggle task status (active/inactive)
async function toggleTaskStatus(taskId) {
    try {
        console.log('Toggling task status:', taskId)
        console.log('Current allTasks:', allTasks)
        
        // First try to find task in current array
        let task = allTasks.find(t => t.id == taskId) // Use == for type coercion
        
        // If not found, try to fetch from database
        if (!task) {
            console.log('Task not found in array, fetching from database...')
            const { data: taskData, error: fetchError } = await supabaseClient
                .from('tasks')
                .select('*')
                .eq('id', taskId)
                .single()
            
            if (fetchError || !taskData) {
                console.error('Error fetching task:', fetchError)
                if (window.openModal) {
                    window.openModal({
                        title: 'Task Not Found',
                        content: `
                            <div class="modal-error-content">
                                <div class="modal-icon error">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                </div>
                                <h3>Task Not Found</h3>
                                <p>The task could not be found in the database.</p>
                                <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                    <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                        <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                        <span style="text-align: left;">The task may have been deleted or there was a database error</span>
                                    </p>
                                </div>
                            </div>
                        `,
                        primaryButton: { text: 'OK', action: () => window.closeModal() },
                        closable: true
                    })
                } else {
                alert('Task not found in database')
                }
                return
            }
            task = taskData
        }
        
        const newStatus = task.status === 'active' ? 'inactive' : 'active'
        console.log('Current status:', task.status, 'New status:', newStatus)
        
        const { error } = await supabaseClient
            .from('tasks')
            .update({ status: newStatus })
            .eq('id', taskId)
        
        if (error) {
            console.error('Error updating task status:', error)
            if (window.openModal) {
                window.openModal({
                    title: 'Update Failed',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Failed to Update Task</h3>
                            <p>There was an error updating the task status.</p>
                            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">Error: ${error.message}</span>
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: { text: 'Try Again', action: () => window.closeModal() },
                    closable: true
                })
            } else {
            alert('Error updating task status: ' + error.message)
            }
            return
        }
        
        console.log('Task status updated successfully')
        if (window.openModal) {
            window.openModal({
                title: 'Task Status Updated',
                content: `
                    <div class="modal-success-content">
                        <div class="modal-icon success">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h3>Task ${newStatus === 'active' ? 'Activated' : 'Deactivated'}!</h3>
                        <p>The task has been ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.</p>
                        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05)); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #064e3b; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon email-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">${newStatus === 'active' ? 'Users can now see and participate in this task' : 'This task is now hidden from users'}</span>
                            </p>
                        </div>
                    </div>
                `,
                primaryButton: { text: 'Great!', action: () => window.closeModal() },
                closable: true
            })
        } else {
        alert(`Task ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`)
        }
        
        // Reload tasks
        await loadTasks()
        renderTasks()
        attachTaskEventListeners()
        
    } catch (error) {
        console.error('Error toggling task status:', error)
        if (window.openModal) {
            window.openModal({
                title: 'Unexpected Error',
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
                        <p>An unexpected error occurred while updating the task status.</p>
                        <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">Error: ${error.message}</span>
                            </p>
                        </div>
                    </div>
                `,
                primaryButton: { text: 'OK', action: () => window.closeModal() },
                closable: true
            })
        } else {
        alert('Error updating task status: ' + error.message)
        }
    }
}

// Edit task
async function editTask(taskId) {
    try {
        console.log('Editing task:', taskId)
        console.log('Current allTasks:', allTasks)
        
        // First try to find task in current array
        let task = allTasks.find(t => t.id == taskId) // Use == for type coercion
        
        // If not found, try to fetch from database
        if (!task) {
            console.log('Task not found in array, fetching from database...')
            const { data: taskData, error: fetchError } = await supabaseClient
                .from('tasks')
                .select('*')
                .eq('id', taskId)
                .single()
            
            if (fetchError || !taskData) {
                console.error('Error fetching task:', fetchError)
                if (window.openModal) {
                    window.openModal({
                        title: 'Task Not Found',
                        content: `
                            <div class="modal-error-content">
                                <div class="modal-icon error">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                </div>
                                <h3>Task Not Found</h3>
                                <p>The task could not be found in the database.</p>
                                <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                    <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                        <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                        <span style="text-align: left;">The task may have been deleted or there was a database error</span>
                                    </p>
                                </div>
                            </div>
                        `,
                        primaryButton: { text: 'OK', action: () => window.closeModal() },
                        closable: true
                    })
                } else {
                alert('Task not found in database')
                }
                return
            }
            task = taskData
        }
        
        // Show edit task modal
        if (window.openModal) {
            window.openModal({
                title: 'Edit Task',
                content: `
                    <div class="modal-form-content">
                        <form id="edit-task-modal-form" style="display: flex; flex-direction: column; gap: 16px;">
                            <div class="form-group">
                                <label for="edit-task-title">Task Title *</label>
                                <input type="text" id="edit-task-title" value="${task.title}" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-task-description">Description *</label>
                                <textarea id="edit-task-description" rows="3" required>${task.description}</textarea>
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-task-reward">Reward Amount (₱) *</label>
                                <input type="number" id="edit-task-reward" value="${task.reward_amount}" min="0" step="0.01" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-task-category">Category</label>
                                <input type="text" id="edit-task-category" value="${task.category || 'General'}">
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-task-restart-limit">Restart Limit</label>
                                <input type="number" id="edit-task-restart-limit" value="${task.restart_limit || 0}" min="0">
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-task-image-url">Image URL (Optional)</label>
                                <input type="url" id="edit-task-image-url" value="${task.image_url || ''}" placeholder="https://example.com/image.jpg">
                            </div>
                            
                            <div id="edit-task-error" class="error-message" style="display: none;"></div>
                        </form>
                    </div>
                `,
                primaryButton: { 
                    text: 'Update Task', 
                    action: () => {
                        const title = document.getElementById('edit-task-title').value.trim()
                        const description = document.getElementById('edit-task-description').value.trim()
                        const reward = document.getElementById('edit-task-reward').value
                        const category = document.getElementById('edit-task-category').value.trim()
                        const restartLimit = document.getElementById('edit-task-restart-limit').value
                        const imageUrl = document.getElementById('edit-task-image-url').value.trim()
                        
                        // Validation
                        if (!title || !description || !reward) {
                            document.getElementById('edit-task-error').textContent = 'Please fill in all required fields'
                            document.getElementById('edit-task-error').style.display = 'block'
                            return
                        }
                        
                        if (isNaN(parseFloat(reward)) || parseFloat(reward) < 0) {
                            document.getElementById('edit-task-error').textContent = 'Please enter a valid reward amount'
                            document.getElementById('edit-task-error').style.display = 'block'
                            return
                        }
                        
                        if (isNaN(parseInt(restartLimit)) || parseInt(restartLimit) < 0) {
                            document.getElementById('edit-task-error').textContent = 'Please enter a valid restart limit'
                            document.getElementById('edit-task-error').style.display = 'block'
                            return
                        }
                        
                        // Proceed with update
                        window.closeModal()
                        updateTask(taskId, title, description, reward, category, restartLimit, imageUrl)
                    }
                },
                secondaryButton: { text: 'Cancel', action: () => window.closeModal() },
                closable: true
            })
        } else {
            // Fallback to prompts
        const newTitle = prompt('Enter new title:', task.title)
        if (!newTitle) return
        
        const newDescription = prompt('Enter new description:', task.description)
        if (!newDescription) return
        
        const newReward = prompt('Enter new reward amount:', task.reward_amount)
        if (!newReward || isNaN(parseFloat(newReward))) {
            alert('Invalid reward amount')
            return
        }
        
        const newCategory = prompt('Enter new category:', task.category || 'General')
        const newRestartLimit = prompt('Enter new restart limit:', task.restart_limit || 0)
        if (!newRestartLimit || isNaN(parseInt(newRestartLimit))) {
            alert('Invalid restart limit')
            return
        }
        
            const newImageUrl = prompt('Enter new image URL (optional):', task.image_url || '')
            
            updateTask(taskId, newTitle, newDescription, newReward, newCategory, newRestartLimit, newImageUrl)
        }
        
    } catch (error) {
        console.error('Error updating task:', error)
        if (window.openModal) {
            window.openModal({
                title: 'Unexpected Error',
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
                        <p>An unexpected error occurred while updating the task.</p>
                        <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">Error: ${error.message}</span>
                            </p>
                        </div>
                    </div>
                `,
                primaryButton: { text: 'OK', action: () => window.closeModal() },
                closable: true
            })
        } else {
            alert('Error updating task: ' + error.message)
        }
    }
}

// Update task function (separated for reusability)
async function updateTask(taskId, title, description, reward, category, restartLimit, imageUrl) {
    try {
        console.log('Updating task with new values:', {
            title, description, reward, category, restartLimit, imageUrl
        })
        
        const { error } = await supabaseClient
            .from('tasks')
            .update({
                title: title,
                description: description,
                reward_amount: parseFloat(reward),
                category: category,
                restart_limit: parseInt(restartLimit),
                image_url: imageUrl || null
            })
            .eq('id', taskId)
        
        if (error) {
            console.error('Error updating task:', error)
            if (window.openModal) {
                window.openModal({
                    title: 'Update Failed',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Failed to Update Task</h3>
                            <p>There was an error updating the task.</p>
                            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">Error: ${error.message}</span>
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: { text: 'Try Again', action: () => window.closeModal() },
                    closable: true
                })
            } else {
            alert('Error updating task: ' + error.message)
            }
            return
        }
        
        console.log('Task updated successfully')
        if (window.openModal) {
            window.openModal({
                title: 'Task Updated Successfully',
                content: `
                    <div class="modal-success-content">
                        <div class="modal-icon success">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h3>Task Updated!</h3>
                        <p>The task "<strong>${title}</strong>" has been updated successfully.</p>
                        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05)); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #064e3b; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon email-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">All changes have been saved and are now active</span>
                            </p>
                        </div>
                    </div>
                `,
                primaryButton: { text: 'Great!', action: () => window.closeModal() },
                closable: true
            })
        } else {
        alert('Task updated successfully!')
        }
        
        // Create notification for all users about task update
        try {
            const { data: allUsers } = await supabaseClient
                .from('profiles')
                .select('id')
                .eq('role', 'user')
            
            if (allUsers && allUsers.length > 0) {
                const notifications = allUsers.map(user => ({
                    user_id: user.id,
                    title: 'Task Updated',
                    message: `The task "${title}" has been updated. Check it out!`,
                    type: 'info',
                    is_read: false,
                    created_at: new Date().toISOString()
                }))
                
                await supabaseClient
                    .from('notifications')
                    .insert(notifications)
            }
        } catch (notificationError) {
            console.error('Error creating notifications:', notificationError)
        }
        
        // Reload tasks
        await loadTasks()
        renderTasks()
        attachTaskEventListeners()
        
    } catch (error) {
        console.error('Error updating task:', error)
        if (window.openModal) {
            window.openModal({
                title: 'Unexpected Error',
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
                        <p>An unexpected error occurred while updating the task.</p>
                        <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">Error: ${error.message}</span>
                            </p>
                        </div>
                    </div>
                `,
                primaryButton: { text: 'OK', action: () => window.closeModal() },
                closable: true
            })
        } else {
        alert('Error updating task: ' + error.message)
        }
    }
}

// Delete task
async function deleteTask(taskId) {
    try {
        console.log('Deleting task:', taskId)
        console.log('Current allTasks:', allTasks)
        
        // First try to find task in current array
        let task = allTasks.find(t => t.id == taskId) // Use == for type coercion
        
        // If not found, try to fetch from database
        if (!task) {
            console.log('Task not found in array, fetching from database...')
            const { data: taskData, error: fetchError } = await supabaseClient
                .from('tasks')
                .select('*')
                .eq('id', taskId)
                .single()
            
            if (fetchError || !taskData) {
                console.error('Error fetching task:', fetchError)
                if (window.openModal) {
                    window.openModal({
                        title: 'Task Not Found',
                        content: `
                            <div class="modal-error-content">
                                <div class="modal-icon error">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                </div>
                                <h3>Task Not Found</h3>
                                <p>The task could not be found in the database.</p>
                                <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                    <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                        <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                        <span style="text-align: left;">The task may have been deleted or there was a database error</span>
                                    </p>
                                </div>
                            </div>
                        `,
                        primaryButton: { text: 'OK', action: () => window.closeModal() },
                        closable: true
                    })
                } else {
                alert('Task not found in database')
                }
                return
            }
            task = taskData
        }
        
        // Show confirmation modal instead of browser confirm
        if (window.openModal) {
            window.openModal({
                title: 'Confirm Task Deletion',
                content: `
                    <div class="modal-warning-content">
                        <div class="modal-icon warning">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h3>Delete "${task.title}"?</h3>
                        <p>Are you sure you want to delete this task? This action cannot be undone.</p>
                        <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05)); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #92400e; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">This will permanently remove the task and all associated data</span>
                            </p>
                        </div>
                    </div>
                `,
                primaryButton: { text: 'Cancel', action: () => window.closeModal() },
                secondaryButton: { 
                    text: 'Delete Task', 
                    action: () => {
                        window.closeModal()
                        // Continue with deletion after modal closes
                        setTimeout(() => proceedWithDeletion(), 300)
                    }
                },
                closable: true
            })
            return
        } else {
        const confirmDelete = confirm(`Are you sure you want to delete the task "${task.title}"? This action cannot be undone.`)
        if (!confirmDelete) return
        }
        
        // Function to proceed with deletion
        async function proceedWithDeletion() {
        console.log('Deleting task:', taskId)
        
        const { error } = await supabaseClient
            .from('tasks')
            .delete()
            .eq('id', taskId)
        
        if (error) {
            console.error('Error deleting task:', error)
                if (window.openModal) {
                    window.openModal({
                        title: 'Deletion Failed',
                        content: `
                            <div class="modal-error-content">
                                <div class="modal-icon error">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                    </svg>
                                </div>
                                <h3>Failed to Delete Task</h3>
                                <p>There was an error deleting the task.</p>
                                <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                    <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                        <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                        <span style="text-align: left;">Error: ${error.message}</span>
                                    </p>
                                </div>
                            </div>
                        `,
                        primaryButton: { text: 'Try Again', action: () => window.closeModal() },
                        closable: true
                    })
                } else {
            alert('Error deleting task: ' + error.message)
                }
            return
        }
        
        console.log('Task deleted successfully')
            if (window.openModal) {
                window.openModal({
                    title: 'Task Deleted Successfully',
                    content: `
                        <div class="modal-success-content">
                            <div class="modal-icon success">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <polyline points="22,4 12,14.01 9,11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <h3>Task Deleted!</h3>
                            <p>The task "<strong>${task.title}</strong>" has been permanently deleted.</p>
                            <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05)); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #064e3b; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon email-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">The task has been removed from the system</span>
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: { text: 'OK', action: () => window.closeModal() },
                    closable: true
                })
            } else {
        alert('Task deleted successfully!')
            }
        
        // Reload tasks
        await loadTasks()
        renderTasks()
        attachTaskEventListeners()
        }
        
    } catch (error) {
        console.error('Error deleting task:', error)
        if (window.openModal) {
            window.openModal({
                title: 'Unexpected Error',
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
                        <p>An unexpected error occurred while deleting the task.</p>
                        <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                            <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                <span style="text-align: left;">Error: ${error.message}</span>
                            </p>
                        </div>
                    </div>
                `,
                primaryButton: { text: 'OK', action: () => window.closeModal() },
                closable: true
            })
        } else {
        alert('Error deleting task: ' + error.message)
        }
    }
}

// View task details
async function viewTask(taskId) {
    const task = allTasks.find(t => t.id == taskId)
    if (!task) {
            if (window.openModal) {
                window.openModal({
                    title: 'Task Not Found',
                    content: `
                        <div class="modal-error-content">
                            <div class="modal-icon error">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                                </svg>
                            </div>
                            <h3>Task Not Found</h3>
                            <p>The task could not be found in the current task list.</p>
                            <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 12px; margin: 16px 0; text-align: left;">
                                <p style="color: #dc2626; font-weight: 500; font-size: 0.875rem; line-height: 1.5; margin: 0; display: flex; align-items: flex-start; gap: 6px; text-align: left;">
                                    <span class="custom-icon search-icon" style="margin-top: 1px; flex-shrink: 0;"></span> 
                                    <span style="text-align: left;">Please refresh the page and try again</span>
                                </p>
                            </div>
                        </div>
                    `,
                    primaryButton: { text: 'OK', action: () => window.closeModal() },
                    closable: true
                })
            } else {
        alert('Task not found')
            }
        return
    }
    
    let emailInfo = '\nNo email requirement'
    if (task.referral_required) {
        const totalEmails = task.email_list ? task.email_list.length : 0
        emailInfo = `\nValid Emails (${totalEmails}):\n${task.email_list ? task.email_list.join('\n') : 'None set'}`
        
        // Show email usage status from actual submissions
        if (totalEmails > 0) {
            emailInfo += '\n\nEmail Usage Status:'
            
            // Fetch submissions for this task to see which emails were used
            const { data: submissions, error: submissionsError } = await supabaseClient
                .from('task_submissions')
                .select(`
                    email_used, 
                    user_id, 
                    created_at, 
                    status
                `)
                .eq('task_id', taskId)
                .not('email_used', 'is', null)
            
            console.log('Task view - submissions data:', { submissions, submissionsError, taskId })
            
            if (!submissionsError && submissions && submissions.length > 0) {
                // Get unique user IDs from submissions
                const userIds = [...new Set(submissions.map(sub => sub.user_id))]
                console.log('User IDs to fetch:', userIds)
                
                // Fetch user profiles for all users
                let userProfiles = null
                let profilesError = null
                
                if (userIds.length > 0) {
                    // First, let's check what columns exist in the profiles table
                    const { data, error } = await supabaseClient
                        .from('profiles')
                        .select('*')
                        .in('id', userIds)
                        .limit(1)
                    
                    if (error) {
                        console.error('Error checking profiles table structure:', error)
                        // Try with just basic columns that should exist
                        const { data: basicData, error: basicError } = await supabaseClient
                            .from('profiles')
                            .select('id, email')
                            .in('id', userIds)
                        
                        if (basicError) {
                            console.error('Even basic profile fetch failed:', basicError)
                            userProfiles = []
                            profilesError = basicError
                        } else {
                            // Map the basic data to include username and full_name from email
                            userProfiles = basicData.map(profile => ({
                                id: profile.id,
                                email: profile.email,
                                username: profile.email ? profile.email.split('@')[0] : 'user',
                                full_name: profile.email ? profile.email.split('@')[0] : 'User'
                            }))
                            profilesError = null
                        }
                    } else {
                        // Success - we can see the table structure
                        console.log('Profiles table structure sample:', data[0])
                        
                        // Now fetch with available columns
                        const { data: profileData, error: profileError } = await supabaseClient
                            .from('profiles')
                            .select('id, email')
                            .in('id', userIds)
                        
                        if (profileError) {
                            console.error('Profile fetch failed:', profileError)
                            userProfiles = []
                            profilesError = profileError
                        } else {
                            // Map the data to include username and full_name from email
                            userProfiles = profileData.map(profile => ({
                                id: profile.id,
                                email: profile.email,
                                username: profile.email ? profile.email.split('@')[0] : 'user',
                                full_name: profile.email ? profile.email.split('@')[0] : 'User'
                            }))
                            profilesError = null
                        }
                    }
                }
                
                console.log('User profiles data:', { userProfiles, profilesError, userIds })
                
                // Create a map of user profiles for quick lookup
                const userProfileMap = {}
                if (!profilesError && userProfiles) {
                    userProfiles.forEach(profile => {
                        userProfileMap[profile.id] = profile
                    })
                }
                
                // Debug: Check specific user ID that's showing as Unknown
                const specificUserId = '058f9da8-34b8-4b89-82b8-01cb7df5ff56'
                console.log('Checking specific user ID:', specificUserId)
                console.log('User profile for specific ID:', userProfileMap[specificUserId])
                
                // Since username and full_name columns don't exist in the database,
                // we'll just use the email prefix for display purposes
                console.log('Using email prefixes for username and full_name display')
                
                // Group by email to show usage count and user info
                const emailUsage = {}
                submissions.forEach(sub => {
                    if (sub.email_used) {
                        if (!emailUsage[sub.email_used]) {
                            emailUsage[sub.email_used] = {
                                count: 0,
                                lastUsed: sub.created_at,
                                status: sub.status,
                                users: []
                            }
                        }
                        emailUsage[sub.email_used].count++
                        if (new Date(sub.created_at) > new Date(emailUsage[sub.email_used].lastUsed)) {
                            emailUsage[sub.email_used].lastUsed = sub.created_at
                        }
                        
                        // Add user info if not already added
                        const userProfile = userProfileMap[sub.user_id]
                        const userInfo = {
                            username: userProfile?.username || 'Unknown',
                            full_name: userProfile?.full_name || 'Unknown User',
                            email: userProfile?.email || 'No email',
                            user_id: sub.user_id,
                            used_at: sub.created_at,
                            status: sub.status
                        }
                        
                        // Check if this user already used this email
                        const existingUser = emailUsage[sub.email_used].users.find(u => u.user_id === sub.user_id)
                        if (!existingUser) {
                            emailUsage[sub.email_used].users.push(userInfo)
                        } else {
                            // Update the most recent usage
                            if (new Date(sub.created_at) > new Date(existingUser.used_at)) {
                                existingUser.used_at = sub.created_at
                                existingUser.status = sub.status
                            }
                        }
                    }
                })
                
                // Store email usage data globally for modal access
                window.currentTaskEmailUsage = emailUsage
                console.log('Processed email usage data:', emailUsage)
                
                // Show which emails from the list were used
                for (const email of task.email_list) {
                    if (emailUsage[email]) {
                        const usage = emailUsage[email]
                        const usedDate = new Date(usage.lastUsed).toLocaleDateString()
                        emailInfo += `\n- ${email}: USED (${usage.count}x, last: ${usedDate})`
                    } else {
                        emailInfo += `\n- ${email}: Available`
                    }
                }
                
                // Show any other emails that were used but not in the list
                const usedEmails = Object.keys(emailUsage)
                const unlistedEmails = usedEmails.filter(email => !task.email_list.includes(email))
                if (unlistedEmails.length > 0) {
                    emailInfo += '\n\nOther emails used (not in valid list):'
                    unlistedEmails.forEach(email => {
                        const usage = emailUsage[email]
                        const usedDate = new Date(usage.lastUsed).toLocaleDateString()
                        emailInfo += `\n- ${email}: USED (${usage.count}x, last: ${usedDate})`
                    })
                }
            } else {
                // Fallback if can't fetch submission data
                window.currentTaskEmailUsage = {}
                for (const email of task.email_list) {
                    emailInfo += `\n- ${email}: Available`
                }
            }
        }
    }
    
    if (window.openModal) {
        window.openModal({
            title: 'Task Details',
            content: `
                <div class="modal-task-details">
                    <div class="task-detail-header">
                        <div class="task-detail-image">
                            ${task.image_url ? 
                                `<img src="${task.image_url}" alt="${task.title}" class="task-detail-thumbnail" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                 <div class="task-detail-placeholder" style="display: none;">
                                     <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                         <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                         <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                                         <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
                                     </svg>
                                 </div>` : 
                                `<div class="task-detail-placeholder">
                                     <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                         <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                                         <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                                         <polyline points="21,15 16,10 5,21" stroke="currentColor" stroke-width="2"/>
                                     </svg>
                                 </div>`
                            }
                        </div>
                        <div class="task-detail-info">
                            <h3 class="task-detail-title">${task.title}</h3>
                            <div class="task-detail-meta">
                                <span class="difficulty-badge difficulty-${task.difficulty?.toLowerCase() || 'easy'}">${task.difficulty || 'Easy'}</span>
                                <span class="status-badge status-${task.status.toLowerCase()}">${task.status.toUpperCase()}</span>
                                <span class="reward-badge">₱${parseFloat(task.reward_amount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="task-detail-content">
                        <div class="task-detail-section">
                            <h4 class="section-title">Description</h4>
                            <p class="task-detail-description">${task.description || 'No description provided'}</p>
                        </div>
                        
                        <div class="task-detail-grid">
                            <div class="detail-group">
                                <div class="detail-item">
                                    <span class="detail-label">Category</span>
                                    <span class="detail-value">${task.category || 'General'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Restart Limit</span>
                                    <span class="detail-value">${task.restart_limit || 0}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Email Required</span>
                                    <span class="detail-value">${task.referral_required ? 'Yes' : 'No'}</span>
                                </div>
                            </div>
                            
                            <div class="detail-group">
                                <div class="detail-item">
                                    <span class="detail-label">Task Deadline</span>
                                    <span class="detail-value">${task.task_deadline ? new Date(task.task_deadline).toLocaleDateString() : 'No deadline'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">User Time Limit</span>
                                    <span class="detail-value">${task.user_deadline ? `${task.user_deadline} hours` : 'No limit'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Created</span>
                                    <span class="detail-value">${new Date(task.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                        
                        ${task.image_url ? `
                            <div class="task-detail-section">
                                <h4 class="section-title">Image</h4>
                                <div class="image-url-container">
                                    <a href="${task.image_url}" target="_blank" class="image-link">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <polyline points="15,3 21,3 21,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                        View Full Image
                                    </a>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${task.referral_required && task.email_list && task.email_list.length > 0 ? `
                            <div class="task-detail-section">
                                <h4 class="section-title">Valid Emails (${task.email_list.length})</h4>
                                
                                <!-- Available Emails Section -->
                                <div class="email-status-section">
                                    <h5 class="email-status-title available">Available Emails</h5>
                                    <div class="email-list">
                                        ${task.email_list.filter(email => {
                                            const emailUsage = window.currentTaskEmailUsage || {}
                                            const usage = emailUsage[email]
                                            return !usage || usage.count === 0
                                        }).map(email => `
                                            <div class="email-item email-available">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2"/>
                                                    <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2"/>
                                                </svg>
                                                <div class="email-content">
                                                    <span class="email-address">${email}</span>
                                                    <span class="email-status available">Available</span>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                
                                <!-- Used Emails Section -->
                                <div class="email-status-section">
                                    <h5 class="email-status-title used">Used Emails</h5>
                                    <div class="email-list">
                                        ${task.email_list.filter(email => {
                                            const emailUsage = window.currentTaskEmailUsage || {}
                                            const usage = emailUsage[email]
                                            return usage && usage.count > 0
                                        }).map(email => {
                                            const emailUsage = window.currentTaskEmailUsage || {}
                                            const usage = emailUsage[email]
                                            const usedDate = usage ? new Date(usage.lastUsed).toLocaleDateString() : ''
                                            
                                            return `
                                                <div class="email-item email-used">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2"/>
                                                        <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2"/>
                                                    </svg>
                                                    <div class="email-content">
                                                        <span class="email-address">${email}</span>
                                                        <div class="email-usage-info">
                                                            <span class="email-status used">USED (${usage.count}x, last: ${usedDate})</span>
                                                            <div class="email-users">
                                                                ${usage.users.map(user => `
                                                                    <div class="user-info">
                                                                        <span class="user-name">${user.full_name || user.username}</span>
                                                                        <span class="user-username">@${user.username}</span>
                                                                        <span class="user-status status-${user.status.toLowerCase()}">${user.status}</span>
                                                                    </div>
                                                                `).join('')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            `
                                        }).join('')}
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${task.referral_required && window.currentTaskEmailUsage ? (() => {
                            const usedEmails = Object.keys(window.currentTaskEmailUsage)
                            const unlistedEmails = usedEmails.filter(email => !task.email_list.includes(email))
                            return unlistedEmails.length > 0 ? `
                                <div class="task-detail-section">
                                    <h4 class="section-title">Other Emails Used (${unlistedEmails.length})</h4>
                                    <div class="email-list">
                                        ${unlistedEmails.map(email => {
                                            const usage = window.currentTaskEmailUsage[email]
                                            const usedDate = new Date(usage.lastUsed).toLocaleDateString()
                                            return `
                                                <div class="email-item email-used">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="2"/>
                                                        <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2"/>
                                                    </svg>
                                                    <div class="email-content">
                                                        <span class="email-address">${email}</span>
                                                        <div class="email-usage-info">
                                                            <span class="email-status used">USED (${usage.count}x, last: ${usedDate})</span>
                                                            <div class="email-users">
                                                                ${usage.users.map(user => `
                                                                    <div class="user-info">
                                                                        <span class="user-name">${user.full_name || user.username}</span>
                                                                        <span class="user-username">@${user.username}</span>
                                                                        <span class="user-status status-${user.status.toLowerCase()}">${user.status}</span>
                                                                    </div>
                                                                `).join('')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            `
                                        }).join('')}
                                    </div>
                                </div>
                            ` : ''
                        })() : ''}
                    </div>
                </div>
            `,
            primaryButton: { text: 'Close', action: () => window.closeModal() },
            closable: true
        })
    } else {
    alert(`Task Details:
Title: ${task.title}
Description: ${task.description}
Reward: ₱${task.reward_amount}
Difficulty: ${task.difficulty}
Category: ${task.category}
Restart Limit: ${task.restart_limit}
Image URL: ${task.image_url || 'No image set'}
Email Required: ${task.referral_required ? 'Yes' : 'No'}${emailInfo}
Status: ${task.status}`)
    }
}

// Helper functions for modal
function toggleModalReferralEmail() {
    const referralRequired = document.getElementById('modal-referral-required').value === 'true'
    const emailGroup = document.getElementById('modal-referral-email-group')
    if (emailGroup) {
        emailGroup.style.display = referralRequired ? 'block' : 'none'
    }
}

function previewModalTaskImage() {
    const imageUrl = document.getElementById('modal-task-image-url').value
    const previewContainer = document.getElementById('modal-task-image-preview')
    const previewImg = document.getElementById('modal-preview-img')
    
    if (imageUrl && imageUrl.trim() !== '') {
        // Use cache buster for image URLs if available
        previewImg.src = window.CacheBuster ? window.CacheBuster.addCacheBuster(imageUrl) : imageUrl
        previewContainer.style.display = 'block'
        
        // Handle image load error
        previewImg.onerror = function() {
            previewContainer.innerHTML = '<div style="color: #dc2626; margin-top: 8px; font-size: 0.875rem;">⚠️ Invalid image URL or image cannot be loaded</div>'
        }
        
        // Reset error message on successful load
        previewImg.onload = function() {
            previewContainer.innerHTML = '<img id="modal-preview-img" src="' + imageUrl + '" alt="Task Image Preview" style="max-width: 100%; height: auto; border-radius: 8px;">'
        }
    } else {
        previewContainer.style.display = 'none'
    }
}

// Attach task event listeners
function attachTaskEventListeners() {
    console.log('attachTaskEventListeners called')
    // Create task button
    const createTaskBtn = document.getElementById('create-task-btn')
    console.log('Create task button found:', !!createTaskBtn)
    if (createTaskBtn) {
        // Remove any existing listeners first
        createTaskBtn.removeEventListener('click', createTaskBtn._clickHandler)
        // Create new handler
        createTaskBtn._clickHandler = function() {
            console.log('Create task button clicked')
            showCreateTaskModal()
        }
        createTaskBtn.addEventListener('click', createTaskBtn._clickHandler)
    }
    
    // Quick action create task button
    const quickCreateTaskBtn = document.querySelector('[data-action="create-task"]')
    if (quickCreateTaskBtn) {
        quickCreateTaskBtn.addEventListener('click', function() {
            showCreateTaskModal()
        })
    }
    
    // Use event delegation for task action buttons
    const tasksList = document.getElementById('tasks-list')
    if (tasksList) {
        // Remove existing listener to prevent duplicates
        tasksList.removeEventListener('click', tasksList._taskActionHandler)
        
        // Create new handler
        tasksList._taskActionHandler = async function(e) {
            // Check if clicked element or its parent has data-action attribute
            const actionButton = e.target.closest('[data-action]')
            if (!actionButton) return
            
            e.preventDefault()
            e.stopPropagation()
            
            const action = actionButton.getAttribute('data-action')
            const taskId = actionButton.getAttribute('data-task-id')
            
            console.log('Task action clicked:', action, 'Task ID:', taskId)
            
            switch (action) {
                case 'view-task':
                    viewTask(taskId)
                    break
                case 'toggle-task':
                    await toggleTaskStatus(taskId)
                    break
                case 'edit-task':
                    await editTask(taskId)
                    break
                case 'delete-task':
                    await deleteTask(taskId)
                    break
            }
        }
        
        // Add the new listener
        tasksList.addEventListener('click', tasksList._taskActionHandler)
        console.log('Task action event delegation set up for tasks-list')
    } else {
        console.error('tasks-list container not found for event delegation')
    }
}

// Export functions for global access
console.log('Admin tasks module loaded, exporting functions...')
window.loadAdminTasks = loadTasks
window.renderAdminTasks = renderTasks
window.createTask = createTask
window.showCreateTaskModal = showCreateTaskModal
window.toggleTaskStatus = toggleTaskStatus
window.editTask = editTask
window.deleteTask = deleteTask
window.attachTaskEventListeners = attachTaskEventListeners
window.toggleModalReferralEmail = toggleModalReferralEmail
window.previewModalTaskImage = previewModalTaskImage
console.log('Admin tasks functions exported:', Object.keys(window).filter(key => key.includes('Admin')))
