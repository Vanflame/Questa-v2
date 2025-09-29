// Supabase Configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://rhfqaebkvxyayzrpmjhl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let currentEmailId = null;
let emails = [];
let groups = []; // Groups for organizing emails
let tasks = []; // All tasks from all emails (for sidebar calculations)
let currentEmailTasks = []; // Tasks for currently selected email only
let selectedTasks = new Set(); // Set of selected task IDs for bulk operations
let THRESHOLD_POINTS = loadThresholdFromStorage();

// Hold-to-select functionality
let isHolding = false;
let holdTimer = null;
let holdStartTime = 0;

// Default task template (empty by default)
const ORIGINAL_DEFAULT_TASKS = [];

// Editable default tasks (loaded from localStorage or defaults to empty)
let DEFAULT_TASKS = [];

// DOM Elements
const emailList = document.getElementById('emailList');
const selectedEmailTitle = document.getElementById('selectedEmailTitle');
const scoreValue = document.getElementById('scoreValue');
const dashboardContent = document.getElementById('dashboardContent');
const emailPanel = document.getElementById('emailPanel');
const tasksList = document.getElementById('tasksList');
const addEmailBtn = document.getElementById('addEmailBtn');
const addEmailModal = document.getElementById('addEmailModal');
const emailInput = document.getElementById('emailInput');
const confirmAddEmail = document.getElementById('confirmAddEmail');
const emailGroupSelect = document.getElementById('emailGroupSelect');
const addGroupBtn = document.getElementById('addGroupBtn');
const addGroupModal = document.getElementById('addGroupModal');
const groupNameInput = document.getElementById('groupNameInput');
const confirmAddGroup = document.getElementById('confirmAddGroup');
const editEmailModal = document.getElementById('editEmailModal');
const editEmailInput = document.getElementById('editEmailInput');
const editEmailGroupSelect = document.getElementById('editEmailGroupSelect');
const confirmEditEmail = document.getElementById('confirmEditEmail');
const bulkAddEmailsBtn = document.getElementById('bulkAddEmailsBtn');
const bulkAddEmailsModal = document.getElementById('bulkAddEmailsModal');
const bulkEmailsInput = document.getElementById('bulkEmailsInput');
const bulkEmailGroupSelect = document.getElementById('bulkEmailGroupSelect');
const confirmBulkAddEmails = document.getElementById('confirmBulkAddEmails');
const bulkEmailPreview = document.getElementById('bulkEmailPreview');
const emailListPreview = document.getElementById('emailListPreview');
const addTaskBtn = document.getElementById('addTaskBtn');
const addTaskModal = document.getElementById('addTaskModal');
const taskNameInput = document.getElementById('taskNameInput');
const taskPointsInput = document.getElementById('taskPointsInput');
const confirmAddTask = document.getElementById('confirmAddTask');
const markAllDoneBtn = document.getElementById('markAllDoneBtn');
const resetAllBtn = document.getElementById('resetAllBtn');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const bulkMoveBtn = document.getElementById('bulkMoveBtn');
const bulkMoveModal = document.getElementById('bulkMoveModal');
const bulkMoveGroupSelect = document.getElementById('bulkMoveGroupSelect');
const confirmBulkMove = document.getElementById('confirmBulkMove');
const applyDefaultTasksBtn = document.getElementById('applyDefaultTasksBtn');
const emailSearch = document.getElementById('emailSearch');
const settingsBtn = document.getElementById('settingsBtn');
const defaultTasksModal = document.getElementById('defaultTasksModal');
const defaultTasksList = document.getElementById('defaultTasksList');
const newDefaultTaskName = document.getElementById('newDefaultTaskName');
const newDefaultTaskPoints = document.getElementById('newDefaultTaskPoints');
const addDefaultTaskBtn = document.getElementById('addDefaultTaskBtn');
const saveDefaultTasksBtn = document.getElementById('saveDefaultTasksBtn');
const thresholdInput = document.getElementById('thresholdInput');
const confirmationModal = document.getElementById('confirmationModal');
const confirmationTitle = document.getElementById('confirmationTitle');
const confirmationMessage = document.getElementById('confirmationMessage');
const confirmationIcon = document.getElementById('confirmationIcon');
const confirmationCancel = document.getElementById('confirmationCancel');
const confirmationConfirm = document.getElementById('confirmationConfirm');
const notificationToast = document.getElementById('notificationToast');
const toastTitle = document.getElementById('toastTitle');
const toastDescription = document.getElementById('toastDescription');
const toastIcon = document.getElementById('toastIcon');
const toastClose = document.getElementById('toastClose');
const loadingModal = document.getElementById('loadingModal');
const loadingTitle = document.getElementById('loadingTitle');
const loadingMessage = document.getElementById('loadingMessage');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const loadingDetails = document.getElementById('loadingDetails');

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeApp);

// Mobile optimizations
document.addEventListener('DOMContentLoaded', () => {
    // Prevent zoom on double tap for iOS
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Add touch-friendly class for touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.body.classList.add('touch-device');
    }
    
    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            // Re-render email list to adjust layout
            renderEmailList();
        }, 100);
    });
});
addEmailBtn.addEventListener('click', showAddEmailModal);
confirmAddEmail.addEventListener('click', addNewEmail);
addGroupBtn.addEventListener('click', showAddGroupModal);
confirmAddGroup.addEventListener('click', addNewGroup);
confirmEditEmail.addEventListener('click', updateEmail);
bulkAddEmailsBtn.addEventListener('click', showBulkAddEmailsModal);
confirmBulkAddEmails.addEventListener('click', bulkAddEmails);
bulkEmailsInput.addEventListener('input', previewBulkEmails);
confirmAddTask.addEventListener('click', addNewTask);
markAllDoneBtn.addEventListener('click', markAllTasksDone);
resetAllBtn.addEventListener('click', resetAllTasks);
addTaskBtn.addEventListener('click', showAddTaskModal);
bulkDeleteBtn.addEventListener('click', bulkDeleteTasks);
selectAllBtn.addEventListener('click', selectAllTasks);
bulkMoveBtn.addEventListener('click', showBulkMoveModal);
confirmBulkMove.addEventListener('click', bulkMoveEmails);
applyDefaultTasksBtn.addEventListener('click', applyDefaultTasksToAllEmails);
emailSearch.addEventListener('input', filterEmails);
settingsBtn.addEventListener('click', showDefaultTasksEditor);
addDefaultTaskBtn.addEventListener('click', addNewDefaultTask);
saveDefaultTasksBtn.addEventListener('click', saveDefaultTasks);
thresholdInput.addEventListener('input', updateThreshold);

// Modal event listeners
document.querySelectorAll('.modal-close').forEach(closeBtn => {
    closeBtn.addEventListener('click', closeModal);
});

// Modal backdrop click handled by modal-container click

// Backdrop click to close modals - disabled for now to prevent interference
// window.addEventListener('click', (e) => {
//     if (e.target.classList.contains('modal-container') && e.target === e.currentTarget) {
//         closeModal();
//     }
// });

// Confirmation modal event listeners
confirmationCancel.addEventListener('click', () => {
    confirmationModal.classList.remove('show');
    if (window.currentConfirmationCallback) {
        window.currentConfirmationCallback(false);
        window.currentConfirmationCallback = null;
    }
});

confirmationConfirm.addEventListener('click', () => {
    confirmationModal.classList.remove('show');
    if (window.currentConfirmationCallback) {
        window.currentConfirmationCallback(true);
        window.currentConfirmationCallback = null;
    }
});

// Toast notification event listeners
toastClose.addEventListener('click', hideNotification);

