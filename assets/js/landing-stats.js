// Landing Page Statistics Module
// Get supabaseClient from global scope
let supabaseClient = null

// Initialize Supabase client
function initSupabaseClient() {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)
        return true
    }
    return false
}

// Statistics data
let landingStats = {
    averageReward: null,
    tasksCompleted: null,
    totalUsers: null,
    liveTasks: [],
    loaded: false
}

// Load landing page statistics
async function loadLandingStats() {
    try {
        console.log('Loading landing page statistics...')
        
        // Initialize Supabase client if not already done
        if (!supabaseClient) {
            if (!initSupabaseClient()) {
                console.log('Supabase not available, using demo data')
                // Set demo data
                landingStats.averageReward = 50
                landingStats.tasksCompleted = 1250
                landingStats.activeUsers = 342
                landingStats.liveTasks = [
                    {
                        id: 1,
                        title: "Social Media Engagement",
                        reward_amount: 25.00,
                        task_type: "social_media",
                        description: "Like and share our latest post"
                    },
                    {
                        id: 2,
                        title: "Content Creation",
                        reward_amount: 50.00,
                        task_type: "content",
                        description: "Create a short video review"
                    },
                    {
                        id: 3,
                        title: "Data Entry",
                        reward_amount: 15.00,
                        task_type: "data_entry",
                        description: "Enter product information"
                    }
                ]
                landingStats.loaded = true
                return true
            }
        }
        
        console.log('Supabase client initialized, fetching real data...')
        
        // Check if supabaseClient is available
        if (!supabaseClient) {
            console.error('Supabase client not available for landing stats')
            return false
        }
        
        // Load average reward from tasks
        console.log('Fetching reward data...')
        const { data: rewardTasksData, error: rewardTasksError } = await supabaseClient
            .from('tasks')
            .select('reward_amount')
            .eq('status', 'active')
        
        console.log('Reward query result:', { rewardTasksData, rewardTasksError })
        
        // Load completed tasks count
        console.log('Fetching submissions data...')
        const { data: submissionsData, error: submissionsError } = await supabaseClient
            .from('task_submissions')
            .select('id')
            .eq('status', 'approved')
        
        console.log('Submissions query result:', { submissionsData, submissionsError })
        
        // Load active users count (all users with role = 'user')
        console.log('Fetching users data...')
        const { data: usersData, error: usersError } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('role', 'user')
        
        console.log('Users query result:', { usersData, usersError })
        
        // Load top 3 live tasks - try simpler query first
        let liveTasksData = null
        let liveTasksError = null
        
        try {
            // First try to get all columns to see what's available
            const { data: allTasksData, error: allTasksError } = await supabaseClient
                .from('tasks')
                .select('*')
                .limit(3)
            
            console.log('All tasks query result:', { allTasksData, allTasksError })
            
            if (!allTasksError && allTasksData) {
                // Filter active tasks manually
                liveTasksData = allTasksData.filter(task => task.status === 'active').slice(0, 3)
                console.log('Filtered live tasks:', liveTasksData)
            } else {
                liveTasksError = allTasksError
            }
        } catch (error) {
            console.error('Error fetching tasks:', error)
            liveTasksError = error
        }
        
        // Process average reward
        if (!rewardTasksError && rewardTasksData && rewardTasksData.length > 0) {
            const totalReward = rewardTasksData.reduce((sum, task) => sum + parseFloat(task.reward_amount || 0), 0)
            landingStats.averageReward = Math.round(totalReward / rewardTasksData.length)
            console.log('Average reward calculated:', landingStats.averageReward)
        } else {
            console.log('No reward data available:', { rewardTasksError, rewardTasksData })
            if (rewardTasksError && rewardTasksError.message.includes('permission')) {
                console.log('Database access restricted - using demo data for landing page')
            }
        }
        
        // Process completed tasks count (add 42 to live data)
        if (!submissionsError && submissionsData) {
            landingStats.tasksCompleted = submissionsData.length + 42 // Add 42 to live data
            console.log('Tasks completed calculated (with +42):', landingStats.tasksCompleted)
        } else {
            console.log('No submissions data available:', { submissionsError, submissionsData })
        }
        
        // Process total users count (all registered users)
        if (!usersError && usersData) {
            landingStats.totalUsers = usersData.length
            console.log('Total users calculated:', landingStats.totalUsers)
        } else {
            console.log('No users data available:', { usersError, usersData })
        }
        
        // Process live tasks
        if (!liveTasksError && liveTasksData) {
            landingStats.liveTasks = liveTasksData
            console.log('Live tasks loaded:', landingStats.liveTasks)
        } else {
            console.log('No live tasks data available:', { liveTasksError, liveTasksData })
        }
        
        landingStats.loaded = true
        console.log('Landing stats loaded:', landingStats)
        
        return true
        
    } catch (error) {
        console.error('Error loading landing stats:', error)
        landingStats.loaded = true // Still mark as loaded to show fallbacks
        return false
    }
}

