// Notification Service - Handles task expiration warnings and external notifications

class NotificationService {
    constructor() {
        this.checkInterval = null;
        this.warningInterval = null;
        this.isSupported = 'Notification' in window;
        this.permission = Notification.permission;
        this.init();
    }

    async init() {
        // Request notification permission
        if (this.isSupported && this.permission === 'default') {
            this.permission = await Notification.requestPermission();
        }

        // Intercept all notification creation
        this.interceptNotificationCreation();

        // Start checking for task expirations
        this.startTaskExpirationChecks();
    }

    // Intercept all notification creation to show external notifications
    interceptNotificationCreation() {
        // Store the original functions
        const originalCreateNotification = window.createNotification;
        const originalCreateAdminNotification = window.createAdminNotification;
        
        // Override the global createNotification function
        if (originalCreateNotification) {
            window.createNotification = (title, message, type = 'info', options = {}) => {
                // Call the original function for internal notifications
                originalCreateNotification(title, message, type, options);
                
                // Also show as external notification
                this.showExternalNotification(title, message, '/logo.svg', type);
            };
        }
        
        // Override the admin notification creation
        if (originalCreateAdminNotification) {
            window.createAdminNotification = (notificationData) => {
                // Call the original function for internal notifications
                originalCreateAdminNotification(notificationData);
                
                // Also show as external notification
                this.showExternalNotification(
                    notificationData.title, 
                    notificationData.message, 
                    '/logo.svg',
                    notificationData.type || 'info'
                );
            };
        }
    }

    // Start checking for task expirations every minute
    startTaskExpirationChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        this.checkInterval = setInterval(() => {
            this.checkTaskExpirations();
        }, 60000); // Check every minute