// Initialize the application
async function initializeApp() {
    try {
        showLoading();
        await loadGroups();
        await loadEmails();
        await loadTasks();
        await loadDefaultTasksFromStorage(); // Load default tasks from Supabase
        renderEmailList();
        updateGroupSelect();
        
        // If no emails exist, show welcome message
        if (emails.length === 0) {
            showWelcomeMessage();
        } else {
            // Select first email by default
            selectEmail(emails[0].id);
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize application. Please check your Supabase configuration.');
    } finally {
        hideLoading();
    }
}

// Show loading state
function showLoading() {
    dashboardContent.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;
}

// Hide loading state
function hideLoading() {
    // Loading state will be replaced by other content
}

// Show error message
function showError(message) {
    showNotification('Error', message, 'error', 8000);
    dashboardContent.innerHTML = `
        <div class="empty-state">
            <h3>⚠️ Error</h3>
            <p>${message}</p>
            <button class="btn-primary" onclick="initializeApp()">Retry</button>
        </div>
    `;
}

// Show welcome message
function showWelcomeMessage() {
    dashboardContent.style.display = 'block';
    emailPanel.style.display = 'none';
}

// Load groups from localStorage (for now, could be moved to Supabase later)
async function loadGroups() {
    try {
        const saved = localStorage.getItem('emailDashboard_groups');
        if (saved) {
            groups = JSON.parse(saved);
        } else {
            // Create default groups
            groups = [
                { id: 'active', name: 'Active', status: 'active' },
                { id: 'used', name: 'Used', status: 'used' },
                { id: 'completed', name: 'Completed', status: 'completed' }
            ];
            await saveGroups();
        }
    } catch (error) {
        console.error('Error loading groups:', error);
        groups = [
            { id: 'active', name: 'Active', status: 'active' },
            { id: 'used', name: 'Used', status: 'used' },
            { id: 'completed', name: 'Completed', status: 'completed' }
        ];
    }
}

// Save groups to localStorage
async function saveGroups() {
    try {
        localStorage.setItem('emailDashboard_groups', JSON.stringify(groups));
    } catch (error) {
        console.error('Error saving groups:', error);
    }
}

// Load emails from Supabase
async function loadEmails() {
    try {
        const { data, error } = await supabaseClient
            .from('todoemails')
            .select('*')
            .order('address');
        
        if (error) throw error;
        emails = data || [];
        
        // Ensure all emails have a group_id, assign to 'active' if missing
        emails.forEach(email => {
            if (!email.group_id) {
                email.group_id = 'active';
            }
        });
    } catch (error) {
        console.error('Error loading emails:', error);
        // If table doesn't exist or other error, start with empty array
        emails = [];
    }
}

// Load tasks from Supabase
async function loadTasks() {
    try {
        const { data, error } = await supabaseClient
            .from('todotasks')
            .select('*');
        
        if (error) throw error;
        tasks = data || [];
    } catch (error) {
        console.error('Error loading tasks:', error);
        // If table doesn't exist or other error, start with empty array
        tasks = [];
    }
}

// Render email list in sidebar
function renderEmailList(filteredEmails = null) {
    const emailsToRender = filteredEmails || emails;
    
    if (emailsToRender.length === 0) {
        emailList.innerHTML = `
            <div class="empty-state">
                <p>${filteredEmails ? 'No emails match your search' : 'No emails added yet'}</p>
            </div>
        `;
        return;
    }
    
    // Group emails by their group
    const groupedEmails = {};
    groups.forEach(group => {
        groupedEmails[group.id] = [];
    });
    
    emailsToRender.forEach(email => {
        const emailTasks = tasks.filter(task => task.email_id === email.id);
        const totalScore = emailTasks.reduce((sum, task) => sum + (task.done ? task.points : 0), 0);
        const emailData = { email, totalScore };
        
        // Use the email's group_id, fallback to 'active' if not set
        const groupId = email.group_id || 'active';
        if (groupedEmails[groupId]) {
            groupedEmails[groupId].push(emailData);
        } else {
            // If group doesn't exist, add to active
            groupedEmails['active'].push(emailData);
        }
    });
    
    // Render groups
    emailList.innerHTML = '';
    groups.forEach(group => {
        const groupEmails = groupedEmails[group.id] || [];
        if (groupEmails.length === 0) return;
        
        // Sort emails by score
        groupEmails.sort((a, b) => b.totalScore - a.totalScore);
        
        const groupElement = document.createElement('div');
        groupElement.className = 'email-group';
        groupElement.innerHTML = `
            <div class="group-header" onclick="toggleGroup('${group.id}')">
                <div class="group-title">
                    <svg class="group-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
        </svg>
                    ${group.name}
                </div>
                <div class="group-count">${groupEmails.length}</div>
            </div>
            <div class="group-content" id="group-${group.id}">
                <div class="status-dropdown">
                    <select class="status-select" onchange="filterGroupEmails('${group.id}', this.value)">
                        <option value="all">All (${groupEmails.length})</option>
                        <option value="high">High Score (${groupEmails.filter(e => e.totalScore >= THRESHOLD_POINTS * 0.7).length})</option>
                        <option value="medium">Medium Score (${groupEmails.filter(e => e.totalScore >= THRESHOLD_POINTS * 0.3 && e.totalScore < THRESHOLD_POINTS * 0.7).length})</option>
                        <option value="low">Low Score (${groupEmails.filter(e => e.totalScore < THRESHOLD_POINTS * 0.3).length})</option>
                    </select>
                </div>
                <div class="group-emails" id="emails-${group.id}">
                    ${groupEmails.map(({ email, totalScore }) => `
                        <div class="email-item ${currentEmailId === email.id ? 'active' : ''}">
                            <div class="email-info" onclick="selectEmail('${email.id}')">
                                <div class="email-address">${email.address}</div>
                                <div class="email-score">
                                    ${totalScore} pts
                                    ${totalScore >= THRESHOLD_POINTS ? '<span class="threshold-indicator">🏆</span>' : ''}
                                </div>
                            </div>
                            <div class="email-actions">
                                <div class="dropdown">
                                    <button class="dropdown-toggle" onclick="toggleEmailMenu('${email.id}')" title="More options">
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
                                    </button>
                                    <div class="dropdown-menu" id="menu-${email.id}">
                                        <button class="dropdown-item" onclick="editEmail('${email.id}')">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                            </svg>
                                            Edit
                                        </button>
                                        <div class="dropdown-submenu">
                                            <button class="dropdown-item dropdown-submenu-toggle" onclick="toggleSubmenu('${email.id}')">
                                                <svg viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                                </svg>
                                                Move to Group
                                                <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                                                </svg>
                                            </button>
                                            <div class="dropdown-submenu-content" id="submenu-${email.id}">
                                                ${groups.map(g => `
                                                    <button class="dropdown-item" onclick="moveEmailToGroup('${email.id}', '${g.id}')" ${email.group_id === g.id ? 'class="dropdown-item active"' : ''}>
                                                        ${g.name}
                                                    </button>
                                                `).join('')}
                                            </div>
                                        </div>
                                        <button class="dropdown-item dropdown-item-danger" onclick="deleteEmail('${email.id}')">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                            </svg>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        emailList.appendChild(groupElement);
    });
}

// Toggle group expansion
function toggleGroup(groupId) {
    const groupContent = document.getElementById(`group-${groupId}`);
    const groupHeader = groupContent.previousElementSibling;
    
    if (groupContent.classList.contains('expanded')) {
        groupContent.classList.remove('expanded');
        groupHeader.classList.remove('expanded');
    } else {
        groupContent.classList.add('expanded');
        groupHeader.classList.add('expanded');
    }
}

// Filter emails within a group
function filterGroupEmails(groupId, filter) {
    const groupEmails = document.getElementById(`emails-${groupId}`);
    const emailItems = groupEmails.querySelectorAll('.email-item');
    
    emailItems.forEach(item => {
        const scoreText = item.querySelector('.email-score').textContent;
        const score = parseInt(scoreText.match(/\d+/)?.[0] || 0);
        
        let show = true;
        switch (filter) {
            case 'high':
                show = score >= THRESHOLD_POINTS * 0.7;
                break;
            case 'medium':
                show = score >= THRESHOLD_POINTS * 0.3 && score < THRESHOLD_POINTS * 0.7;
                break;
            case 'low':
                show = score < THRESHOLD_POINTS * 0.3;
                break;
            case 'all':
            default:
                show = true;
        }
        
        item.style.display = show ? 'flex' : 'none';
    });
}

// Update group select dropdown
function updateGroupSelect() {
    emailGroupSelect.innerHTML = '<option value="">Select a group</option>';
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        emailGroupSelect.appendChild(option);
    });
}

// Show add group modal
function showAddGroupModal() {
    addGroupModal.classList.add('show');
    groupNameInput.value = '';
    groupNameInput.focus();
}

// Add new group
async function addNewGroup() {
    const groupName = groupNameInput.value.trim();
    
    if (!groupName) {
        showNotification('Invalid Input', 'Please enter a group name', 'error');
        return;
    }
    
    // Check if group already exists
    if (groups.some(g => g.name.toLowerCase() === groupName.toLowerCase())) {
        showNotification('Group Exists', 'A group with this name already exists', 'warning');
        return;
    }
    
    const newGroup = {
        id: groupName.toLowerCase().replace(/\s+/g, '-'),
        name: groupName,
        status: 'active'
    };
    
    groups.push(newGroup);
    await saveGroups();
    updateGroupSelect();
    renderEmailList();
    closeModal();
    
    showNotification('Group Added', `"${groupName}" has been added successfully.`);
}

