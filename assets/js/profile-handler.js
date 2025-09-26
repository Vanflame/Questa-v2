// Profile Management Handler
// Handles all profile-related functionality including edit, password change, notifications, and privacy

// Make functions globally available
window.editProfile = editProfile;
window.changePassword = changePassword;
window.notificationSettings = notificationSettings;
window.privacySettings = privacySettings;
window.exportData = exportData;
window.deleteAccount = deleteAccount;

// Edit Profile Modal
function editProfile() {
    console.log('editProfile called from profile-handler.js');
    const currentUser = window.currentUser;
    if (!currentUser) {
        if (window.showToast) {
            window.window.showToast('Please log in to edit your profile', 'error');
        } else {
            alert('Please log in to edit your profile');
        }
        return;
    }

    const modalContent = `
        <div class="profile-edit-form">
            <h3>Edit Profile</h3>
            <form id="edit-profile-form" onsubmit="return false;">
                <div class="form-group">
                    <label for="edit-username">Username</label>
                    <input type="text" id="edit-username" name="username" value="${currentUser.user_metadata?.username || currentUser.email.split('@')[0]}" required>
                </div>
                <div class="form-group">
                    <label for="edit-full-name">Full Name</label>
                    <input type="text" id="edit-full-name" name="full_name" value="${currentUser.user_metadata?.full_name || ''}" placeholder="Enter your full name">
                </div>
                <div class="form-group">
                    <label for="edit-phone">Phone Number</label>
                    <input type="tel" id="edit-phone" name="phone" value="${currentUser.user_metadata?.phone || ''}" placeholder="Enter your phone number">
                </div>
                <div class="form-group">
                    <label for="edit-bio">Bio</label>
                    <textarea id="edit-bio" name="bio" placeholder="Tell us about yourself" rows="3">${currentUser.user_metadata?.bio || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="handleEditProfileClick()">Save Changes</button>
                </div>
            </form>
        </div>
    `;

    if (window.openModal) {
        window.openModal({
            title: 'Edit Profile',
            content: modalContent,
            closable: false, // Remove X close button
            primaryButton: null, // Remove default OK button
            secondaryButton: null, // Remove default secondary button
            onOpen: () => {
                console.log('Edit profile modal opened');
                // No need for complex event listeners since we're using direct onclick
            }
        });
    }
}

// Handle Edit Profile Form Submission
async function handleEditProfile(e) {
    console.log('handleEditProfile called', e);
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Profile edit form submitted');
    
    const form = e.target;
    const formData = new FormData(form);
    const username = document.getElementById('edit-username').value.trim();
    const fullName = document.getElementById('edit-full-name').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();

    console.log('Form data:', { username, fullName, phone, bio });

    if (!username) {
        if (window.showToast) {
            window.window.showToast('Username is required', 'error');
        } else {
            alert('Username is required');
        }
        return;
    }

    try {
        showLoading('Updating profile...');

        // Update user metadata
        const { error } = await supabaseClient.auth.updateUser({
            data: {
                username: username,
                full_name: fullName,
                phone: phone,
                bio: bio
            }
        });

        if (error) {
            throw error;
        }

        // Update local user data
        window.currentUser = {
            ...window.currentUser,
            user_metadata: {
                ...window.currentUser.user_metadata,
                username: username,
                full_name: fullName,
                phone: phone,
                bio: bio
            }
        };

        // Refresh profile display
        if (typeof loadProfileData === 'function') {
            loadProfileData();
        }

        hideLoading();
        closeProfileModal();
        if (window.showToast) {
            window.window.showToast('Profile updated successfully!', 'success');
        } else {
            alert('Profile updated successfully!');
        }

    } catch (error) {
        hideLoading();
        console.error('Error updating profile:', error);
        if (window.showToast) {
            window.window.showToast(error.message || 'Failed to update profile', 'error');
        } else {
            alert(error.message || 'Failed to update profile');
        }
    }
}