        // Also check immediately
        this.checkTaskExpirations();
    }

    // Check for tasks that are about to expire
    async checkTaskExpirations() {
        try {
            const userId = window.currentUser?.id;
            if (!userId) return;

            // Get active task submissions
            const { data: submissions, error } = await supabaseClient
                .from('task_submissions')
                .select(`
                    *,
                    tasks:task_id (
                        title,
                        user_deadline,
                        created_at
                    )
                `)
                .eq('user_id', userId)
                .eq('status', 'pending')
                .not('tasks.user_deadline', 'is', null);

            if (error) {
                console.error('Error checking task expirations:', error);
                return;
            }

            if (!submissions || submissions.length === 0) return;

            const now = new Date();
            
            for (const submission of submissions) {
                const task = submission.tasks;
                if (!task || !task.user_deadline) continue;

                // Calculate deadline
                const submissionTime = new Date(submission.created_at);
                const deadline = new Date(submissionTime.getTime() + (task.user_deadline * 60 * 60 * 1000));
                const timeLeft = deadline.getTime() - now.getTime();

                // Check if task is expired
                if (timeLeft <= 0) {
                    await this.handleTaskExpiration(submission, task);
                }
                // Check if 15 minutes or less remaining
                else if (timeLeft <= 15 * 60 * 1000) {
                    await this.handleTaskWarning(submission, task, timeLeft);
                }
            }
        } catch (error) {
            console.error('Error in checkTaskExpirations:', error);
        }
    }

    // Handle task expiration
    async handleTaskExpiration(submission, task) {
        try {
            // Update submission status to expired
            const { error: updateError } = await supabaseClient
                .from('task_submissions')
                .update({ 
                    status: 'expired',
                    updated_at: new Date().toISOString()
                })
                .eq('id', submission.id);

            if (updateError) {
                console.error('Error updating expired submission:', updateError);
                return;
            }

            // Create notification
            await this.createNotification(
                'Task Expired',
                `Your task "${task.title}" has expired. You can restart it if you have remaining attempts.`,
                'warning'
            );

            // Show external notification
            this.showExternalNotification(
                'Task Expired',
                `"${task.title}" has expired`,
                '/logo.svg',
                'task-expired'
            );

            // Refresh dashboard data
            if (typeof window.refreshDashboardData === 'function') {
                window.refreshDashboardData();
            }

        } catch (error) {
            console.error('Error handling task expiration:', error);
        }
    }

    // Handle task warning (15 minutes or less)
    async handleTaskWarning(submission, task, timeLeft) {
        const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
        
        // Only show warning once per submission
        const warningKey = `warning_${submission.id}`;
        if (localStorage.getItem(warningKey)) return;

        try {
            // Create notification
            await this.createNotification(
                'Task Expiring Soon',
                `Your task "${task.title}" will expire in ${minutesLeft} minutes. Please submit your proof soon!`,
                'warning'
            );

            // Show external notification
            this.showExternalNotification(
                'Task Expiring Soon',
                `"${task.title}" expires in ${minutesLeft} minutes`,
                '/logo.svg',
                'task-warning'
            );

            // Mark warning as shown
            localStorage.setItem(warningKey, 'true');

        } catch (error) {
            console.error('Error handling task warning:', error);
        }
    }

    // Create internal notification
    async createNotification(title, message, type = 'info') {
        try {
            const userId = window.currentUser?.id;
            if (!userId) return;

            const { error } = await supabaseClient
                .from('notifications')
                .insert({
                    user_id: userId,
                    title: title,
                    message: message,
                    type: type,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('Error creating notification:', error);
            } else {
                console.log('Notification created successfully');
                
                // Refresh notifications if function exists
                if (typeof window.loadNotifications === 'function') {
                    await window.loadNotifications();
                }
            }
        } catch (error) {
            console.error('Error in createNotification:', error);
        }
    }

    // Show external notification (Android-style)
    showExternalNotification(title, body, icon = '/logo.svg', type = 'info') {
        if (!this.isSupported || this.permission !== 'granted') {
            console.log('External notifications not supported or not granted');
            return;
        }

        try {
            const notification = new Notification(title, {
                body: body,
                icon: icon,
                badge: '/logo.svg',
                tag: `questa-${type}-${Date.now()}`, // Unique tag to prevent duplicates
                requireInteraction: false,
                silent: false,
                data: {
                    type: type,
                    timestamp: Date.now()
                }
            });

            // Handle click
            notification.onclick = () => {
                // Focus the app window
                window.focus();
                
                // Close the notification
                notification.close();
                
                // Navigate to relevant section based on notification type
                if (type === 'task-expired' || type === 'task-warning' || title.includes('Task')) {
                    const tasksSection = document.getElementById('tasks-section');
                    if (tasksSection) {
                        tasksSection.scrollIntoView({ behavior: 'smooth' });
                    }
                } else if (type === 'withdrawal' || type === 'success' || title.includes('Withdrawal')) {
                    const walletSection = document.getElementById('wallet-section');
                    if (walletSection) {
                        walletSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }
                
                // Refresh notifications if function exists
                if (typeof window.loadNotifications === 'function') {
                    window.loadNotifications();
                }
            };

            // Auto-close after different times based on type
            let autoCloseTime = 5000; // Default 5 seconds
            if (type === 'task-expired' || type === 'task-warning') {
                autoCloseTime = 10000; // 10 seconds for important task notifications
            } else if (type === 'withdrawal' || type === 'success') {
                autoCloseTime = 7000; // 7 seconds for withdrawal notifications
            }

            setTimeout(() => {
                notification.close();
            }, autoCloseTime);

            console.log('External notification sent:', title);

        } catch (error) {
            console.error('Error showing external notification:', error);
        }
    }

    // Show toast notification (fallback for when external notifications aren't available)
    showToastNotification(title, message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            // Fallback to alert
            alert(`${title}: ${message}`);
        }
    }

    // Clean up expired warnings from localStorage
    cleanupExpiredWarnings() {
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('warning_')) {
                const timestamp = localStorage.getItem(key);
                if (timestamp && parseInt(timestamp) < oneDayAgo) {
                    localStorage.removeItem(key);
                }
            }
        }
    }

    // Stop all checks
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        if (this.warningInterval) {
            clearInterval(this.warningInterval);
            this.warningInterval = null;
        }
    }
}

// Initialize notification service
let notificationService = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.currentUser) {
        notificationService = new NotificationService();
        
        // Clean up expired warnings daily
        notificationService.cleanupExpiredWarnings();
    }
});

// Re-initialize when user logs in
window.addEventListener('userLoggedIn', function() {
    if (notificationService) {
        notificationService.stop();
    }
    notificationService = new NotificationService();
    notificationService.cleanupExpiredWarnings();
});

// Clean up when user logs out
window.addEventListener('userLoggedOut', function() {
    if (notificationService) {
        notificationService.stop();
        notificationService = null;
    }
});

// Export for global access
window.NotificationService = NotificationService;
window.notificationService = notificationService;