// Toggle email dropdown menu
function toggleEmailMenu(emailId) {
    console.log('Toggling menu for email:', emailId);
    
    // Close all other menus first
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        if (menu.id !== `menu-${emailId}`) {
            menu.classList.remove('show');
        }
    });
    
    // Toggle current menu
    const menu = document.getElementById(`menu-${emailId}`);
    const button = document.querySelector(`[onclick="toggleEmailMenu('${emailId}')"]`);
    
    if (menu && button) {
        menu.classList.toggle('show');
        
        if (menu.classList.contains('show')) {
            // Position the menu relative to the button
            const buttonRect = button.getBoundingClientRect();
            console.log('Button rect:', buttonRect);
            
            menu.style.top = `${buttonRect.bottom + 4}px`;
            // Position the dropdown to the right of the button
            const leftPosition = buttonRect.right + 4; // 4px gap from button
            menu.style.left = `${leftPosition}px`;
            menu.style.right = 'auto';
            menu.style.width = '160px';
            menu.style.position = 'fixed';
            menu.style.transform = 'none'; // Reset any transforms
            
            console.log('Menu positioned at:', { 
                top: buttonRect.bottom + 4, 
                left: leftPosition,
                buttonRight: buttonRect.right,
                buttonLeft: buttonRect.left,
                buttonWidth: buttonRect.width,
                dropdownRight: leftPosition + 160
            });
        }
        
        console.log('Menu toggled, show class:', menu.classList.contains('show'));
    } else {
        console.log('Menu or button not found for email:', emailId);
    }
}

// Toggle submenu
function toggleSubmenu(emailId) {
    const submenu = document.getElementById(`submenu-${emailId}`);
    const toggle = document.querySelector(`[onclick="toggleSubmenu('${emailId}')"]`);
    
    if (submenu && toggle) {
        // Close all other submenus first
        document.querySelectorAll('.dropdown-submenu-content.show').forEach(menu => {
            if (menu.id !== `submenu-${emailId}`) {
                menu.classList.remove('show');
            }
        });
        
        // Remove active class from all toggles
        document.querySelectorAll('.dropdown-submenu-toggle.active').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Toggle current submenu
        submenu.classList.toggle('show');
        
        // Toggle active class on button
        if (submenu.classList.contains('show')) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    }
}

// Close all dropdown menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
        });
        document.querySelectorAll('.dropdown-submenu-content.show').forEach(menu => {
            menu.classList.remove('show');
        });
        document.querySelectorAll('.dropdown-submenu-toggle.active').forEach(btn => {
            btn.classList.remove('active');
        });
    }
});

// Edit email function
function editEmail(emailId) {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;
    
    // Close the dropdown menu
    const menu = document.getElementById(`menu-${emailId}`);
    if (menu) {
        menu.classList.remove('show');
    }
    
    // Show edit modal
    showEditEmailModal(email);
}

// Show edit email modal
function showEditEmailModal(email) {
    editEmailInput.value = email.address;
    editEmailGroupSelect.value = email.group_id || 'active';
    
    // Populate group select
    editEmailGroupSelect.innerHTML = '<option value="">Select a group</option>';
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        if (group.id === (email.group_id || 'active')) {
            option.selected = true;
        }
        editEmailGroupSelect.appendChild(option);
    });
    
    // Store the email ID for updating
    editEmailModal.dataset.emailId = email.id;
    
    editEmailModal.classList.add('show');
    editEmailInput.focus();
}

// Update email
async function updateEmail() {
    const emailId = editEmailModal.dataset.emailId;
    const newAddress = editEmailInput.value.trim();
    const newGroupId = editEmailGroupSelect.value;
    
    if (!emailId) return;
    
    if (!newAddress || !isValidEmail(newAddress)) {
        showNotification('Invalid Email', 'Please enter a valid email address', 'error');
        return;
    }
    
    if (!newGroupId) {
        showNotification('Select Group', 'Please select a group for this email', 'warning');
        return;
    }
    
    const email = emails.find(e => e.id === emailId);
    if (!email) return;
    
    // Check if email address is being changed and if it already exists
    if (newAddress !== email.address) {
        const existingEmail = emails.find(e => e.address.toLowerCase() === newAddress.toLowerCase() && e.id !== emailId);
        if (existingEmail) {
            showNotification('Email Exists', 'This email address already exists', 'warning');
            return;
        }
    }
    
    try {
        // Update in Supabase
        const { error } = await supabaseClient
            .from('todoemails')
            .update({ 
                address: newAddress,
                group_id: newGroupId
            })
            .eq('id', emailId);
        
        if (error) throw error;
        
        // Update local state
        email.address = newAddress;
        email.group_id = newGroupId;
        
        // Re-render email list
        renderEmailList();
        closeModal();
        
        // Show success notification
        showNotification('Email Updated', `"${newAddress}" has been updated successfully.`);
        
    } catch (error) {
        console.error('Error updating email:', error);
        showNotification('Error', 'Failed to update email. Please try again.', 'error');
    }
}

// Delete email function
async function deleteEmail(emailId) {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;
    
    // Close the dropdown menu
    const menu = document.getElementById(`menu-${emailId}`);
    if (menu) {
        menu.classList.remove('show');
    }
    
    const confirmed = await showConfirmation(
        'Delete Email',
        `Are you sure you want to delete "${email.address}"? This will also delete all associated tasks.`,
        'danger',
        'Delete',
        'Cancel'
    );
    
    if (!confirmed) return;
    
    try {
        // Delete from Supabase
        const { error } = await supabaseClient
            .from('todoemails')
            .delete()
            .eq('id', emailId);
        
        if (error) throw error;
        
        // Remove from local state
        const emailIndex = emails.findIndex(e => e.id === emailId);
        if (emailIndex > -1) {
            emails.splice(emailIndex, 1);
        }
        
        // Remove associated tasks
        tasks = tasks.filter(task => task.email_id !== emailId);
        currentEmailTasks = currentEmailTasks.filter(task => task.email_id !== emailId);
        
        // Re-render
        renderEmailList();
        
        // If this was the selected email, clear selection
        if (currentEmailId === emailId) {
            currentEmailId = null;
            showWelcomeMessage();
        }
        
        showNotification('Email Deleted', `"${email.address}" has been deleted successfully.`);
        
    } catch (error) {
        console.error('Error deleting email:', error);
        showNotification('Error', 'Failed to delete email. Please try again.', 'error');
    }
}

// Update email position without full re-render
function updateEmailPosition(emailId, oldGroupId, newGroupId) {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;
    
    // Find the email element
    const emailElement = document.querySelector(`[onclick="selectEmail('${emailId}')"]`)?.closest('.email-item');
    if (!emailElement) return;
    
    // Find the old and new group containers
    const oldGroupContainer = document.getElementById(`emails-${oldGroupId}`);
    const newGroupContainer = document.getElementById(`emails-${newGroupId}`);
    
    if (oldGroupContainer && newGroupContainer && oldGroupContainer !== newGroupContainer) {
        // Move the email element to the new group
        newGroupContainer.appendChild(emailElement);
        
        // Update group counts
        updateGroupCounts();
    }
}

// Update group counts after moving emails
function updateGroupCounts() {
    groups.forEach(group => {
        const groupEmails = emails.filter(email => email.group_id === group.id);
        const countElement = document.querySelector(`[data-group-id="${group.id}"] .group-count`);
        if (countElement) {
            countElement.textContent = groupEmails.length;
        }
    });
}