// Handle Edit Profile Button Click (Direct)
async function handleEditProfileClick() {
    console.log('handleEditProfileClick called');
    
    const username = document.getElementById('edit-username').value.trim();
    const fullName = document.getElementById('edit-full-name').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();

    console.log('Form data:', { username, fullName, phone, bio });

    if (!username) {
        if (window.showToast) {
            window.window.showToast('Username is required', 'error');
        } else {
            alert('Username is required');
        }
        return;
    }

    try {
        // Show loading indicator
        console.log('Showing loading...');

        // Update user metadata
        const { error } = await supabaseClient.auth.updateUser({
            data: {
                username: username,
                full_name: fullName,
                phone: phone,
                bio: bio
            }
        });

        if (error) {
            throw error;
        }

        // Update local user data
        window.currentUser = {
            ...window.currentUser,
            user_metadata: {
                ...window.currentUser.user_metadata,
                username: username,
                full_name: fullName,
                phone: phone,
                bio: bio
            }
        };

        // Hide loading indicator
        console.log('Hiding loading...');
        
        if (window.showToast) {
            window.window.showToast('Profile updated successfully!', 'success');
        } else {
            alert('Profile updated successfully!');
        }
        
        if (window.closeModal) {
            window.closeModal();
        }

        // Refresh profile display if function exists
        if (window.loadUserProfile) {
            window.loadUserProfile();
        }

    } catch (error) {
        console.error('Error updating profile:', error);
        
        // Hide loading indicator
        console.log('Hiding loading...');
        
        if (window.showToast) {
            window.window.showToast('Failed to update profile. Please try again.', 'error');
        } else {
            alert('Failed to update profile. Please try again.');
        }
    }
}

// Make the function globally available
window.handleEditProfileClick = handleEditProfileClick;

// Change Password Modal
function changePassword() {
    const modalContent = `
        <div class="password-change-form">
            <h3>Change Password</h3>
            <form id="change-password-form">
                <div class="form-group">
                    <label for="current-password">Current Password</label>
                    <input type="password" id="current-password" required>
                </div>
                <div class="form-group">
                    <label for="new-password">New Password</label>
                    <input type="password" id="new-password" required minlength="6">
                    <small class="form-help">Password must be at least 6 characters long</small>
                </div>
                <div class="form-group">
                    <label for="confirm-password">Confirm New Password</label>
                    <input type="password" id="confirm-password" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Change Password</button>
                </div>
            </form>
        </div>
    `;

    if (window.openModal) {
        window.openModal({
            title: 'Change Password',
            content: modalContent,
            closable: false, // Remove X close button
            primaryButton: null, // Remove default OK button
            secondaryButton: null, // Remove default secondary button
            onOpen: () => {
                document.getElementById('change-password-form').addEventListener('submit', handleChangePassword);
            }
        });
    }
}

// Handle Change Password Form Submission
async function handleChangePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        if (window.showToast) {
            window.window.showToast('New passwords do not match', 'error');
        } else {
            alert('New passwords do not match');
        }
        return;
    }

    if (newPassword.length < 6) {
        if (window.showToast) {
            window.window.showToast('Password must be at least 6 characters long', 'error');
        } else {
            alert('Password must be at least 6 characters long');
        }
        return;
    }

    try {
        showLoading('Changing password...');

        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) {
            throw error;
        }

        hideLoading();
        closeProfileModal();
        if (window.showToast) {
            window.window.showToast('Password changed successfully!', 'success');
        } else {
            alert('Password changed successfully!');
        }

    } catch (error) {
        hideLoading();
        console.error('Error changing password:', error);
        if (window.showToast) {
            window.window.showToast(error.message || 'Failed to change password', 'error');
        } else {
            alert(error.message || 'Failed to change password');
        }
    }
}

// Notification Preferences Modal
function notificationSettings() {
    const modalContent = `
        <div class="notification-settings-form">
            <h3>Notification Preferences</h3>
            <form id="notification-settings-form">
                <div class="notification-group">
                    <h4>Email Notifications</h4>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="email-tasks" checked>
                            <span class="checkmark"></span>
                            Task assignments and updates
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="email-earnings" checked>
                            <span class="checkmark"></span>
                            Earnings and payment notifications
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="email-account" checked>
                            <span class="checkmark"></span>
                            Account security and updates
                        </label>
                    </div>
                </div>
                
                <div class="notification-group">
                    <h4>Push Notifications</h4>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="push-tasks" checked>
                            <span class="checkmark"></span>
                            New task notifications
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="push-reminders" checked>
                            <span class="checkmark"></span>
                            Task reminders
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="push-achievements">
                            <span class="checkmark"></span>
                            Achievement notifications
                        </label>
                    </div>
                </div>

                <div class="notification-group">
                    <h4>Frequency</h4>
                    <div class="form-group">
                        <label for="email-frequency">Email Frequency</label>
                        <select id="email-frequency">
                            <option value="immediate">Immediate</option>
                            <option value="daily" selected>Daily Digest</option>
                            <option value="weekly">Weekly Summary</option>
                        </select>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Preferences</button>
                </div>
            </form>
        </div>
    `;

    if (window.openModal) {
        window.openModal({
            title: 'Notification Preferences',
            content: modalContent,
            closable: false, // Remove X close button
            primaryButton: null, // Remove default OK button
            secondaryButton: null, // Remove default secondary button
            onOpen: () => {
                loadNotificationSettings();
                document.getElementById('notification-settings-form').addEventListener('submit', handleNotificationSettings);
            }
        });
    }
}