// Render landing page statistics
function renderLandingStats() {
    const totalUsersElement = document.getElementById('total-users')
    const totalEarningsElement = document.getElementById('total-earnings')
    const totalTasksElement = document.getElementById('total-tasks')
    
    if (!totalUsersElement || !totalEarningsElement || !totalTasksElement) {
        console.error('Stats elements not found')
        return
    }
    
    console.log('Rendering landing stats:', landingStats)
    
    // Calculate values with fallbacks only if no data was loaded
    const averageReward = landingStats.averageReward !== null ? landingStats.averageReward : 50
    const tasksCompleted = landingStats.tasksCompleted !== null ? landingStats.tasksCompleted : 1250
    const totalUsers = landingStats.totalUsers !== null ? landingStats.totalUsers : 342
    
    // Check if we're using demo data
    const isUsingDemoData = landingStats.averageReward === null || 
                           landingStats.tasksCompleted === null || 
                           landingStats.totalUsers === null
    
    // Calculate total earnings (approximate)
    const totalEarnings = tasksCompleted * averageReward
    
    // Animate numbers
    animateNumber(totalUsersElement, totalUsers, 0, 1000)
    animateNumber(totalEarningsElement, totalEarnings, 0, 2000, '₱')
    animateNumber(totalTasksElement, tasksCompleted, 0, 1500)
    
    // Add demo data indicator if needed
    if (isUsingDemoData) {
        const statsContainer = document.querySelector('.hero-stats')
        if (statsContainer && !statsContainer.querySelector('.demo-indicator')) {
            const demoIndicator = document.createElement('div')
            demoIndicator.className = 'demo-indicator'
            demoIndicator.innerHTML = `
                <small style="color: rgba(255,255,255,0.7); font-size: 0.75rem; text-align: center; display: block; margin-top: 8px;">
                    📊 Showing sample data
                </small>
            `
            statsContainer.appendChild(demoIndicator)
        }
    }
    
    // Render live tasks
    renderLiveTasks()
    
    console.log('Landing stats rendered')
}

// Render live tasks in the hero card
function renderLiveTasks() {
    const tasksContainer = document.querySelector('.hero-card-content')
    if (!tasksContainer) {
        console.error('Tasks container not found')
        return
    }
    
    const tasks = landingStats.liveTasks || []
    
    if (tasks.length === 0) {
        // Show default tasks if no live tasks available
        tasksContainer.innerHTML = `
            <div class="task-item">
                <div class="task-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="task-info">
                    <div class="task-name">Social Media Engagement</div>
                    <div class="task-reward">₱25.00</div>
                </div>
            </div>
            <div class="task-item">
                <div class="task-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M10 9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="task-info">
                    <div class="task-name">Content Creation</div>
                    <div class="task-reward">₱50.00</div>
                </div>
            </div>
            <div class="task-item">
                <div class="task-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 19C9 20.1046 9.89543 21 11 21H13C14.1046 21 15 20.1046 15 19V18H9V19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 1V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M21 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M5 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M18.36 5.64L16.95 7.05" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M5.64 5.64L7.05 7.05" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M18.36 18.36L16.95 16.95" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M5.64 18.36L7.05 16.95" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 7C9.79086 7 8 8.79086 8 11V18H16V11C16 8.79086 14.2091 7 12 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="task-info">
                    <div class="task-name">Data Entry</div>
                    <div class="task-reward">₱15.00</div>
                </div>
            </div>
        `
        return
    }
    
    // Render live tasks
    let tasksHTML = ''
    tasks.forEach((task, index) => {
        const icon = getTaskIcon(task.task_type || task.type || 'data_entry')
        const taskName = task.title || task.name || task.task_title || 'Task'
        const taskReward = task.reward_amount || task.reward || task.amount || 0
        
        tasksHTML += `
            <div class="task-item">
                <div class="task-icon">
                    ${icon}
            </div>
                <div class="task-info">
                    <div class="task-name">${taskName}</div>
                    <div class="task-reward">₱${parseFloat(taskReward).toFixed(2)}</div>
            </div>
            </div>
        `
    })
    
    tasksContainer.innerHTML = tasksHTML
}