// Update email active state without full re-render
function updateEmailActiveState() {
    // Remove active class from all email items
    document.querySelectorAll('.email-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to current email
    if (currentEmailId) {
        const currentEmailElement = document.querySelector(`[onclick="selectEmail('${currentEmailId}')"]`)?.closest('.email-item');
        if (currentEmailElement) {
            currentEmailElement.classList.add('active');
        }
    }
}

// Move email to a different group
async function moveEmailToGroup(emailId, newGroupId) {
    if (!newGroupId) return;
    
    const email = emails.find(e => e.id === emailId);
    if (!email) return;
    
    const oldGroupId = email.group_id;
    if (oldGroupId === newGroupId) return;
    
    // Close all submenus, keep the main dropdown open
    document.querySelectorAll('.dropdown-submenu-content.show').forEach(submenu => {
        submenu.classList.remove('show');
    });
    document.querySelectorAll('.dropdown-submenu-toggle.active').forEach(toggle => {
        toggle.classList.remove('active');
    });
    
    console.log('All submenus closed after moving email:', emailId);
    
    try {
        // Update in Supabase
        const { error } = await supabaseClient
            .from('todoemails')
            .update({ group_id: newGroupId })
            .eq('id', emailId);
        
        if (error) {
            // Check if it's a column not found error
            if (error.code === 'PGRST204' && error.message.includes('group_id')) {
                showNotification('Database Update Required', 'Please run the database migration to add group support. Check the console for SQL commands.', 'warning');
                console.log('=== DATABASE MIGRATION REQUIRED ===');
                console.log('The group_id column is missing from your todoemails table.');
                console.log('Please run this SQL in your Supabase SQL editor:');
                console.log(`
ALTER TABLE todoemails 
ADD COLUMN IF NOT EXISTS group_id TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

UPDATE todoemails 
SET group_id = 'active' 
WHERE group_id IS NULL;

UPDATE todoemails 
SET status = 'active' 
WHERE status IS NULL;
                `);
                return;
            }
            throw error;
        }
        
        // Update local state
        email.group_id = newGroupId;
        
        // Instead of full re-render, just update the email's visual position
        updateEmailPosition(emailId, oldGroupId, newGroupId);
        
        // Add a temporary highlight to show the email was moved
        setTimeout(() => {
            const emailElement = document.querySelector(`[onclick="selectEmail('${emailId}')"]`);
            if (emailElement) {
                emailElement.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
                emailElement.style.borderColor = 'rgb(34, 197, 94)';
                setTimeout(() => {
                    emailElement.style.backgroundColor = '';
                    emailElement.style.borderColor = '';
                }, 2000);
            }
        }, 100);
        
        // Show success notification
        const newGroup = groups.find(g => g.id === newGroupId);
        showNotification('Email Moved', `Moved to "${newGroup.name}" group.`, 'success');
        
    } catch (error) {
        console.error('Error moving email:', error);
        showNotification('Error', 'Failed to move email. Please try again.', 'error');
        
        // No need to reset dropdown since we're using a menu now
    }
}

// Select an email and show its tasks
async function selectEmail(emailId) {
    currentEmailId = emailId;
    const email = emails.find(e => e.id === emailId);
    
    if (!email) return;
    
    // Store dropdown state before updating
    const openDropdowns = [];
    document.querySelectorAll('.dropdown-menu.show').forEach(dropdown => {
        openDropdowns.push({
            id: dropdown.id,
            emailId: dropdown.id.replace('menu-', ''),
            button: document.querySelector(`[onclick="toggleEmailMenu('${dropdown.id.replace('menu-', '')}')"]`)
        });
    });
    
    // Clear bulk selection when switching emails
    selectedTasks.clear();
    
    selectedEmailTitle.textContent = `Tasks for ${email.address}`;
    dashboardContent.style.display = 'none';
    emailPanel.style.display = 'block';
    
    await loadTasksForEmail(emailId);
    renderTasks();
    updateTotalScore();
    updateBulkActionButtons();
    
    // Update active state without full re-render
    updateEmailActiveState();
    
    // Restore dropdown state
    setTimeout(() => {
        openDropdowns.forEach(({ id, emailId, button }) => {
            const dropdown = document.getElementById(id);
            if (dropdown && button) {
                dropdown.classList.add('show');
                // Reposition the dropdown
                const buttonRect = button.getBoundingClientRect();
                dropdown.style.top = `${buttonRect.bottom + 4}px`;
                dropdown.style.left = `${buttonRect.right + 4}px`;
                dropdown.style.position = 'fixed';
            }
        });
    }, 50);
}

// Load tasks for specific email
async function loadTasksForEmail(emailId) {
    try {
        const { data, error } = await supabaseClient
            .from('todotasks')
            .select('*')
            .eq('email_id', emailId);
        
        if (error) throw error;
        currentEmailTasks = data || [];
    } catch (error) {
        console.error('Error loading tasks for email:', error);
        currentEmailTasks = [];
    }
}

// Render tasks list
function renderTasks() {
    tasksList.innerHTML = '';
    
    if (currentEmailTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <h3>No tasks yet</h3>
                <p>Add your first task to get started!</p>
            </div>
        `;
        return;
    }
    
    currentEmailTasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = `task-item ${task.done ? 'completed' : ''}`;
        
        taskItem.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.done ? 'checked' : ''} 
                   onchange="toggleTaskCompletion('${task.id}')">
            <div class="task-content">
                <span class="task-name">${task.name}</span>
                <div class="task-actions">
                    <span class="task-points">${task.points} pts</span>
                    <button class="task-delete-btn" onclick="deleteTask('${task.id}')" title="Delete task">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        // Add hold-to-select functionality
        taskItem.addEventListener('mousedown', (e) => startHoldSelect(e, task.id));
        taskItem.addEventListener('mouseup', endHoldSelect);
        taskItem.addEventListener('mouseleave', endHoldSelect);
        taskItem.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Add click handler for task completion (when not clicking on checkbox or delete button)
        taskItem.addEventListener('click', (e) => {
            // Don't toggle if clicking on checkbox, delete button, or bulk select checkbox
            if (e.target.classList.contains('task-checkbox') || 
                e.target.classList.contains('task-delete-btn') ||
                e.target.classList.contains('bulk-select-checkbox') ||
                e.target.closest('.task-delete-btn') ||
                e.target.closest('.bulk-select-checkbox')) {
                return;
            }
            
            // Toggle task completion
            toggleTaskCompletion(task.id);
        });
        
        tasksList.appendChild(taskItem);
    });
}

// Update total score display
function updateTotalScore() {
    const totalScore = currentEmailTasks.reduce((sum, task) => sum + (task.done ? task.points : 0), 0);
    scoreValue.textContent = totalScore;
    
    if (totalScore >= THRESHOLD_POINTS) {
        scoreValue.classList.add('threshold-reached');
    } else {
        scoreValue.classList.remove('threshold-reached');
    }
}

// Toggle task completion
async function toggleTaskCompletion(taskId) {
    try {
        console.log('toggleTaskCompletion called for task:', taskId);
        const task = currentEmailTasks.find(t => t.id === taskId);
        if (!task) {
            console.log('Task not found:', taskId);
            return;
        }
        
        const { error } = await supabaseClient
            .from('todotasks')
            .update({ done: !task.done })
            .eq('id', taskId);
        
        if (error) throw error;
        
        // Update local state in both arrays
        task.done = !task.done;
        const globalTask = tasks.find(t => t.id === taskId);
        if (globalTask) {
            globalTask.done = !globalTask.done;
        }
        
        // Re-render tasks and update score
        renderTasks();
        updateTotalScore();
        renderEmailList(); // Update threshold indicators
        
    } catch (error) {
        console.error('Error toggling task completion:', error);
        showError('Failed to update task. Please try again.');
    }
}

// Delete a task
async function deleteTask(taskId) {
    try {
        const task = currentEmailTasks.find(t => t.id === taskId);
        if (!task) return;
        
        // Show confirmation modal
        const confirmed = await showConfirmation(
            'Delete Task',
            `Are you sure you want to delete "${task.name}"? This action cannot be undone.`,
            'danger',
            'Delete',
            'Cancel'
        );
        
        if (!confirmed) return;
        
        const { error } = await supabaseClient
            .from('todotasks')
            .delete()
            .eq('id', taskId);
        
        if (error) throw error;
        
        // Remove from local state in both arrays
        const currentIndex = currentEmailTasks.findIndex(t => t.id === taskId);
        if (currentIndex > -1) {
            currentEmailTasks.splice(currentIndex, 1);
        }
        
        const globalIndex = tasks.findIndex(t => t.id === taskId);
        if (globalIndex > -1) {
            tasks.splice(globalIndex, 1);
        }
        
        // Remove from bulk selection if it was selected
        selectedTasks.delete(taskId);
        
        // Re-render tasks and update score
        renderTasks();
        updateTotalScore();
        updateBulkActionButtons();
        renderEmailList(); // Update threshold indicators
        
        // Show success notification
        showNotification('Task Deleted', `"${task.name}" has been deleted successfully.`);
        
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Error', 'Failed to delete task. Please try again.', 'error');
    }
}

// Show add email modal
function showAddEmailModal() {
    console.log('showAddEmailModal called');
    addEmailModal.classList.add('show');
    emailInput.value = '';
    emailInput.focus();
}

// Show bulk add emails modal
function showBulkAddEmailsModal() {
    bulkAddEmailsModal.classList.add('show');
    bulkEmailsInput.value = '';
    bulkEmailPreview.style.display = 'none';
    
    // Populate group select
    bulkEmailGroupSelect.innerHTML = '<option value="">Select a group</option>';
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        bulkEmailGroupSelect.appendChild(option);
    });
    
    bulkEmailsInput.focus();
}

// Preview bulk emails as user types
function previewBulkEmails() {
    const emailText = bulkEmailsInput.value.trim();
    
    if (!emailText) {
        bulkEmailPreview.style.display = 'none';
        return;
    }
    
    const emailLines = emailText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    if (emailLines.length === 0) {
        bulkEmailPreview.style.display = 'none';
        return;
    }
    
    // Clear previous preview
    emailListPreview.innerHTML = '';
    
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    
    emailLines.forEach((email, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'email-preview-item';
        
        let status = 'invalid';
        let statusText = 'Invalid';
        let icon = `
            <svg class="email-preview-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
            </svg>
        `;
        
        if (!isValidEmail(email)) {
            invalidCount++;
        } else {
            // Check for duplicates
            const existingEmail = emails.find(e => e.address.toLowerCase() === email.toLowerCase());
            if (existingEmail) {
                status = 'duplicate';
                statusText = 'Already exists';
                icon = `
                    <svg class="email-preview-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                `;
                duplicateCount++;
            } else {
                status = 'valid';
                statusText = 'Valid';
                icon = `
                    <svg class="email-preview-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                `;
                validCount++;
            }
        }
        
        previewItem.classList.add(status);
        previewItem.innerHTML = `
            ${icon}
            <span class="email-preview-text">${email}</span>
            <span class="email-preview-status ${status}">${statusText}</span>
        `;
        
        emailListPreview.appendChild(previewItem);
    });
    
    // Update preview header with counts
    const previewHeader = bulkEmailPreview.querySelector('h4');
    previewHeader.innerHTML = `Email Preview: ${validCount} valid, ${invalidCount} invalid, ${duplicateCount} duplicates`;
    
    bulkEmailPreview.style.display = 'block';
    
    // Enable/disable the add button based on valid emails
    if (validCount > 0) {
        confirmBulkAddEmails.disabled = false;
        confirmBulkAddEmails.textContent = `Add ${validCount} Valid Email${validCount > 1 ? 's' : ''}`;
    } else {
        confirmBulkAddEmails.disabled = true;
        confirmBulkAddEmails.textContent = 'No Valid Emails';
    }
}