// Load Notification Settings
async function loadNotificationSettings() {
    try {
        const { data: settings, error } = await supabaseClient
            .from('user_notification_settings')
            .select('*')
            .eq('user_id', window.currentUser?.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error loading notification settings:', error);
            return;
        }

        if (settings) {
            // Populate form with saved settings
            document.getElementById('email-tasks').checked = settings.email_tasks || false;
            document.getElementById('email-earnings').checked = settings.email_earnings || false;
            document.getElementById('email-account').checked = settings.email_account || false;
            document.getElementById('push-tasks').checked = settings.push_tasks || false;
            document.getElementById('push-reminders').checked = settings.push_reminders || false;
            document.getElementById('push-achievements').checked = settings.push_achievements || false;
            document.getElementById('email-frequency').value = settings.email_frequency || 'daily';
        }
    } catch (error) {
        console.error('Error loading notification settings:', error);
    }
}

// Handle Notification Settings Form Submission
async function handleNotificationSettings(e) {
    e.preventDefault();
    
    const settings = {
        email_tasks: document.getElementById('email-tasks').checked,
        email_earnings: document.getElementById('email-earnings').checked,
        email_account: document.getElementById('email-account').checked,
        push_tasks: document.getElementById('push-tasks').checked,
        push_reminders: document.getElementById('push-reminders').checked,
        push_achievements: document.getElementById('push-achievements').checked,
        email_frequency: document.getElementById('email-frequency').value
    };

    try {
        showLoading('Saving notification preferences...');

        const { error } = await supabaseClient
            .from('user_notification_settings')
            .upsert({
                user_id: window.currentUser.id,
                ...settings,
                updated_at: new Date().toISOString()
            });

        if (error) {
            throw error;
        }

        hideLoading();
        closeProfileModal();
        if (window.showToast) {
            window.window.showToast('Notification preferences saved!', 'success');
        } else {
            alert('Notification preferences saved!');
        }

    } catch (error) {
        hideLoading();
        console.error('Error saving notification settings:', error);
        if (window.showToast) {
            window.showToast(error.message || 'Failed to save notification preferences', 'error');
        } else {
            alert(error.message || 'Failed to save notification preferences');
        }
    }
}

// Privacy Settings Modal
function privacySettings() {
    const modalContent = `
        <div class="privacy-settings-form">
            <h3>Privacy Settings</h3>
            <form id="privacy-settings-form">
                <div class="privacy-group">
                    <h4>Profile Visibility</h4>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="profile-public" checked>
                            <span class="checkmark"></span>
                            Make profile visible to other users
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="show-earnings">
                            <span class="checkmark"></span>
                            Show earnings in public profile
                        </label>
                    </div>
                </div>
                
                <div class="privacy-group">
                    <h4>Data Sharing</h4>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="share-analytics" checked>
                            <span class="checkmark"></span>
                            Share anonymous usage data to improve the platform
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="marketing-emails">
                            <span class="checkmark"></span>
                            Receive marketing emails and updates
                        </label>
                    </div>
                </div>

                <div class="privacy-group">
                    <h4>Account Security</h4>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="two-factor" checked>
                            <span class="checkmark"></span>
                            Enable two-factor authentication
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="login-notifications" checked>
                            <span class="checkmark"></span>
                            Get notified of new login attempts
                        </label>
                    </div>
                </div>

                <div class="privacy-group">
                    <h4>Data Management</h4>
                    <div class="form-group">
                        <button type="button" class="btn btn-outline" onclick="exportData()">Export My Data</button>
                        <small class="form-help">Download a copy of all your data</small>
                    </div>
                    <div class="form-group">
                        <button type="button" class="btn btn-danger" onclick="deleteAccount()">Delete Account</button>
                        <small class="form-help">Permanently delete your account and all data</small>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Privacy Settings</button>
                </div>
            </form>
        </div>
    `;

    if (window.openModal) {
        window.openModal({
            title: 'Privacy Settings',
            content: modalContent,
            closable: false, // Remove X close button
            primaryButton: null, // Remove default OK button
            secondaryButton: null, // Remove default secondary button
            onOpen: () => {
                loadPrivacySettings();
                document.getElementById('privacy-settings-form').addEventListener('submit', handlePrivacySettings);
            }
        });
    }
}

