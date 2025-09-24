// Admin Tasks Module
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Global variables
let allTasks = []

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

// Render tasks list
function renderTasks() {
    const tasksList = document.getElementById('tasks-list')
    if (!tasksList) return
    
    if (allTasks.length === 0) {
        tasksList.innerHTML = '<p class="no-tasks">No tasks found.</p>'
        return
    }
    
    console.log('Rendering tasks:', allTasks.length)
    
    tasksList.innerHTML = `
        <table class="tasks-table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Difficulty</th>
                    <th>Reward</th>
                    <th>Category</th>
                    <th>Email Required</th>
                    <th>Deadlines</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${allTasks.map(task => `
                    <tr>
                        <td>${task.title}</td>
                        <td>${task.description.length > 50 ? task.description.substring(0, 50) + '...' : task.description}</td>
                        <td><span class="difficulty-badge ${task.difficulty?.toLowerCase() || 'easy'}">${task.difficulty || 'Easy'}</span></td>
                        <td>₱${task.reward_amount.toFixed(2)}</td>
                        <td>${task.category || 'General'}</td>
                            <td>
                                ${task.referral_required ? 
                                    `Yes (${task.email_list ? task.email_list.length : 0} emails)` : 
                                    'No'
                                }
                            </td>
                        <td>
                            ${task.task_deadline ? `<div><strong>Task:</strong> ${new Date(task.task_deadline).toLocaleDateString()}</div>` : ''}
                            ${task.user_deadline ? `<div><strong>User:</strong> ${task.user_deadline} hours</div>` : ''}
                        </td>
                        <td><span class="status-badge ${task.status}">${task.status.toUpperCase()}</span></td>
                        <td>
                            <button class="btn btn-sm btn-info" data-action="view-task" data-task-id="${task.id}">
                                View
                            </button>
                            <button class="btn btn-sm ${task.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                                    data-action="toggle-task" data-task-id="${task.id}">
                                ${task.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button class="btn btn-sm btn-primary" data-action="edit-task" data-task-id="${task.id}">
                                Edit
                            </button>
                            <button class="btn btn-sm btn-danger" data-action="delete-task" data-task-id="${task.id}">
                                Delete
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `
}

// Create new task
async function createTask() {
    try {
        const title = document.getElementById('task-title').value
        const description = document.getElementById('task-description').value
        const instruction = document.getElementById('task-instruction').value
        const reward = parseFloat(document.getElementById('task-reward').value)
        const difficulty = document.getElementById('task-difficulty').value
        const category = document.getElementById('task-category').value
        const taskDeadline = document.getElementById('task-deadline').value
        const userDeadlineHours = document.getElementById('user-deadline').value
        const restartLimit = parseInt(document.getElementById('task-restart-limit').value)
        const referralRequired = document.getElementById('referral-required').value === 'true'
        const emailListText = document.getElementById('email-list').value
        const emailList = emailListText ? emailListText.split('\n').map(email => email.trim()).filter(email => email) : []
        
        if (!title || !description || !reward || !difficulty) {
            alert('Please fill in all required fields')
            return
        }
        
        if (referralRequired && emailList.length === 0) {
            alert('Please add at least one valid email when email requirement is enabled')
            return
        }
        
        console.log('Creating task:', { title, description, instruction, reward, difficulty, category, taskDeadline, userDeadlineHours, restartLimit, referralRequired, emailList })
        
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
                status: 'active',
                created_at: new Date().toISOString()
            })
            .select()
            .single()
        
        if (taskError) {
            console.error('Error creating task:', taskError)
            alert('Error creating task: ' + taskError.message)
            return
        }
        
        console.log('Task created successfully:', taskData)
        alert('Task created successfully!')
        
        // Reset form
        document.getElementById('create-task-form').reset()
        
        // Reload tasks
        await loadTasks()
        renderTasks()
        attachTaskEventListeners()
        
    } catch (error) {
        console.error('Error creating task:', error)
        alert('Error creating task: ' + error.message)
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
                alert('Task not found in database')
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
            alert('Error updating task status: ' + error.message)
            return
        }
        
        console.log('Task status updated successfully')
        alert(`Task ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`)
        
        // Reload tasks
        await loadTasks()
        renderTasks()
        attachTaskEventListeners()
        
    } catch (error) {
        console.error('Error toggling task status:', error)
        alert('Error updating task status: ' + error.message)
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
                alert('Task not found in database')
                return
            }
            task = taskData
        }
        
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
        
        console.log('Updating task:', taskId)
        
        const { error } = await supabaseClient
            .from('tasks')
            .update({
                title: newTitle,
                description: newDescription,
                reward_amount: parseFloat(newReward),
                category: newCategory,
                restart_limit: parseInt(newRestartLimit)
            })
            .eq('id', taskId)
        
        if (error) {
            console.error('Error updating task:', error)
            alert('Error updating task: ' + error.message)
            return
        }
        
        console.log('Task updated successfully')
        alert('Task updated successfully!')
        
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
                    message: `The task "${newTitle}" has been updated. Check the new restart limit!`,
                    type: 'info',
                    is_read: false,
                    created_at: new Date().toISOString()
                }))
                
                await supabaseClient
                    .from('notifications')
                    .insert(notifications)
            }
        } catch (error) {
            console.error('Error creating notifications:', error)
            // Don't fail the task update for notification errors
        }
        
        // Reload tasks
        await loadTasks()
        renderTasks()
        attachTaskEventListeners()
        
    } catch (error) {
        console.error('Error updating task:', error)
        alert('Error updating task: ' + error.message)
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
                alert('Task not found in database')
                return
            }
            task = taskData
        }
        
        const confirmDelete = confirm(`Are you sure you want to delete the task "${task.title}"? This action cannot be undone.`)
        if (!confirmDelete) return
        
        console.log('Deleting task:', taskId)
        
        const { error } = await supabaseClient
            .from('tasks')
            .delete()
            .eq('id', taskId)
        
        if (error) {
            console.error('Error deleting task:', error)
            alert('Error deleting task: ' + error.message)
            return
        }
        
        console.log('Task deleted successfully')
        alert('Task deleted successfully!')
        
        // Reload tasks
        await loadTasks()
        renderTasks()
        attachTaskEventListeners()
        
    } catch (error) {
        console.error('Error deleting task:', error)
        alert('Error deleting task: ' + error.message)
    }
}

// View task details
async function viewTask(taskId) {
    const task = allTasks.find(t => t.id == taskId)
    if (!task) {
        alert('Task not found')
        return
    }
    
    let emailInfo = '\nNo email requirement'
    if (task.referral_required) {
        const totalEmails = task.email_list ? task.email_list.length : 0
        emailInfo = `\nValid Emails (${totalEmails}):\n${task.email_list ? task.email_list.join('\n') : 'None set'}`
        
        // Show email usage status
        if (totalEmails > 0) {
            emailInfo += '\n\nEmail Usage Status:'
            
            // Fetch email usage data
            const { data: emailUsage, error } = await supabaseClient
                .from('task_email_usage')
                .select('email, user_id, used_at')
                .eq('task_id', taskId)
            
            if (!error && emailUsage) {
                const usedEmails = new Set(emailUsage.map(usage => usage.email))
                
                for (const email of task.email_list) {
                    if (usedEmails.has(email)) {
                        const usage = emailUsage.find(u => u.email === email)
                        const usedDate = new Date(usage.used_at).toLocaleDateString()
                        emailInfo += `\n- ${email}: USED (${usedDate})`
                    } else {
                        emailInfo += `\n- ${email}: Available`
                    }
                }
            } else {
                // Fallback if can't fetch usage data
                for (const email of task.email_list) {
                    emailInfo += `\n- ${email}: Available`
                }
            }
        }
    }
    
    alert(`Task Details:
Title: ${task.title}
Description: ${task.description}
Reward: ₱${task.reward_amount}
Difficulty: ${task.difficulty}
Category: ${task.category}
Restart Limit: ${task.restart_limit}
Email Required: ${task.referral_required ? 'Yes' : 'No'}${emailInfo}
Status: ${task.status}`)
}

// Attach task event listeners
function attachTaskEventListeners() {
    // Create task form
    const createTaskForm = document.getElementById('create-task-form')
    if (createTaskForm) {
        createTaskForm.addEventListener('submit', async function(e) {
            e.preventDefault()
            await createTask()
        })
    }
    
    // Cancel create task button
    const cancelCreateTaskBtn = document.getElementById('cancel-create-task')
    if (cancelCreateTaskBtn) {
        cancelCreateTaskBtn.addEventListener('click', function() {
            document.getElementById('create-task-form').reset()
        })
    }
    
    // Task action buttons
    const actionButtons = document.querySelectorAll('[data-action]')
    actionButtons.forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault()
            
            const action = this.getAttribute('data-action')
            const taskId = this.getAttribute('data-task-id')
            
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
        })
    })
}

// Export functions for global access
console.log('Admin tasks module loaded, exporting functions...')
window.loadAdminTasks = loadTasks
window.renderAdminTasks = renderTasks
window.createTask = createTask
window.toggleTaskStatus = toggleTaskStatus
window.editTask = editTask
window.deleteTask = deleteTask
window.attachTaskEventListeners = attachTaskEventListeners
console.log('Admin tasks functions exported:', Object.keys(window).filter(key => key.includes('Admin')))