// Add new email
async function addNewEmail() {
    const emailAddress = emailInput.value.trim();
    const selectedGroupId = emailGroupSelect.value;
    
    if (!emailAddress || !isValidEmail(emailAddress)) {
        showNotification('Invalid Email', 'Please enter a valid email address', 'error');
        return;
    }
    
    if (!selectedGroupId) {
        showNotification('Select Group', 'Please select a group for this email', 'warning');
        return;
    }
    
    // Check if email already exists
    const existingEmail = emails.find(e => e.address.toLowerCase() === emailAddress.toLowerCase());
    if (existingEmail) {
        showNotification('Email Exists', 'This email address already exists', 'warning');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('todoemails')
            .insert([{ 
                address: emailAddress,
                group_id: selectedGroupId,
                status: 'active'
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        emails.push(data);
        
        renderEmailList();
        closeModal();
        
        // Select the new email
        selectEmail(data.id);
        
        // Show success notification
        showNotification('Email Added', `"${emailAddress}" has been added successfully.`);
        
    } catch (error) {
        console.error('Error adding email:', error);
        showNotification('Error', 'Failed to add email. Please try again.', 'error');
    }
}

// Bulk add emails
async function bulkAddEmails() {
    const emailText = bulkEmailsInput.value.trim();
    const selectedGroupId = bulkEmailGroupSelect.value;
    
    if (!emailText) {
        showNotification('No Emails', 'Please enter some email addresses.', 'warning');
        return;
    }
    
    if (!selectedGroupId) {
        showNotification('Select Group', 'Please select a group for these emails', 'warning');
        return;
    }
    
    const emailLines = emailText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    // Filter valid emails that don't already exist
    const validEmails = emailLines.filter(email => {
        return isValidEmail(email) && !emails.find(e => e.address.toLowerCase() === email.toLowerCase());
    });
    
    if (validEmails.length === 0) {
        showNotification('No Valid Emails', 'No valid new emails to add.', 'warning');
        return;
    }
    
    // Show confirmation
    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    const confirmed = await showConfirmation(
        'Bulk Add Emails',
        `Are you sure you want to add ${validEmails.length} email(s) to the "${selectedGroup.name}" group?\n\nThis will create new email accounts.`,
        'info',
        `Add ${validEmails.length} Email${validEmails.length > 1 ? 's' : ''}`,
        'Cancel'
    );
    
    if (!confirmed) return;
    
    // Show loading modal with progress
    showLoadingModal(
        'Adding Emails',
        `Adding ${validEmails.length} email(s) to your dashboard...`,
        true
    );
    
    try {
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Add emails one by one with progress updates
        for (let i = 0; i < validEmails.length; i++) {
            const email = validEmails[i];
            const progress = ((i + 1) / validEmails.length) * 100;
            
            // Update progress
            updateLoadingProgress(
                progress,
                `Processing email ${i + 1} of ${validEmails.length}: ${email}`
            );
            
            try {
                const { data, error } = await supabaseClient
                    .from('todoemails')
                    .insert([{ 
                        address: email,
                        group_id: selectedGroupId,
                        status: 'active'
                    }])
                    .select()
                    .single();
                
                if (error) throw error;
                
                emails.push(data);
                
                successCount++;
            } catch (error) {
                console.error(`Error adding email ${email}:`, error);
                errors.push(`${email}: ${error.message}`);
                errorCount++;
            }
            
            // Small delay to show progress
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Hide loading modal
        hideLoadingModal();
        
        // Refresh the email list
        renderEmailList();
        closeModal();
        
        // Show success notification with details
        if (successCount > 0) {
            let message = `Successfully added ${successCount} email(s) to "${selectedGroup.name}" group.`;
            if (errorCount > 0) {
                message += ` ${errorCount} failed.`;
            }
            showNotification('Emails Added', message, 'success');
        } else {
            showNotification('Error', 'Failed to add any emails.', 'error');
        }
        
        // Show detailed errors if any
        if (errors.length > 0) {
            console.error('Bulk email errors:', errors);
        }
        
    } catch (error) {
        console.error('Error in bulk add emails:', error);
        hideLoadingModal();
        showNotification('Error', 'Failed to add emails. Please try again.', 'error');
    }
}

// Add default tasks to an email
async function addDefaultTasks(emailId) {
    try {
        const defaultTasksData = DEFAULT_TASKS.map(task => ({
            email_id: emailId,
            name: task.name,
            points: task.points,
            done: false
        }));
        
        const { error } = await supabaseClient
            .from('todotasks')
            .insert(defaultTasksData);
        
        if (error) throw error;
        
        // Reload all tasks to include the new ones
        await loadTasks();
        await loadTasksForEmail(emailId);
        
    } catch (error) {
        console.error('Error adding default tasks:', error);
    }
}

// Show add task modal
function showAddTaskModal() {
    if (!currentEmailId) return;
    
    addTaskModal.classList.add('show');
    taskNameInput.value = '';
    taskPointsInput.value = '1';
    taskNameInput.focus();
}

// Add new task
async function addNewTask() {
    const taskName = taskNameInput.value.trim();
    const taskPoints = parseInt(taskPointsInput.value);
    
    if (!taskName || taskPoints < 1) {
        showNotification('Invalid Input', 'Please enter a valid task name and points', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('todotasks')
            .insert([{
                email_id: currentEmailId,
                name: taskName,
                points: taskPoints,
                done: false
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        currentEmailTasks.push(data);
        tasks.push(data);
        renderTasks();
        updateTotalScore();
        renderEmailList(); // Update score in sidebar
        closeModal();
        
        // Show success notification
        showNotification('Task Added', `"${taskName}" has been added successfully.`);
        
    } catch (error) {
        console.error('Error adding task:', error);
        showNotification('Error', 'Failed to add task. Please try again.', 'error');
    }
}

// Mark all tasks as done
async function markAllTasksDone() {
    if (!currentEmailId || currentEmailTasks.length === 0) return;
    
    try {
        const { error } = await supabaseClient
            .from('todotasks')
            .update({ done: true })
            .eq('email_id', currentEmailId);
        
        if (error) throw error;
        
        // Update local state in both arrays
        currentEmailTasks.forEach(task => task.done = true);
        tasks.forEach(task => {
            if (task.email_id === currentEmailId) {
                task.done = true;
            }
        });
        
        renderTasks();
        updateTotalScore();
        renderEmailList(); // Update threshold indicators
        
        // Show success notification
        showNotification('Tasks Completed', 'All tasks have been marked as done.');
        
    } catch (error) {
        console.error('Error marking all tasks done:', error);
        showNotification('Error', 'Failed to update tasks. Please try again.', 'error');
    }
}

// Reset all tasks
async function resetAllTasks() {
    if (!currentEmailId || currentEmailTasks.length === 0) return;
    
    const confirmed = await showConfirmation(
        'Reset All Tasks',
        'Are you sure you want to reset all tasks? This will mark all tasks as incomplete.',
        'warning',
        'Reset All',
        'Cancel'
    );
    
    if (!confirmed) return;
    
    try {
        const { error } = await supabaseClient
            .from('todotasks')
            .update({ done: false })
            .eq('email_id', currentEmailId);
        
        if (error) throw error;
        
        // Update local state in both arrays
        currentEmailTasks.forEach(task => task.done = false);
        tasks.forEach(task => {
            if (task.email_id === currentEmailId) {
                task.done = false;
            }
        });
        
        renderTasks();
        updateTotalScore();
        renderEmailList(); // Update threshold indicators
        
        // Show success notification
        showNotification('Tasks Reset', 'All tasks have been reset successfully.');
        
    } catch (error) {
        console.error('Error resetting tasks:', error);
        showNotification('Error', 'Failed to reset tasks. Please try again.', 'error');
    }
}

// Close modal
function closeModal() {
    document.querySelectorAll('.modal-container').forEach(modal => {
        modal.classList.remove('show');
    });
}

// Show confirmation modal
function showConfirmation(title, message, type = 'info', confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        confirmationTitle.textContent = title;
        confirmationMessage.textContent = message;
        confirmationConfirm.textContent = confirmText;
        confirmationCancel.textContent = cancelText;
        
        // Reset icon classes
        confirmationIcon.className = 'confirmation-icon';
        
        // Set icon based on type
        if (type === 'warning') {
            confirmationIcon.classList.add('warning');
            confirmationIcon.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
            `;
        } else if (type === 'danger') {
            confirmationIcon.classList.add('danger');
            confirmationIcon.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                </svg>
            `;
        } else {
            confirmationIcon.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
            `;
        }
        
        // Set button styles based on type
        confirmationConfirm.className = 'btn';
        if (type === 'danger') {
            confirmationConfirm.classList.add('btn-warning');
        } else {
            confirmationConfirm.classList.add('btn-primary');
        }
        
        confirmationModal.classList.add('show');
        window.currentConfirmationCallback = resolve;
    });
}

// Show notification toast
function showNotification(title, description, type = 'success', duration = 5000) {
    toastTitle.textContent = title;
    toastDescription.textContent = description;
    
    // Reset toast classes
    notificationToast.className = 'notification-toast';
    toastIcon.className = 'toast-icon';
    
    // Set icon and styling based on type
    if (type === 'warning') {
        notificationToast.classList.add('show');
        toastIcon.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
        `;
    } else if (type === 'error') {
        notificationToast.classList.add('show');
        toastIcon.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
            </svg>
        `;
    } else {
        notificationToast.classList.add('show');
        toastIcon.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
        `;
    }
    
    // Auto hide after duration
    setTimeout(() => {
        hideNotification();
    }, duration);
}

// Hide notification
function hideNotification() {
    notificationToast.classList.remove('show');
}

// Show loading modal
function showLoadingModal(title, message, showProgress = false) {
    loadingTitle.textContent = title;
    loadingMessage.textContent = message;
    progressContainer.style.display = showProgress ? 'block' : 'none';
    loadingDetails.textContent = '';
    loadingModal.classList.add('show');
}

// Hide loading modal
function hideLoadingModal() {
    loadingModal.classList.remove('show');
}

// Update loading progress
function updateLoadingProgress(percentage, details = '') {
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${Math.round(percentage)}%`;
    if (details) {
        loadingDetails.textContent = details;
    }
}

// Toggle task selection for bulk operations
function toggleTaskSelection(taskId) {
    if (selectedTasks.has(taskId)) {
        selectedTasks.delete(taskId);
    } else {
        selectedTasks.add(taskId);
    }
    
    // Update visual feedback for the specific task
    const taskItems = document.querySelectorAll('.task-item');
    taskItems.forEach(item => {
        const taskCheckbox = item.querySelector('.task-checkbox');
        if (taskCheckbox && taskCheckbox.getAttribute('onchange').includes(taskId)) {
            if (selectedTasks.has(taskId)) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        }
    });
    
    updateBulkActionButtons();
}

// Select all tasks
function selectAllTasks() {
    const allTaskIds = currentEmailTasks.map(task => task.id);
    
    if (selectedTasks.size === allTaskIds.length) {
        // Deselect all
        selectedTasks.clear();
        selectAllBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Select All
        `;
    } else {
        // Select all
        allTaskIds.forEach(id => selectedTasks.add(id));
        selectAllBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Deselect All
        `;
    }
    
    // Update visual states without re-rendering
    document.querySelectorAll('.task-item').forEach(item => {
        const taskCheckbox = item.querySelector('.task-checkbox');
        if (taskCheckbox) {
            const taskId = taskCheckbox.getAttribute('onchange').match(/'([^']+)'/)?.[1];
            if (taskId) {
                if (selectedTasks.has(taskId)) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            }
        }
    });
    
    updateBulkActionButtons();
}

// Update bulk action buttons state
function updateBulkActionButtons() {
    const selectedCount = selectedTasks.size;
    
    if (selectedCount > 0) {
        bulkDeleteBtn.disabled = false;
        bulkMoveBtn.disabled = false;
        bulkDeleteBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
            Delete Selected (${selectedCount})
        `;
        bulkMoveBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Move Selected (${selectedCount})
        `;
    } else {
        bulkDeleteBtn.disabled = true;
        bulkMoveBtn.disabled = true;
        bulkDeleteBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
            Delete Selected
        `;
        bulkMoveBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Move Selected
        `;
    }
}

// Bulk delete selected tasks
async function bulkDeleteTasks() {
    if (selectedTasks.size === 0) return;
    
    const selectedTasksList = Array.from(selectedTasks);
    const taskNames = selectedTasksList.map(id => {
        const task = currentEmailTasks.find(t => t.id === id);
        return task ? task.name : 'Unknown Task';
    });
    
    const confirmed = await showConfirmation(
        'Delete Selected Tasks',
        `Are you sure you want to delete ${selectedTasks.size} selected task(s)? This action cannot be undone.\n\nTasks to delete:\n${taskNames.join('\n')}`,
        'danger',
        'Delete All',
        'Cancel'
    );
    
    if (!confirmed) return;
    
    try {
        // Delete from Supabase
        const { error } = await supabaseClient
            .from('todotasks')
            .delete()
            .in('id', selectedTasksList);
        
        if (error) throw error;
        
        // Remove from local state
        selectedTasksList.forEach(taskId => {
            // Remove from currentEmailTasks
            const currentIndex = currentEmailTasks.findIndex(t => t.id === taskId);
            if (currentIndex > -1) {
                currentEmailTasks.splice(currentIndex, 1);
            }
            
            // Remove from global tasks
            const globalIndex = tasks.findIndex(t => t.id === taskId);
            if (globalIndex > -1) {
                tasks.splice(globalIndex, 1);
            }
        });
        
        // Clear selection
        selectedTasks.clear();
        
        // Re-render and update
        renderTasks();
        updateTotalScore();
        renderEmailList();
        updateBulkActionButtons();
        
        // Show success notification
        showNotification('Tasks Deleted', `${selectedTasksList.length} task(s) have been deleted successfully.`);
        
    } catch (error) {
        console.error('Error deleting tasks:', error);
        showNotification('Error', 'Failed to delete tasks. Please try again.', 'error');
    }
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Utility function to create tables (for initial setup)
async function createTables() {
    // This function can be used to create the required tables in Supabase
    // You would typically run this once in the Supabase SQL editor
    
    const emailsTableSQL = `
        CREATE TABLE IF NOT EXISTS todoemails (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            address TEXT UNIQUE NOT NULL,
            group_id TEXT DEFAULT 'active',
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    `;
    
    const tasksTableSQL = `
        CREATE TABLE IF NOT EXISTS todotasks (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            email_id UUID REFERENCES todoemails(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            points INTEGER NOT NULL DEFAULT 1,
            done BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    `;
    
    const migrationSQL = `
        -- Migration to add group_id and status columns to existing todoemails table
        ALTER TABLE todoemails 
        ADD COLUMN IF NOT EXISTS group_id TEXT DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
        
        -- Update existing emails to have default group_id
        UPDATE todoemails 
        SET group_id = 'active' 
        WHERE group_id IS NULL;
        
        -- Update existing emails to have default status
        UPDATE todoemails 
        SET status = 'active' 
        WHERE status IS NULL;
    `;
    
    console.log('=== NEW DATABASE SETUP ===');
    console.log('Emails table SQL:', emailsTableSQL);
    console.log('Tasks table SQL:', tasksTableSQL);
    console.log('\n=== MIGRATION FOR EXISTING DATABASE ===');
    console.log('Migration SQL:', migrationSQL);
    console.log('\nRun the appropriate SQL commands in your Supabase SQL editor.');
}

// Filter emails based on search input
function filterEmails() {
    const searchTerm = emailSearch.value.toLowerCase().trim();
    
    if (searchTerm === '') {
        renderEmailList();
        return;
    }
    
    const filteredEmails = emails.filter(email => 
        email.address.toLowerCase().includes(searchTerm)
    );
    
    renderEmailList(filteredEmails);
}

// Apply default tasks to all emails
async function applyDefaultTasksToAllEmails() {
    if (emails.length === 0) {
        showNotification('No Emails', 'Please add some emails first.', 'warning');
        return;
    }
    
    const confirmed = await showConfirmation(
        'Apply Default Tasks',
        `This will add default tasks to all ${emails.length} emails. Existing tasks will be preserved. Continue?`,
        'info',
        'Apply to All',
        'Cancel'
    );
    
    if (!confirmed) return;
    
    // Show loading modal with progress
    showLoadingModal(
        'Applying Default Tasks',
        `Adding default tasks to ${emails.length} email(s)...`,
        true
    );
    
    try {
        let totalAdded = 0;
        
        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            const progress = ((i + 1) / emails.length) * 100;
            
            // Update progress
            updateLoadingProgress(
                progress,
                `Processing email ${i + 1} of ${emails.length}: ${email.address}`
            );
            
            // Get existing tasks for this email
            const { data: existingTasks, error: fetchError } = await supabaseClient
                .from('todotasks')
                .select('name')
                .eq('email_id', email.id);
            
            if (fetchError) throw fetchError;
            
            // Get existing task names
            const existingTaskNames = existingTasks.map(task => task.name);
            
            // Filter out default tasks that already exist
            const newTasks = DEFAULT_TASKS.filter(defaultTask => 
                !existingTaskNames.includes(defaultTask.name)
            );
            
            if (newTasks.length > 0) {
                // Insert only the new tasks
                const tasksToInsert = newTasks.map(task => ({
                    email_id: email.id,
                    name: task.name,
                    points: task.points,
                    done: false
                }));
                
                const { error: insertError } = await supabaseClient
                    .from('todotasks')
                    .insert(tasksToInsert);
                
                if (insertError) throw insertError;
                
                totalAdded += newTasks.length;
            }
            
            // Small delay to show progress
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Hide loading modal
        hideLoadingModal();
        
        // Reload all data to reflect changes
        await loadTasks();
        renderEmailList();
        
        if (currentEmailId) {
            await loadTasksForEmail(currentEmailId);
            renderTasks();
            updateTotalScore();
        }
        
        // Show success notification
        showNotification('Default Tasks Applied', `Successfully added ${totalAdded} new tasks across all emails!`);
        
    } catch (error) {
        console.error('Error applying default tasks:', error);
        hideLoadingModal();
        showNotification('Error', 'Failed to apply default tasks. Please try again.', 'error');
    }
}

// Load default tasks from Supabase
async function loadDefaultTasksFromStorage() {
    try {
        const { data, error } = await supabaseClient
            .from('default_tasks')
            .select('*')
            .order('created_at');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            const tasks = data.map(task => ({
                id: task.id,
                name: task.name,
                points: task.points
            }));
            DEFAULT_TASKS = tasks;
            return tasks;
        } else {
            DEFAULT_TASKS = [];
            return [];
        }
    } catch (error) {
        console.error('Error loading default tasks from Supabase:', error);
        // Fallback to localStorage if Supabase fails
        try {
            const saved = localStorage.getItem('emailDashboard_defaultTasks');
            if (saved) {
                const tasks = JSON.parse(saved);
                if (Array.isArray(tasks)) {
                    DEFAULT_TASKS = tasks;
                    return tasks;
                }
            }
        } catch (localError) {
            console.error('Error loading from localStorage fallback:', localError);
        }
    }
    
    // Ensure we always return an array
    DEFAULT_TASKS = [...ORIGINAL_DEFAULT_TASKS];
    return [...ORIGINAL_DEFAULT_TASKS];
}

// Save default tasks to Supabase
async function saveDefaultTasksToStorage(tasks) {
    try {
        // First, clear all existing default tasks
        await supabaseClient
            .from('default_tasks')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
        
        // Then insert the new tasks
        if (tasks && tasks.length > 0) {
            const tasksToInsert = tasks.map(task => ({
                name: task.name,
                points: task.points
            }));
            
            const { error } = await supabaseClient
                .from('default_tasks')
                .insert(tasksToInsert);
            
            if (error) throw error;
        }
        
        // Update the global variable
        DEFAULT_TASKS = [...tasks];
        
        // Also save to localStorage as backup
        try {
            localStorage.setItem('emailDashboard_defaultTasks', JSON.stringify(tasks));
        } catch (localError) {
            console.warn('Could not save to localStorage backup:', localError);
        }
        
    } catch (error) {
        console.error('Error saving default tasks to Supabase:', error);
        // Fallback to localStorage if Supabase fails
        try {
            localStorage.setItem('emailDashboard_defaultTasks', JSON.stringify(tasks));
            DEFAULT_TASKS = [...tasks];
        } catch (localError) {
            console.error('Error saving to localStorage fallback:', localError);
        }
    }
}

// Show default tasks editor modal
async function showDefaultTasksEditor() {
    // Ensure default tasks are loaded
    if (DEFAULT_TASKS.length === 0) {
        await loadDefaultTasksFromStorage();
    }
    
    defaultTasksModal.classList.add('show');
    thresholdInput.value = THRESHOLD_POINTS;
    renderDefaultTasksEditor();
}

// Render default tasks in the editor
function renderDefaultTasksEditor() {
    defaultTasksList.innerHTML = '';
    
    // Ensure DEFAULT_TASKS is always an array
    if (!Array.isArray(DEFAULT_TASKS)) {
        DEFAULT_TASKS = [];
    }
    
    if (DEFAULT_TASKS.length === 0) {
        defaultTasksList.innerHTML = `
            <div class="empty-state">
                <p>No default tasks yet. Add some tasks to get started!</p>
            </div>
        `;
        return;
    }
    
    DEFAULT_TASKS.forEach((task, index) => {
        const taskItem = document.createElement('div');
        taskItem.className = 'default-task-item';
        taskItem.innerHTML = `
            <div class="default-task-content">
                <div class="default-task-readonly">
                    <div class="default-task-info">
                        <div class="default-task-name-display">${task.name}</div>
                        <div class="default-task-points-display">${task.points} points</div>
                    </div>
                    <div class="default-task-actions">
                        <button class="edit-btn" onclick="editDefaultTask(${index})">Edit</button>
                        <button class="delete-btn" onclick="deleteDefaultTask(${index})">Delete</button>
                    </div>
                </div>
                <div class="default-task-edit-form">
                    <div class="form-row">
                        <div class="form-group">
                            <input type="text" class="default-task-name" value="${task.name}" data-index="${index}" placeholder="Task name">
                        </div>
                        <div class="form-group">
                            <input type="number" class="default-task-points" value="${task.points}" min="1" data-index="${index}" placeholder="Points">
                        </div>
                        <button class="save-btn" onclick="saveDefaultTask(${index})">Save</button>
                        <button class="cancel-btn" onclick="cancelEditDefaultTask(${index})">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        defaultTasksList.appendChild(taskItem);
    });
}

// Edit a default task
function editDefaultTask(index) {
    const taskItem = defaultTasksList.children[index];
    const readonlyView = taskItem.querySelector('.default-task-readonly');
    const editForm = taskItem.querySelector('.default-task-edit-form');
    
    readonlyView.style.display = 'none';
    editForm.style.display = 'block';
    editForm.classList.add('active');
    taskItem.classList.add('editing');
    
    // Focus on the name input
    const nameInput = editForm.querySelector('.default-task-name');
    nameInput.focus();
    nameInput.select();
}

// Save a default task edit
async function saveDefaultTask(index) {
    const taskItem = defaultTasksList.children[index];
    const nameInput = taskItem.querySelector('.default-task-name');
    const pointsInput = taskItem.querySelector('.default-task-points');
    
    const newName = nameInput.value.trim();
    const newPoints = parseInt(pointsInput.value);
    
    if (!newName || newPoints < 1) {
        alert('Please enter a valid task name and points');
        return;
    }
    
    // Update the task
    DEFAULT_TASKS[index] = { name: newName, points: newPoints };
    
    // Save to Supabase
    await saveDefaultTasksToStorage(DEFAULT_TASKS);
    
    // Re-render the editor
    renderDefaultTasksEditor();
}

// Cancel editing a default task
function cancelEditDefaultTask(index) {
    const taskItem = defaultTasksList.children[index];
    const readonlyView = taskItem.querySelector('.default-task-readonly');
    const editForm = taskItem.querySelector('.default-task-edit-form');
    
    readonlyView.style.display = 'flex';
    editForm.style.display = 'none';
    editForm.classList.remove('active');
    taskItem.classList.remove('editing');
    
    // Reset the input values to original
    const nameInput = editForm.querySelector('.default-task-name');
    const pointsInput = editForm.querySelector('.default-task-points');
    nameInput.value = DEFAULT_TASKS[index].name;
    pointsInput.value = DEFAULT_TASKS[index].points;
}

// Delete a default task
async function deleteDefaultTask(index) {
    if (!confirm('Are you sure you want to delete this default task?')) {
        return;
    }
    
    DEFAULT_TASKS.splice(index, 1);
    await saveDefaultTasksToStorage(DEFAULT_TASKS);
    renderDefaultTasksEditor();
}

// Add a new default task
async function addNewDefaultTask() {
    const name = newDefaultTaskName.value.trim();
    const points = parseInt(newDefaultTaskPoints.value);
    
    if (!name || points < 1) {
        alert('Please enter a valid task name and points');
        return;
    }
    
    // Check for duplicates
    if (DEFAULT_TASKS.some(task => task.name.toLowerCase() === name.toLowerCase())) {
        alert('A task with this name already exists');
        return;
    }
    
    DEFAULT_TASKS.push({ name, points });
    await saveDefaultTasksToStorage(DEFAULT_TASKS);
    
    // Clear the form
    newDefaultTaskName.value = '';
    newDefaultTaskPoints.value = '1';
    
    // Re-render the editor
    renderDefaultTasksEditor();
}

// Save all default tasks changes
async function saveDefaultTasks() {
    await saveDefaultTasksToStorage(DEFAULT_TASKS);
    closeModal();
    showNotification('Settings Saved', 'Default tasks have been saved successfully!');
}


// Load threshold from localStorage
function loadThresholdFromStorage() {
    try {
        const saved = localStorage.getItem('emailDashboard_threshold');
        if (saved) {
            return parseInt(saved) || 600;
        }
    } catch (error) {
        console.error('Error loading threshold from storage:', error);
    }
    return 600; // Default threshold
}

// Save threshold to localStorage
function saveThresholdToStorage(threshold) {
    try {
        localStorage.setItem('emailDashboard_threshold', threshold.toString());
        THRESHOLD_POINTS = threshold;
    } catch (error) {
        console.error('Error saving threshold to storage:', error);
    }
}

// Update threshold in real-time
function updateThreshold() {
    const newThreshold = parseInt(thresholdInput.value);
    if (newThreshold && newThreshold > 0) {
        THRESHOLD_POINTS = newThreshold;
        saveThresholdToStorage(newThreshold);
        
        // Re-render email list to update sections
        renderEmailList();
        
        // Update current email's score display if it has threshold styling
        updateTotalScore();
    }
}

// Hold-to-select functionality
function startHoldSelect(event, taskId) {
    // Don't start hold select if clicking on checkbox or delete button
    if (event.target.classList.contains('task-checkbox') || 
        event.target.classList.contains('task-delete-btn') ||
        event.target.classList.contains('bulk-select-checkbox') ||
        event.target.closest('.task-delete-btn') ||
        event.target.closest('.bulk-select-checkbox')) {
        return;
    }
    
    isHolding = true;
    holdStartTime = Date.now();
    
    // Add visual feedback immediately
    const taskItem = event.currentTarget;
    taskItem.classList.add('hold-preview');
    
    // Start timer for hold duration (500ms)
    holdTimer = setTimeout(() => {
        if (isHolding) {
            // Show bulk select checkboxes
            showBulkSelectMode();
            // Toggle selection of this task
            toggleTaskSelection(taskId);
            // Remove hold preview
            taskItem.classList.remove('hold-preview');
        }
    }, 500);
}

function endHoldSelect() {
    isHolding = false;
    if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
    }
    
    // Remove hold preview from all task items
    document.querySelectorAll('.task-item.hold-preview').forEach(item => {
        item.classList.remove('hold-preview');
    });
}

function showBulkSelectMode() {
    // Show bulk action buttons
    document.getElementById('bulkDeleteBtn').style.display = 'flex';
    document.getElementById('selectAllBtn').style.display = 'flex';
    
    // Add visual indicator to all task items
    document.querySelectorAll('.task-item').forEach(item => {
        item.classList.add('bulk-select-mode');
    });
}

function hideBulkSelectMode() {
    // Hide bulk action buttons
    document.getElementById('bulkDeleteBtn').style.display = 'none';
    document.getElementById('selectAllBtn').style.display = 'none';
    
    // Remove visual indicator
    document.querySelectorAll('.task-item').forEach(item => {
        item.classList.remove('bulk-select-mode', 'selected');
    });
    
    // Clear selection
    selectedTasks.clear();
    updateBulkActionButtons();
}

// Show bulk move modal
function showBulkMoveModal() {
    if (selectedTasks.size === 0) return;
    
    // Populate group select
    bulkMoveGroupSelect.innerHTML = '<option value="">Select a group</option>';
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        bulkMoveGroupSelect.appendChild(option);
    });
    
    bulkMoveModal.classList.add('show');
}

// Bulk move selected emails to a group
async function bulkMoveEmails() {
    const selectedGroupId = bulkMoveGroupSelect.value;
    
    if (!selectedGroupId) {
        showNotification('Select Group', 'Please select a group to move emails to', 'warning');
        return;
    }
    
    const selectedEmails = Array.from(selectedTasks).map(taskId => {
        const task = currentEmailTasks.find(t => t.id === taskId);
        return task ? emails.find(e => e.id === task.email_id) : null;
    }).filter(email => email !== null);
    
    if (selectedEmails.length === 0) {
        showNotification('No Emails', 'No valid emails selected', 'warning');
        return;
    }
    
    const confirmed = await showConfirmation(
        'Move Emails',
        `Are you sure you want to move ${selectedEmails.length} email(s) to the selected group?`,
        'info',
        'Move Emails',
        'Cancel'
    );
    
    if (!confirmed) return;
    
    try {
        const emailIds = selectedEmails.map(email => email.id);
        
        // Update in Supabase
        const { error } = await supabaseClient
            .from('todoemails')
            .update({ group_id: selectedGroupId })
            .in('id', emailIds);
        
        if (error) {
            // Check if it's a column not found error
            if (error.code === 'PGRST204' && error.message.includes('group_id')) {
                showNotification('Database Update Required', 'Please run the database migration to add group support. Check the console for SQL commands.', 'warning');
                console.log('=== DATABASE MIGRATION REQUIRED ===');
                console.log('The group_id column is missing from your todoemails table.');
                console.log('Please run this SQL in your Supabase SQL editor:');
                console.log(`
ALTER TABLE todoemails 
ADD COLUMN IF NOT EXISTS group_id TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

UPDATE todoemails 
SET group_id = 'active' 
WHERE group_id IS NULL;

UPDATE todoemails 
SET status = 'active' 
WHERE status IS NULL;
                `);
                return;
            }
            throw error;
        }
        
        // Update local state
        selectedEmails.forEach(email => {
            email.group_id = selectedGroupId;
        });
        
        // Clear selection
        selectedTasks.clear();
        
        // Re-render email list
        renderEmailList();
        updateBulkActionButtons();
        closeModal();
        
        // Show success notification
        const group = groups.find(g => g.id === selectedGroupId);
        showNotification('Emails Moved', `${selectedEmails.length} email(s) moved to "${group.name}" group.`);
        
    } catch (error) {
        console.error('Error moving emails:', error);
        showNotification('Error', 'Failed to move emails. Please try again.', 'error');
    }
}

// Call createTables on load to show the SQL (for setup purposes)
createTables();