// Load Privacy Settings
async function loadPrivacySettings() {
    try {
        const { data: settings, error } = await supabaseClient
            .from('user_privacy_settings')
            .select('*')
            .eq('user_id', window.currentUser?.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error loading privacy settings:', error);
            return;
        }

        if (settings) {
            document.getElementById('profile-public').checked = settings.profile_public || false;
            document.getElementById('show-earnings').checked = settings.show_earnings || false;
            document.getElementById('share-analytics').checked = settings.share_analytics || false;
            document.getElementById('marketing-emails').checked = settings.marketing_emails || false;
            document.getElementById('two-factor').checked = settings.two_factor || false;
            document.getElementById('login-notifications').checked = settings.login_notifications || false;
        }
    } catch (error) {
        console.error('Error loading privacy settings:', error);
    }
}

// Handle Privacy Settings Form Submission
async function handlePrivacySettings(e) {
    e.preventDefault();
    
    const settings = {
        profile_public: document.getElementById('profile-public').checked,
        show_earnings: document.getElementById('show-earnings').checked,
        share_analytics: document.getElementById('share-analytics').checked,
        marketing_emails: document.getElementById('marketing-emails').checked,
        two_factor: document.getElementById('two-factor').checked,
        login_notifications: document.getElementById('login-notifications').checked
    };

    try {
        showLoading('Saving privacy settings...');

        const { error } = await supabaseClient
            .from('user_privacy_settings')
            .upsert({
                user_id: window.currentUser.id,
                ...settings,
                updated_at: new Date().toISOString()
            });

        if (error) {
            throw error;
        }

        hideLoading();
        closeProfileModal();
        if (window.showToast) {
            window.showToast('Privacy settings saved!', 'success');
        } else {
            alert('Privacy settings saved!');
        }

    } catch (error) {
        hideLoading();
        console.error('Error saving privacy settings:', error);
        if (window.showToast) {
            window.showToast(error.message || 'Failed to save privacy settings', 'error');
        } else {
            alert(error.message || 'Failed to save privacy settings');
        }
    }
}

// Export User Data
async function exportData() {
    try {
        showLoading('Preparing your data export...');

        const { data: userData, error } = await supabaseClient
            .from('user_data_export')
            .select('*')
            .eq('user_id', window.currentUser.id);

        if (error) {
            throw error;
        }

        // Create and download JSON file
        const dataStr = JSON.stringify(userData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `questa-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        hideLoading();
        if (window.showToast) {
            window.showToast('Data export completed!', 'success');
        } else {
            alert('Data export completed!');
        }

    } catch (error) {
        hideLoading();
        console.error('Error exporting data:', error);
        if (window.showToast) {
            window.showToast(error.message || 'Failed to export data', 'error');
        } else {
            alert(error.message || 'Failed to export data');
        }
    }
}

// Delete Account
async function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.')) {
        return;
    }

    const confirmText = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmText !== 'DELETE') {
        if (window.showToast) {
            window.showToast('Account deletion cancelled', 'info');
        } else {
            alert('Account deletion cancelled');
        }
        return;
    }

    try {
        showLoading('Deleting account...');

        // Delete user account
        const { error } = await supabaseClient.auth.admin.deleteUser(window.currentUser.id);

        if (error) {
            throw error;
        }

        hideLoading();
        if (window.showToast) {
            window.showToast('Account deleted successfully', 'success');
        } else {
            alert('Account deleted successfully');
        }
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = '/login/';
        }, 2000);

    } catch (error) {
        hideLoading();
        console.error('Error deleting account:', error);
        window.showToast(error.message || 'Failed to delete account', 'error');
    }
}

// Utility Functions - Removed recursive wrapper functions

// showToast wrapper removed - use window.showToast directly

function closeProfileModal() {
    // Call the actual closeModal function from ui-modal.js
    if (window.closeModal) {
        window.closeModal();
    }
}
