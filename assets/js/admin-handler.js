// Admin Handler Module - UI Initialization and Coordination
import { createNotification } from './wallet.js'

// Global variables
let currentUser = null

// Initialize admin panel
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Admin panel initializing...')
    
    // Initialize admin authentication
    const isAuthenticated = await window.initAdminAuth()
    if (!isAuthenticated) {
        return
    }
    
    currentUser = window.getCurrentUser()
    console.log('Admin authenticated:', currentUser.email)
    
    // Load admin data
    console.log('Available admin functions:', Object.keys(window).filter(key => key.includes('Admin')))
    await window.loadDashboardStats()
    await window.loadSubmissions()
    await window.loadAdminWithdrawals()
    
    // Check if loadAdminTasks exists, if not wait a bit and try again
    if (typeof window.loadAdminTasks !== 'function') {
        console.log('loadAdminTasks not available, waiting...')
        await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log('About to call loadAdminTasks, function exists:', typeof window.loadAdminTasks)
    if (typeof window.loadAdminTasks === 'function') {
        await window.loadAdminTasks()
    } else {
        console.error('loadAdminTasks function not available!')
        alert('Error: Admin tasks module not loaded properly')
    }
    
    await window.loadUsers()
    
    // Render admin panel
    await renderAdminPanel()
    
    // Attach event listeners
    attachEventListeners()
})

// Render the complete admin panel
async function renderAdminPanel() {
    const container = document.querySelector('.container')
    if (!container) return
    
    container.innerHTML = `
        <div class="admin-header">
            <h1>Admin Panel</h1>
            <div class="admin-stats">
                <!-- Stats will be rendered by admin-users.js -->
            </div>
        </div>
        
        <div class="admin-sections">
            <div class="pending-submissions">
                <h2>Task Submissions</h2>
                <div id="submissions-list" class="submissions-list">
                    <!-- Submissions will be rendered here -->
                </div>
            </div>
            
            <div class="task-management">
                <h2>Task Management</h2>
                
                <!-- Create Task Form -->
                <div class="create-task-section">
                    <h3>Create New Task</h3>
                    <form id="create-task-form" class="create-task-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="task-title">Title</label>
                                <input type="text" id="task-title" name="title" required>
                            </div>
                            <div class="form-group">
                                <label for="task-reward">Reward (₱)</label>
                                <input type="number" id="task-reward" name="reward" min="0" step="0.01" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="task-description">Description</label>
                            <textarea id="task-description" name="description" rows="3" required></textarea>
                        </div>
                        <div class="form-group">
                            <label for="task-instruction">Instructions</label>
                            <textarea id="task-instruction" name="instruction" rows="4" placeholder="Detailed step-by-step instructions for completing this task"></textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="task-difficulty">Difficulty</label>
                                <select id="task-difficulty" name="difficulty" required>
                                    <option value="Easy">Easy</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Hard">Hard</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="task-category">Category</label>
                                <input type="text" id="task-category" name="category" placeholder="e.g., Social Media, Content Creation">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="task-deadline">Task Deadline</label>
                                <input type="datetime-local" id="task-deadline" name="task_deadline">
                            </div>
                            <div class="form-group">
                                <label for="user-deadline">User Time Limit (Hours)</label>
                                <input type="number" id="user-deadline" name="user_deadline" min="1" max="168" placeholder="e.g., 2 for 2 hours">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="task-restart-limit">Restart Limit</label>
                                <input type="number" id="task-restart-limit" name="restart_limit" min="0" value="3" required>
                            </div>
                            <div class="form-group">
                                <label for="referral-required">Email Required</label>
                                <select id="referral-required" name="referral_required" onchange="toggleReferralEmail()">
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group" id="referral-email-group" style="display: none;">
                            <label for="email-list">Valid Emails (One per line)</label>
                            <textarea id="email-list" name="email_list" rows="5" placeholder="Enter valid emails, one per line:&#10;user1@example.com&#10;user2@example.com&#10;user3@example.com"></textarea>
                            <small>Users must get one of these emails from their referrer to start this task.</small>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-success">Create Task</button>
                            <button type="button" id="cancel-create-task" class="btn btn-secondary">Cancel</button>
                        </div>
                    </form>
                </div>
                
                <!-- Tasks List -->
                <div class="tasks-list-section">
                    <h3>All Tasks</h3>
                    <div id="tasks-list" class="tasks-list">
                        <!-- Tasks will be rendered here -->
                    </div>
                </div>
            </div>
            
            <div class="withdrawals-management">
                <h2>Withdrawals Management</h2>
                
                <!-- Filter Buttons -->
                <div class="filter-buttons">
                    <button class="btn btn-primary filter-btn active" data-filter="pending">Pending</button>
                    <button class="btn btn-secondary filter-btn" data-filter="approved">Approved</button>
                    <button class="btn btn-secondary filter-btn" data-filter="rejected">Rejected</button>
                    <button class="btn btn-secondary filter-btn" data-filter="all">All</button>
                </div>
                
                <!-- Withdrawals Table -->
                <div id="withdrawals-list" class="withdrawals-list">
                    <!-- Withdrawals will be rendered here -->
                </div>
            </div>
            
            <div class="users-management">
                <h2>Users Management</h2>
                <div id="users-list" class="users-list">
                    <!-- Users will be rendered here -->
                </div>
            </div>
        </div>
    `
    
    // Render all sections
    window.renderDashboardStats()
    window.renderSubmissions()
    window.renderAdminTasks()
    window.renderAdminWithdrawals()
    window.renderUsers()
    
    // Attach specific event listeners
    window.attachTaskEventListeners()
    window.attachWithdrawalEventListeners()
}

// Attach general event listeners
function attachEventListeners() {
    // Logout button
    const logoutBtn = document.querySelector('#logout-btn')
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault()
            const { signOut } = await import('./auth.js')
            await signOut()
        })
    }
    
    // Refresh admin button
    const refreshBtn = document.querySelector('#refresh-admin')
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function(e) {
            e.preventDefault()
            console.log('Refreshing admin panel...')
            await window.loadDashboardStats()
            await window.loadSubmissions()
            await window.loadAdminTasks()
            await window.loadAdminWithdrawals()
            await window.loadUsers()
            window.renderDashboardStats()
            window.renderSubmissions()
            window.renderAdminTasks()
            window.renderAdminWithdrawals()
            window.renderUsers()
            console.log('Admin panel refreshed!')
        })
    }
}

// Make createNotification available globally
window.createNotification = createNotification

// Global function for toggleReferralEmail (called from dynamically created forms)
window.toggleReferralEmail = function() {
    const referralRequired = document.getElementById('referral-required');
    const referralEmailGroup = document.getElementById('referral-email-group');
    const emailListInput = document.getElementById('email-list');
    
    // Check if elements exist before accessing them
    if (!referralRequired || !referralEmailGroup || !emailListInput) {
        console.log('Elements not found, skipping toggle');
        return;
    }
    
    if (referralRequired.value === 'true') {
        referralEmailGroup.style.display = 'block';
        emailListInput.required = true;
    } else {
        referralEmailGroup.style.display = 'none';
        emailListInput.required = false;
        emailListInput.value = '';
    }
}