// Get appropriate icon for task type
function getTaskIcon(taskType) {
    const icons = {
        'social_media': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        'content': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        'data_entry': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 19C9 20.1046 9.89543 21 11 21H13C14.1046 21 15 20.1046 15 19V18H9V19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 1V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M21 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18.36 5.64L16.95 7.05" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5.64 5.64L7.05 7.05" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M18.36 18.36L16.95 16.95" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5.64 18.36L7.05 16.95" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 7C9.79086 7 8 8.79086 8 11V18H16V11C16 8.79086 14.2091 7 12 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        'survey': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        'review': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.049 2.927C11.349 2.006 12.651 2.006 12.951 2.927L13.691 5.183C13.829 5.619 14.237 5.919 14.695 5.919H17.073C18.048 5.919 18.45 7.2 17.7 7.8L15.8 9.2C15.4 9.5 15.2 10 15.3 10.4L16.0 12.6C16.2 13.5 15.1 14.2 14.3 13.6L12.4 12.2C12.1 12 11.7 12 11.4 12.2L9.5 13.6C8.7 14.2 7.6 13.5 7.8 12.6L8.5 10.4C8.6 10 8.4 9.5 8.0 9.2L6.1 7.8C5.3 7.2 5.7 5.919 6.7 5.919H9.1C9.6 5.919 10.0 5.6 10.1 5.2L10.8 2.9C10.9 2.5 11.0 2.5 11.1 2.9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
    }
    
    return icons[taskType] || icons['data_entry'] // Default to data entry icon
}

// Animate number counting
function animateNumber(element, target, start, duration, prefix = '') {
    const startTime = performance.now()
    const startValue = start
    const endValue = target
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4)
        const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart)
        
        element.textContent = prefix + currentValue.toLocaleString()
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber)
        }
    }
    
    requestAnimationFrame(updateNumber)
}

// Initialize landing page statistics
async function initLandingStats() {
    console.log('Initializing landing page statistics...')
    
    // Show loading state initially
    const totalUsersElement = document.getElementById('total-users')
    const totalEarningsElement = document.getElementById('total-earnings')
    const totalTasksElement = document.getElementById('total-tasks')
    
    if (totalUsersElement) totalUsersElement.textContent = '0'
    if (totalEarningsElement) totalEarningsElement.textContent = '₱0'
    if (totalTasksElement) totalTasksElement.textContent = '0'
    
    // Load and render stats
    await loadLandingStats()
    renderLandingStats()
}

// Refresh live tasks periodically
function startLiveTaskRefresh() {
    // Refresh tasks every 30 seconds
    setInterval(async () => {
        if (supabaseClient) {
            try {
                const { data: allTasksData, error: allTasksError } = await supabaseClient
                    .from('tasks')
                    .select('*')
                    .limit(10) // Get more tasks to filter from
                
                if (!allTasksError && allTasksData) {
                    // Filter active tasks manually and sort by created_at
                    const activeTasks = allTasksData
                        .filter(task => task.status === 'active')
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                        .slice(0, 3)
                    
                    landingStats.liveTasks = activeTasks
                    renderLiveTasks()
                    console.log('Live tasks refreshed:', activeTasks)
                } else {
                    console.error('Error refreshing tasks:', allTasksError)
                }
            } catch (error) {
                console.error('Error refreshing live tasks:', error)
            }
        }
    }, 30000) // 30 seconds
}

// Export functions for global access
window.initLandingStats = initLandingStats
window.loadLandingStats = loadLandingStats
window.renderLandingStats = renderLandingStats
window.renderLiveTasks = renderLiveTasks

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure Supabase client is loaded
    setTimeout(() => {
        initLandingStats()
        startLiveTaskRefresh() // Start live task refresh
    }, 100)
})

console.log('Landing stats module loaded')
