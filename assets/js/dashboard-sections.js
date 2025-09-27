// Dashboard Sections Management
// Handles section navigation and content switching

let currentSection = 'tasks';

// Activity filter state
let activityFilters = {
    type: 'all', // all, withdrawal, transaction, submission, user_activity
    status: 'all', // all, pending, approved, rejected, completed
    dateRange: 'all', // all, today, week, month, custom
    customStartDate: '',
    customEndDate: '',
    amountRange: 'all', // all, positive, negative, custom
    customMinAmount: '',
    customMaxAmount: ''
};

// Format user ID with Q prefix
function formatUserId(userId) {
    if (!userId) return 'Q0000';
    
    // Extract numeric part from UUID (last 4 characters of the first 8)
    const numericPart = userId.substring(4, 8);
    
    // Convert to number and format with leading zeros
    const numericValue = parseInt(numericPart, 16);
    const formattedNumber = numericValue.toString().padStart(4, '0');
    
    return `Q${formattedNumber}`;
}

// Initialize section navigation
function initSectionNavigation() {
    const sectionNavBtns = document.querySelectorAll('.section-nav-btn');
    
    sectionNavBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetSection = this.getAttribute('data-section');
            switchSection(targetSection);
        });
    });
    
    // Initialize activity filter button
    initActivityFilter();
}

// Initialize activity filter functionality
function initActivityFilter() {
    const filterBtn = document.querySelector('.activity-filter-btn');
    if (filterBtn) {
        filterBtn.addEventListener('click', showActivityFilterModal);
    }
}

// Switch between dashboard sections
function switchSection(sectionName) {
    // Update navigation buttons
    const sectionNavBtns = document.querySelectorAll('.section-nav-btn');
    sectionNavBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-section') === sectionName) {
            btn.classList.add('active');
        }
    });
    
    // Update mobile menu highlighting
    if (typeof window.updateSectionHighlighting === 'function') {
        window.updateSectionHighlighting();
    }
    
    // Hide all sections
    const sections = document.querySelectorAll('.dashboard-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionName;
        
        // Load section-specific data
        loadSectionData(sectionName);
    }
}

// Load data for specific section
async function loadSectionData(sectionName) {
    switch (sectionName) {
        case 'overview':
            await loadOverviewData();
            break;
        case 'tasks':
            await loadTasksData();
            break;
        case 'wallet':
            await loadWalletData();
            break;
        case 'profile':
            await loadProfileData();
            break;
        case 'activity':
            await loadActivityData();
            break;
    }
}

// Load overview section data
async function loadOverviewData() {
    // Update stats
    updateStatsDisplay();
    
    // Load recent activity preview
    await loadRecentActivityPreview();
}

// Load tasks section data
async function loadTasksData() {
    const tasksContainer = document.getElementById('tasks');
    if (!tasksContainer) return;
    
    try {
        // Show loading state for tasks
        if (window.showRefreshIndicator) {
            window.showRefreshIndicator('Loading tasks...')
        }
        
        // Clear any existing content first
        tasksContainer.innerHTML = ''
        
        // First load the tasks data
        if (window.loadTasks) {
            await window.loadTasks();
        }
        
        // Then render the tasks
        if (window.renderTasks) {
            await window.renderTasks();
        }
        
        // If no tasks after loading, show empty state
        if (tasksContainer.innerHTML.includes('No active tasks available')) {
            tasksContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h3>No Tasks Available</h3>
                    <p>There are currently no active tasks available. Check back later for new opportunities to earn!</p>
                    <button class="btn btn-primary" onclick="switchSection('overview')">
                        <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Go to Overview
                    </button>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading tasks data:', error);
        
        // Show error state in tasks container
        tasksContainer.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <h3>Error Loading Tasks</h3>
                <p>There was a problem loading your tasks. Please try refreshing the page.</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23 4v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Refresh Page
                </button>
            </div>
        `;
    } finally {
        // Hide loading indicator
        if (window.hideRefreshIndicator) {
            window.hideRefreshIndicator()
        }
    }
}

// Load wallet section data
async function loadWalletData() {
    // Update detailed wallet balance
    const walletBalanceDetailed = document.getElementById('wallet-balance-detailed');
    if (walletBalanceDetailed && window.currentWallet) {
        walletBalanceDetailed.textContent = `₱${parseFloat(window.currentWallet.balance || 0).toFixed(2)}`;
    }
    
    // Transaction history is handled by renderWithdrawals() in wallet.js
}

// Load profile section data
async function loadProfileData() {
    const user = window.currentUser;
    if (!user) return;
    
    // Update profile information
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileUsername = document.getElementById('profile-username');
    const profileUserId = document.getElementById('profile-user-id');
    const profileEmailVerified = document.getElementById('profile-email-verified');
    const memberSince = document.getElementById('member-since');
    
    if (profileName) profileName.textContent = user.user_metadata?.username || user.email.split('@')[0];
    if (profileEmail) profileEmail.textContent = user.email;
    if (profileUsername) profileUsername.textContent = user.user_metadata?.username || user.email.split('@')[0];
    if (profileUserId) profileUserId.textContent = formatUserId(user.id);
    if (profileEmailVerified) profileEmailVerified.textContent = user.email_confirmed_at ? 'Yes' : 'No';
    if (memberSince) {
        const joinDate = new Date(user.created_at);
        memberSince.textContent = joinDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    // Load profile stats
    await loadProfileStats();
}

// Load activity section data
async function loadActivityData() {
    await loadActivityHistory();
}

// Show withdrawal modal
function showWithdrawalModal(preservedData = null) {
    console.log('showWithdrawalModal called', preservedData)
    if (window.openModal) {
        console.log('Opening withdrawal modal...')
        const modalConfig = {
            title: 'Withdraw Funds',
            closable: true,
            content: `
                <div class="withdrawal-modal-content">
                    <div class="withdrawal-info">
                        <div class="current-balance-display">
                            <span class="balance-label">Current Balance</span>
                            <span class="balance-amount" id="modal-balance-amount">₱0.00</span>
                        </div>
                        <p class="withdrawal-note">Enter the amount you want to withdraw and your payment details.</p>
                    </div>
                    
                    <form id="withdrawal-modal-form" class="withdrawal-form">
                        <div class="form-group">
                            <label for="withdraw-amount">Amount (₱)</label>
                            <input type="number" id="withdraw-amount" name="amount" min="10" step="0.01" required placeholder="0.00">
                            <small class="form-help">Minimum withdrawal: ₱10.00</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="withdraw-method">Payment Method</label>
                            <select id="withdraw-method" name="method" required>
                                <option value="">Select payment method</option>
                                <option value="gcash">GCash</option>
                                <option value="bank">Bank Account</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="withdraw-account-name">Account Holder Name</label>
                            <input type="text" id="withdraw-account-name" name="account_name" placeholder="Enter account holder name" required>
                            <small class="form-help">Full name as registered with the payment method</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="withdraw-account">Account Number</label>
                            <input type="text" id="withdraw-account" name="account_info" placeholder="Enter your account details" required>
                            <small class="form-help" id="account-help">Select a payment method to see specific requirements</small>
                        </div>
                        
                        <div class="withdrawal-summary">
                            <div class="summary-item">
                                <span>Withdrawal Amount:</span>
                                <span id="summary-amount">₱0.00</span>
                            </div>
                            <div class="summary-item">
                                <span>Payment Method:</span>
                                <span id="summary-method">-</span>
                            </div>
                            <div class="summary-item total">
                                <span>Total to be withdrawn:</span>
                                <span id="summary-total">₱0.00</span>
                            </div>
                        </div>
                    </form>
                </div>
            `,
            primaryButton: {
                text: 'Submit Withdrawal',
                action: async () => {
                    console.log('Submit withdrawal button clicked')
                    
                    // Show loading state immediately
                    const submitBtn = document.getElementById('modal-primary-btn');
                    console.log('Submit button found:', !!submitBtn)
                    
                    if (submitBtn) {
                        const originalText = submitBtn.textContent;
                        submitBtn.textContent = 'Submitting...';
                        submitBtn.disabled = true;
                        
                                    try {
                                        console.log('=== STARTING WITHDRAWAL SUBMISSION ===')
                                        const result = await handleWithdrawalSubmission();
                                        console.log('=== WITHDRAWAL SUBMISSION RESULT ===', result)
                                        console.log('Result type:', typeof result)
                                        console.log('Result === true:', result === true)
                                        console.log('Result === "validation_error":', result === 'validation_error')
                                        console.log('Result === false:', result === false)
                                        
                                        if (result === true) {
                                            console.log('✅ Withdrawal successful, closing modal and showing success message')
                                            // Close the withdrawal modal first
                                            if (window.closeModal) {
                                                console.log('Closing withdrawal modal...')
                                                window.closeModal();
                                            }
                                            
                                            // Then show success message after a small delay
                                            setTimeout(() => {
                                                console.log('Showing success modal...')
                                                showSuccessModal();
                                            }, 100);
                                            
                                            return true; // Close the withdrawal modal
                                        } else if (result === 'validation_error') {
                                            console.log('⚠️ Validation error occurred - custom modal already shown')
                                            console.log('Keeping withdrawal modal open for user to correct')
                                            // Validation error modal is already shown, just keep withdrawal modal open
                                            return false; // Keep modal open
                                        } else if (result === false) {
                                            console.log('❌ Withdrawal failed - showing error modal')
                                            showErrorModal('Withdrawal Failed', 'There was an error processing your withdrawal request. Please try again.')
                                            return false; // Keep modal open
                                        } else {
                                            console.log('❓ Unexpected result from handleWithdrawalSubmission:', result)
                                            console.log('Result type:', typeof result)
                                            showErrorModal('Unexpected Error', 'An unexpected error occurred. Please try again.')
                                            return false; // Keep modal open
                                        }
                                    } finally {
                            console.log('Resetting button state...')
                            // Reset button state
                            submitBtn.textContent = originalText;
                            submitBtn.disabled = false;
                            console.log('Button state reset complete')
                        }
                    } else {
                        console.error('Submit button not found, trying alternative selector...')
                        // Try alternative selector
                        const altBtn = document.querySelector('.modal-btn-primary');
                        if (altBtn) {
                            console.log('Alternative button found')
                            const originalText = altBtn.textContent;
                            altBtn.textContent = 'Submitting...';
                            altBtn.disabled = true;
                            
                            try {
                                const success = await handleWithdrawalSubmission();
                                // Handle success/error same as above
                                return success;
                            } finally {
                                altBtn.textContent = originalText;
                                altBtn.disabled = false;
                            }
                        } else {
                            console.error('No submit button found with any selector')
                            return false;
                        }
                    }
                }
            }
        }
        
        console.log('Opening modal with config:', modalConfig)
        window.openModal(modalConfig)
        
        // Update balance in modal (with delay to ensure modal is rendered)
        setTimeout(() => {
            const modalBalance = document.getElementById('modal-balance-amount');
            if (modalBalance) {
                // Try to get balance from multiple sources
                let balance = 0;
                
                if (window.userWallet !== undefined) {
                    balance = window.userWallet;
                    console.log('Using window.userWallet:', balance);
                } else if (window.currentWallet && window.currentWallet.balance !== undefined) {
                    balance = window.currentWallet.balance;
                    console.log('Using window.currentWallet.balance:', balance);
                } else {
                    // Try to get balance from the main balance display
                    const mainBalance = document.querySelector('.wallet-preview-amount, .mobile-wallet-amount, .current-balance');
                    if (mainBalance) {
                        const balanceText = mainBalance.textContent.replace('₱', '').replace(',', '');
                        balance = parseFloat(balanceText) || 0;
                        console.log('Using main balance display:', balance);
                    }
                }
                
                modalBalance.textContent = `₱${balance.toFixed(2)}`;
                console.log('Modal balance set to:', modalBalance.textContent);
            } else {
                console.error('Modal balance element not found');
            }
        }, 100);
        
        // Populate form with preserved data if available
        if (preservedData) {
            setTimeout(() => {
                const amountInput = document.getElementById('withdraw-amount');
                const methodSelect = document.getElementById('withdraw-method');
                const accountInput = document.getElementById('withdraw-account');
                
                if (amountInput && preservedData.amount) {
                    amountInput.value = preservedData.amount;
                }
                if (methodSelect && preservedData.method) {
                    methodSelect.value = preservedData.method;
                }
                if (accountInput && preservedData.accountInfo) {
                    accountInput.value = preservedData.accountInfo;
                }
                
                // Update summary
                updateWithdrawalSummary();
            }, 100);
        }
        
        // Setup form event listeners
        setupWithdrawalFormListeners();
        
        // Setup payment method change listener
        setupPaymentMethodListener();
        
        // Fix dropdown styling after modal opens
        setTimeout(() => {
            fixDropdownStyling();
        }, 100);
        
        // Also fix styling when modal content changes
        const modalObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const methodSelect = document.getElementById('withdraw-method');
                    if (methodSelect) {
                        setTimeout(() => {
                            fixDropdownStyling();
                        }, 50);
                    }
                }
            });
        });
        
        // Observe the modal content for changes
        const modalContent = document.querySelector('.modal-content, .withdrawal-modal-content');
        if (modalContent) {
            modalObserver.observe(modalContent, { childList: true, subtree: true });
        }
    }
}

// Show inline validation error
function showInlineValidationError(message) {
    console.log('showInlineValidationError called:', message)
    
    // Remove any existing error message
    const existingError = document.querySelector('.withdrawal-error-message');
    if (existingError) {
        console.log('Removing existing error message')
        existingError.remove();
    }
    
    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'withdrawal-error-message';
    errorDiv.style.cssText = `
        background-color: #fee2e2 !important;
        border: 2px solid #fca5a5 !important;
        color: #dc2626 !important;
        padding: 1rem !important;
        border-radius: 0.5rem !important;
        margin: 1rem 0 !important;
        font-size: 1rem !important;
        font-weight: 500 !important;
        text-align: center !important;
        position: relative !important;
        z-index: 1000 !important;
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
    `;
    errorDiv.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <span style="font-size: 1.2rem;">⚠️</span>
            <span>${message}</span>
        </div>
    `;
    
    // Insert error message in the modal body
    const modalBody = document.querySelector('.modal-body');
    console.log('Modal body found:', !!modalBody)
    
    if (modalBody) {
        // Insert at the top of modal body for maximum visibility
        console.log('Inserting error message at top of modal body')
        modalBody.insertBefore(errorDiv, modalBody.firstChild);
        
        // Auto-remove error after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                console.log('Auto-removing error message after 5 seconds')
                errorDiv.remove();
            }
        }, 5000);
        
        console.log('Error message inserted, checking visibility...')
        console.log('Error div parent:', errorDiv.parentNode)
        console.log('Error div visible:', errorDiv.offsetHeight > 0)
        console.log('Error div text:', errorDiv.textContent)
    } else {
        console.error('Modal body not found for error message')
    }
}

// Show validation error modal (custom implementation to avoid conflicts)
function showValidationErrorModal(title, message) {
    console.log('showValidationErrorModal called:', title, message)
    
    // Remove any existing validation modal
    const existingModal = document.getElementById('validation-error-modal');
    if (existingModal) {
        console.log('Removing existing validation modal')
        existingModal.remove();
    }
    
    // Create custom validation modal that doesn't interfere with withdrawal modal
    const validationModal = document.createElement('div');
    validationModal.id = 'validation-error-modal';
    validationModal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background-color: rgba(0, 0, 0, 0.5) !important;
        z-index: 10000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    `;
    
    validationModal.innerHTML = `
        <div style="
            background: white !important;
            border-radius: 12px !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
            max-width: 420px !important;
            width: 90% !important;
            margin: 1rem !important;
            border: 1px solid #e5e7eb !important;
            overflow: hidden !important;
        ">
            <div style="
                background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%) !important;
                padding: 1.25rem 1.5rem !important;
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
            ">
                <h3 style="
                    margin: 0 !important;
                    font-size: 1.125rem !important;
                    font-weight: 600 !important;
                    color: white !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 0.5rem !important;
                ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0 !important;">
                        <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        </svg>
                    ${title}
                </h3>
                <button id="validation-modal-close" style="
                    background: rgba(255, 255, 255, 0.2) !important;
                    border: none !important;
                    font-size: 1.25rem !important;
                    cursor: pointer !important;
                    color: white !important;
                    padding: 0.25rem !important;
                    width: 28px !important;
                    height: 28px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    border-radius: 6px !important;
                    transition: background-color 0.2s ease !important;
                " onmouseover="this.style.backgroundColor='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.backgroundColor='rgba(255, 255, 255, 0.2)'">&times;</button>
                    </div>
            <div style="padding: 2rem 1.5rem !important;">
                <div style="text-align: center !important;">
                    <div style="
                        width: 64px !important;
                        height: 64px !important;
                        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%) !important;
                        border-radius: 50% !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        margin: 0 auto 1.5rem auto !important;
                        border: 2px solid #fecaca !important;
                    ">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        </svg>
                    </div>
                    <h4 style="
                        margin: 0 0 0.75rem 0 !important;
                        color: #1f2937 !important;
                        font-size: 1.125rem !important;
                        font-weight: 600 !important;
                    ">Validation Error</h4>
                    <p style="
                        margin: 0 !important;
                        color: #6b7280 !important;
                        font-size: 0.95rem !important;
                        line-height: 1.6 !important;
                        max-width: 300px !important;
                        margin: 0 auto !important;
                    ">${message}</p>
                    </div>
                </div>
            <div style="
                padding: 1rem 1.5rem 1.5rem 1.5rem !important;
                background: #f9fafb !important;
                display: flex !important;
                justify-content: flex-end !important;
                gap: 0.75rem !important;
            ">
                <button id="validation-modal-ok" style="
                    background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%) !important;
                    color: white !important;
                    border: none !important;
                    padding: 0.75rem 1.5rem !important;
                    border-radius: 8px !important;
                    font-size: 0.875rem !important;
                    font-weight: 600 !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                    box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.3) !important;
                " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'">OK</button>
            </div>
                </div>
            `;
    
    // Add to body
    document.body.appendChild(validationModal);
    console.log('Validation modal added to body')
    
    // Add event listeners
    const closeBtn = document.getElementById('validation-modal-close');
    const okBtn = document.getElementById('validation-modal-ok');
    
    const closeModal = () => {
        console.log('Closing validation modal')
        validationModal.remove();
    };
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (okBtn) {
        okBtn.addEventListener('click', closeModal);
    }
    
    // Close on overlay click
    validationModal.addEventListener('click', (e) => {
        if (e.target === validationModal) {
            closeModal();
        }
    });
    
    console.log('Validation error modal opened successfully')
}

// Show success modal
function showSuccessModal() {
    console.log('showSuccessModal called')
    
    // Add a small delay to ensure withdrawal modal is fully closed
    setTimeout(() => {
        console.log('Attempting to show success modal...')
        
        if (window.openModal) {
            console.log('window.openModal is available, opening success modal')
            window.openModal({
                title: 'Withdrawal Submitted',
                content: `
                    <div style="text-align: center; padding: 2rem 1.5rem;">
                        <div style="
                            width: 80px;
                            height: 80px;
                            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 1.5rem auto;
                            border: 3px solid #10b981;
                            box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);
                        ">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                            </svg>
                        </div>
                        <h3 style="margin: 0 0 1rem 0; color: #1f2937; font-size: 1.25rem; font-weight: 600;">Withdrawal Request Submitted</h3>
                        <p style="margin: 0 0 0.75rem 0; color: #6b7280; font-size: 1rem; line-height: 1.6;">Your withdrawal request has been submitted and is pending review.</p>
                        <p style="margin: 0; color: #6b7280; font-size: 0.875rem; line-height: 1.5;">You will be notified once it's processed.</p>
                    </div>
                `,
                primaryButton: { 
                    text: 'OK', 
                    action: () => {
                        console.log('Success modal closed')
                        return true; // Close the success modal
                    }
                }
            });
            console.log('Success modal opened successfully')
        } else {
            console.error('window.openModal not available, using alert fallback')
            alert('Withdrawal request submitted successfully!');
        }
    }, 200); // Increased delay to ensure withdrawal modal is closed
}

// Show error modal
function showErrorModal(title, message) {
    console.log('showErrorModal called:', title, message)
    
        if (window.openModal) {
            window.openModal({
                title: title,
                content: `
                    <div style="text-align: center; padding: 2rem 1.5rem;">
                        <div style="
                            width: 80px;
                            height: 80px;
                            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 1.5rem auto;
                            border: 3px solid #dc2626;
                            box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.3);
                        ">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                            </svg>
                </div>
                        <h3 style="margin: 0 0 1rem 0; color: #1f2937; font-size: 1.25rem; font-weight: 600;">${title}</h3>
                        <p style="margin: 0; color: #6b7280; font-size: 1rem; line-height: 1.6;">${message}</p>
                    </div>
                `,
                primaryButton: { 
                    text: 'OK', 
                    action: () => {
                        console.log('Error modal closed')
                        return true; // Close the error modal
                    }
                }
            });
    } else {
        console.error('window.openModal not available')
        alert(`${title}: ${message}`);
    }
}

// Clear validation errors when user starts typing
function clearValidationError() {
    const existingError = document.querySelector('.withdrawal-error-message');
    if (existingError) {
        console.log('Clearing validation error message')
        existingError.remove();
    }
}

// Setup payment method change listener
function setupPaymentMethodListener() {
    const methodSelect = document.getElementById('withdraw-method');
    const accountInput = document.getElementById('withdraw-account');
    const accountHelp = document.getElementById('account-help');
    
    if (methodSelect && accountInput && accountHelp) {
        methodSelect.addEventListener('change', function() {
            const selectedMethod = this.value;
            console.log('Payment method changed to:', selectedMethod);
            
            // Clear any existing validation errors
            clearValidationError();
            
            // Update placeholder and help text based on selected method
            if (selectedMethod === 'gcash') {
                accountInput.placeholder = '09123456789';
                accountHelp.textContent = 'Enter your 11-digit GCash mobile number (e.g., 09123456789)';
                accountHelp.style.color = '#6b7280';
            } else if (selectedMethod === 'bank') {
                accountInput.placeholder = '1234567890';
                accountHelp.textContent = 'Enter your bank account number (8-20 characters, letters and numbers only)';
                accountHelp.style.color = '#6b7280';
            } else {
                accountInput.placeholder = 'Enter your account details';
                accountHelp.textContent = 'Select a payment method to see specific requirements';
                accountHelp.style.color = '#6b7280';
            }
            
            // Clear the input field when method changes
            accountInput.value = '';
            
            // Update summary
            updateWithdrawalSummary();
        });
    }
}

// Fix dropdown styling issues
function fixDropdownStyling() {
    const methodSelect = document.getElementById('withdraw-method');
    if (methodSelect) {
        console.log('Fixing dropdown styling for:', methodSelect);
        
        // Apply inline styles to ensure visibility
        methodSelect.style.cssText = `
            width: 100% !important;
            padding: 0.75rem !important;
            border: 1px solid #d1d5db !important;
            border-radius: 6px !important;
            background: white !important;
            font-size: 0.875rem !important;
            color: #374151 !important;
            appearance: none !important;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e") !important;
            background-position: right 0.5rem center !important;
            background-repeat: no-repeat !important;
            background-size: 1.5em 1.5em !important;
            padding-right: 2.5rem !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            min-height: 2.5rem !important;
            line-height: 1.5 !important;
            vertical-align: middle !important;
            display: block !important;
            box-sizing: border-box !important;
            max-width: 100% !important;
        `;
        
        // Ensure options are visible
        const options = methodSelect.querySelectorAll('option');
        options.forEach(option => {
            option.style.cssText = `
                padding: 0.5rem !important;
                white-space: nowrap !important;
                overflow: visible !important;
                text-overflow: unset !important;
                height: auto !important;
                line-height: 1.5 !important;
            `;
        });
        
        console.log('Dropdown styling applied successfully');
    } else {
        console.log('Method select not found for styling fix');
    }
}

// Setup withdrawal form event listeners
function setupWithdrawalFormListeners() {
    const amountInput = document.getElementById('withdraw-amount');
    const methodSelect = document.getElementById('withdraw-method');
    const accountInput = document.getElementById('withdraw-account');
    
    if (amountInput) {
        amountInput.addEventListener('input', () => {
            clearValidationError();
            updateWithdrawalSummary();
        });
    }
    
    if (methodSelect) {
        methodSelect.addEventListener('change', () => {
            clearValidationError();
            updateWithdrawalSummary();
        });
    }
    
    if (accountInput) {
        accountInput.addEventListener('input', () => {
            clearValidationError();
            updateWithdrawalSummary();
        });
    }
}

// Update withdrawal summary
function updateWithdrawalSummary() {
    const amount = parseFloat(document.getElementById('withdraw-amount')?.value) || 0;
    const method = document.getElementById('withdraw-method')?.value || '';
    
    const summaryAmount = document.getElementById('summary-amount');
    const summaryMethod = document.getElementById('summary-method');
    const summaryTotal = document.getElementById('summary-total');
    
    if (summaryAmount) {
        summaryAmount.textContent = `₱${amount.toFixed(2)}`;
    }
    
    if (summaryMethod) {
        let methodText = '-';
        if (method === 'gcash') {
            methodText = 'GCash';
        } else if (method === 'bank') {
            methodText = 'Bank Account';
        }
        summaryMethod.textContent = methodText;
    }
    
    if (summaryTotal) {
        summaryTotal.textContent = `₱${amount.toFixed(2)}`;
    }
}

// Handle withdrawal submission
async function handleWithdrawalSubmission() {
    console.log('Starting withdrawal submission...')
    const form = document.getElementById('withdrawal-modal-form');
    if (!form) {
        console.error('Withdrawal form not found')
        return false;
    }
    
    const formData = new FormData(form);
    const amount = parseFloat(formData.get('amount'));
    const method = formData.get('method');
    const accountName = formData.get('account_name');
    const accountInfo = formData.get('account_info');
    
    console.log('Form data:', { amount, method, accountName, accountInfo })
    
    // Basic validation
    if (!amount || amount < 10) {
        console.log('Validation failed: amount too low')
        showValidationErrorModal('Invalid Amount', 'Please enter a valid amount of at least ₱10.00.')
        return 'validation_error'; // Return special value for validation errors
    }
    
    if (!method) {
        console.log('Validation failed: no payment method')
        showValidationErrorModal('Payment Method Required', 'Please select a payment method for your withdrawal.')
        return 'validation_error'; // Return special value for validation errors
    }
    
    if (!accountName) {
        console.log('Validation failed: no account name')
        showValidationErrorModal('Account Name Required', 'Please provide the account holder name for the withdrawal.')
        return 'validation_error'; // Return special value for validation errors
    }
    
    if (!accountInfo) {
        console.log('Validation failed: no account info')
        showValidationErrorModal('Account Information Required', 'Please provide your account information for the withdrawal.')
        return 'validation_error'; // Return special value for validation errors
    }
    
    // Validate account info based on payment method
    if (method === 'gcash') {
        // GCash validation: should be 11 digits
        const gcashPattern = /^\d{11}$/;
        if (!gcashPattern.test(accountInfo)) {
            console.log('Validation failed: invalid GCash number')
            showValidationErrorModal('Invalid GCash Number', 'Please enter a valid 11-digit GCash mobile number (e.g., 09123456789).')
            return 'validation_error';
        }
    } else if (method === 'bank') {
        // Bank validation: should be account number (numbers and letters, 8-20 characters)
        const bankPattern = /^[A-Za-z0-9]{8,20}$/;
        if (!bankPattern.test(accountInfo)) {
            console.log('Validation failed: invalid bank account')
            showValidationErrorModal('Invalid Bank Account', 'Please enter a valid bank account number (8-20 characters, letters and numbers only).')
            return 'validation_error';
        }
    }
    
    // Submit withdrawal
    if (window.submitWithdrawal) {
        console.log('Calling submitWithdrawal function...')
        console.log('Parameters:', { amount, method, accountName, accountInfo })
        try {
            const success = await window.submitWithdrawal(amount, method, accountName, accountInfo);
            console.log('submitWithdrawal result:', success)
            console.log('submitWithdrawal result type:', typeof success)
            if (success === true) {
                console.log('Withdrawal submission was successful!')
            } else {
                console.log('Withdrawal submission failed or returned false')
            }
            return success;
    } catch (error) {
            console.error('Error during withdrawal submission:', error)
            showErrorModal('Submission Error', 'There was an error processing your withdrawal request. Please try again.')
            return false;
        }
    } else {
        console.error('submitWithdrawal function not available on window')
        showErrorModal('System Error', 'Withdrawal system is not available. Please try again later.')
    }
    
    return false;
}

// Load recent activity preview (for overview section)
async function loadRecentActivityPreview() {
    const recentActivityList = document.getElementById('recent-activity-list');
    if (!recentActivityList) return;
    
    try {
        const userId = window.currentUser?.id;
        if (!userId) {
        recentActivityList.innerHTML = `
            <div class="no-activity">
                    <p>Please log in to view activity</p>
            </div>
        `;
            return;
        }
        
        // Get recent transactions, withdrawals, task submissions, and user activities
        const [transactionsResult, withdrawalsResult, submissionsResult, activitiesResult] = await Promise.all([
            supabaseClient
            .from('transactions')
            .select('*')
                .eq('user_id', userId)
            .order('created_at', { ascending: false })
                .limit(3),
            supabaseClient
                .from('withdrawals')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(3),
            supabaseClient
                .from('task_submissions')
                .select(`
                    *,
                    tasks:task_id (
                        title,
                        reward_amount
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(3),
            supabaseClient
                .from('user_activities')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(3)
        ]);
        
        if (transactionsResult.error) throw transactionsResult.error;
        if (withdrawalsResult.error) throw withdrawalsResult.error;
        if (submissionsResult.error) throw submissionsResult.error;
        if (activitiesResult.error) throw activitiesResult.error;
        
        const transactions = transactionsResult.data || [];
        const withdrawals = withdrawalsResult.data || [];
        const submissions = submissionsResult.data || [];
        const activities = activitiesResult.data || [];
        
        // Filter transactions to only include non-withdrawal types for regular transactions
        const regularTransactions = transactions.filter(t => 
            t.type !== 'withdrawal' && 
            t.type !== 'refund' &&
            !t.description?.toLowerCase().includes('withdrawal') &&
            !t.description?.toLowerCase().includes('refund')
        );
        
        // Get withdrawal-related transactions (withdrawal and refund types)
        const withdrawalTransactions = transactions.filter(t => 
            t.type === 'withdrawal' || t.type === 'refund'
        );
        
        // Combine and sort recent activities
        const recentActivities = [
            ...regularTransactions.map(t => ({ ...t, activity_type: 'transaction' })),
            ...withdrawalTransactions.map(t => ({ ...t, activity_type: 'withdrawal' })),
            ...submissions.map(s => ({ ...s, activity_type: 'submission' })),
            ...activities.map(a => ({ ...a, activity_type: 'user_activity' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
        
        if (recentActivities.length > 0) {
            recentActivityList.innerHTML = recentActivities.map(activity => {
                if (activity.activity_type === 'transaction') {
                    return renderTransactionActivity(activity);
                } else if (activity.activity_type === 'withdrawal') {
                    return renderWithdrawalActivity(activity);
                } else if (activity.activity_type === 'submission') {
                    return renderSubmissionActivity(activity);
                } else if (activity.activity_type === 'user_activity') {
                    return renderUserActivity(activity);
                }
            }).join('');
        } else {
            recentActivityList.innerHTML = `
                <div class="no-activity">
                    <p>No recent activity</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        recentActivityList.innerHTML = `
            <div class="no-activity">
                <p>Error loading activity</p>
            </div>
        `;
    }
}

// Transaction history is now handled by renderWithdrawals() in wallet.js

// Load profile stats
async function loadProfileStats() {
    try {
        // Get tasks completed count
        const { data: completedTasks, error: tasksError } = await supabaseClient
            .from('task_submissions')
            .select('id')
            .eq('user_id', window.currentUser.id)
            .eq('status', 'approved');
        
        if (!tasksError && completedTasks) {
            const tasksCompleted = document.getElementById('tasks-completed');
            if (tasksCompleted) {
                tasksCompleted.textContent = completedTasks.length;
            }
        }
        
        // Get total earned
        const { data: transactions, error: transError } = await supabaseClient
            .from('transactions')
            .select('amount')
            .eq('user_id', window.currentUser.id)
            .eq('type', 'credit');
        
        if (!transError && transactions) {
            const totalEarned = transactions.reduce((sum, trans) => sum + parseFloat(trans.amount), 0);
            const totalEarnedElement = document.getElementById('total-earned');
            if (totalEarnedElement) {
                totalEarnedElement.textContent = `₱${totalEarned.toFixed(2)}`;
            }
        }
    } catch (error) {
        console.error('Error loading profile stats:', error);
    }
}

// Load activity history with comprehensive data
async function loadActivityHistory() {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    
    try {
        // Check if account is disabled
        if (window.isAccountDisabledCheck && window.isAccountDisabledCheck()) {
            console.log('Account is disabled, showing disabled message')
            showDisabledActivityMessage()
            return
        }
        
        const userId = window.currentUser?.id;
        if (!userId) {
            activityList.innerHTML = `
                <div class="activity-empty-modern">
                    <div class="activity-empty-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h4 class="activity-empty-title">Please log in to view activity</h4>
                    <p class="activity-empty-description">You need to be logged in to see your activity history.</p>
                </div>
            `;
            return;
        }
        
        // Get transactions, withdrawals, task submissions, and user activities data
        const [transactionsResult, withdrawalsResult, submissionsResult, activitiesResult] = await Promise.all([
            supabaseClient
            .from('transactions')
            .select('*')
                .eq('user_id', userId)
            .order('created_at', { ascending: false })
                .limit(50),
            supabaseClient
                .from('withdrawals')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50),
            supabaseClient
                .from('task_submissions')
                .select(`
                    *,
                    tasks:task_id (
                        title,
                        reward_amount
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50),
            supabaseClient
                .from('user_activities')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50)
        ]);
        
        if (transactionsResult.error) throw transactionsResult.error;
        if (withdrawalsResult.error) throw withdrawalsResult.error;
        if (submissionsResult.error) throw submissionsResult.error;
        if (activitiesResult.error) {
            console.warn('Error fetching user activities (table might not exist yet):', activitiesResult.error);
            // Don't throw error, just continue without user activities
        }
        
        const transactions = transactionsResult.data || [];
        const withdrawals = withdrawalsResult.data || [];
        const submissions = submissionsResult.data || [];
        const activities = activitiesResult.data || [];
        
        console.log('Activity data loaded:', {
            transactions: transactions.length,
            withdrawals: withdrawals.length,
            submissions: submissions.length,
            activities: activities.length
        });
        
        // Filter transactions to only include non-withdrawal types for regular transactions
        const regularTransactions = transactions.filter(t => 
            t.type !== 'withdrawal' && 
            t.type !== 'refund' &&
            !t.description?.toLowerCase().includes('withdrawal') &&
            !t.description?.toLowerCase().includes('refund')
        );
        
        // Get withdrawal-related transactions (withdrawal and refund types)
        const withdrawalTransactions = transactions.filter(t => 
            t.type === 'withdrawal' || t.type === 'refund'
        );
        
        // Combine and sort all activities
        const allActivities = [
            ...regularTransactions.map(t => ({ ...t, activity_type: 'transaction' })),
            ...withdrawalTransactions.map(t => ({ ...t, activity_type: 'withdrawal' })),
            ...submissions.map(s => ({ ...s, activity_type: 'submission' })),
            ...activities.map(a => ({ ...a, activity_type: 'user_activity' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Apply filters
        const filteredActivities = filterActivities(allActivities);
        
        if (filteredActivities.length > 0) {
            activityList.innerHTML = filteredActivities.map(activity => {
                if (activity.activity_type === 'transaction') {
                    return renderTransactionActivity(activity);
                } else if (activity.activity_type === 'withdrawal') {
                    return renderWithdrawalActivity(activity);
                } else if (activity.activity_type === 'submission') {
                    return renderSubmissionActivity(activity);
                } else if (activity.activity_type === 'user_activity') {
                    return renderUserActivity(activity);
                }
            }).join('');
        } else {
            activityList.innerHTML = `
                <div class="activity-empty-modern">
                    <div class="activity-empty-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2"/>
                            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2"/>
                            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </div>
                    <h4 class="activity-empty-title">No Activity Yet</h4>
                    <p class="activity-empty-description">Your activity history will appear here once you complete tasks or make withdrawals.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading activity history:', error);
        activityList.innerHTML = `
            <div class="activity-empty-modern">
                <div class="activity-empty-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <h4 class="activity-empty-title">Error Loading Activity</h4>
                <p class="activity-empty-description">There was an error loading your activity history. Please try again.</p>
            </div>
        `;
    }
}

// Render transaction activity item
function renderTransactionActivity(transaction) {
    const isCredit = transaction.type === 'credit' || transaction.type === 'reward';
    const isRefund = transaction.type === 'refund';
    const isWithdrawal = transaction.type === 'withdrawal';
    
    let iconSvg = '';
    let statusClass = '';
    let statusText = '';
    let amountClass = '';
    let amountPrefix = '';
    let statusDisplay = '';
    
    if (isCredit && !isRefund) {
        // Task Reward - use checkmark icon (same as transaction history)
        iconSvg = '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
        statusClass = 'status-approved';
        statusText = 'Task Reward';
        amountClass = 'positive';
        amountPrefix = '+';
        statusDisplay = 'EARNED';
    } else if (isRefund) {
        // Refund - use refresh icon (same as transaction history)
        iconSvg = '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 21v-5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
        statusClass = 'status-processing';
        statusText = 'Refund';
        amountClass = 'positive';
        amountPrefix = '+';
        statusDisplay = 'EARNED';
    } else if (isWithdrawal) {
        // Withdrawal - use wallet icon (same as transaction history)
        iconSvg = '<path d="M21 12V7H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 5v14a2 2 0 0 0 2 2h15v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 15l3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
        statusClass = 'status-pending';
        statusText = 'Withdrawal';
        amountClass = 'negative';
        amountPrefix = '-';
        statusDisplay = 'DEDUCTED';
    } else {
        // Default case for unknown transaction types - use generic icon
        iconSvg = '<path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
        statusClass = 'status-info';
        statusText = transaction.type ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1) : 'Transaction';
        amountClass = 'neutral';
        amountPrefix = transaction.amount >= 0 ? '+' : '-';
        statusDisplay = 'PROCESSING';
    }
    
    return `
        <div class="activity-item-modern transaction-${transaction.type || 'unknown'}">
            <div class="activity-item-content">
                <div class="activity-icon-modern ${statusClass}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        ${iconSvg}
                    </svg>
                </div>
                <div class="activity-details-modern">
                    <div class="activity-title-text">${transaction.description || 'Transaction'}</div>
                    <div class="activity-description-modern">
                        <span class="activity-type-badge">${statusText}</span>
                        <span class="activity-reference">Ref: ${transaction.reference || String(transaction.id).slice(0, 8)}</span>
                    </div>
                    <div class="activity-time-modern">${new Date(transaction.created_at).toLocaleString()}</div>
                </div>
                <div class="activity-amount-modern">
                    <div class="activity-amount-value ${amountClass}">
                        ${amountPrefix}₱${Math.abs(parseFloat(transaction.amount) || 0).toFixed(2)}
                    </div>
                    <div class="activity-status-badge ${statusClass}">
                        ${statusDisplay}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render withdrawal activity item (now handles transaction data)
function renderWithdrawalActivity(transaction) {
    const isWithdrawal = transaction.type === 'withdrawal';
    const isRefund = transaction.type === 'refund';
    
    let statusClass = '';
    let statusText = '';
    let statusBadgeClass = '';
    let amountClass = '';
    let amountPrefix = '';
    let statusDisplay = '';
    let titleText = '';
    
    if (isWithdrawal) {
        // Withdrawal transaction
        statusClass = 'withdrawal-pending'; // Red background for withdrawal requests
        statusText = 'Pending Review';
        statusBadgeClass = 'status-pending';
        amountClass = 'negative'; // Red for withdrawals
        amountPrefix = '-';
        statusDisplay = 'DEDUCTED';
        titleText = 'Withdrawal Request';
    } else if (isRefund) {
        // Refund transaction
        statusClass = 'withdrawal-rejected'; // Red background for refunds
        statusText = 'Rejected';
        statusBadgeClass = 'status-rejected';
        amountClass = 'positive'; // Green for refunds
        amountPrefix = '+';
        statusDisplay = 'EARNED';
        titleText = 'Withdrawal Refund';
    }
    
    // Use EXACT same icons as Transaction History
    let iconSvg = '';
    if (isWithdrawal) {
        // Red wallet icon for withdrawal requests
        iconSvg = '<path d="M21 12V7H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 5v14a2 2 0 0 0 2 2h15v-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 15l3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    } else if (isRefund) {
        // Blue refresh icon for refunds
        iconSvg = '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 21v-5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    
    // Extract method from description
    let method = 'N/A';
    if (transaction.description) {
        const methodMatch = transaction.description.match(/via (\w+)/i);
        if (methodMatch) {
            method = methodMatch[1].toUpperCase();
        }
    }
    
    return `
        <div class="activity-item-modern withdrawal-${transaction.type}">
            <div class="activity-item-content">
                <div class="activity-icon-modern ${statusClass}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        ${iconSvg}
                    </svg>
                </div>
                <div class="activity-details-modern">
                    <div class="activity-title-text">${titleText}</div>
                    <div class="activity-description-modern">
                        <span class="activity-type-badge">${method}</span>
                        <span class="activity-status-badge ${statusBadgeClass}">
                            ${statusText}
                        </span>
                    </div>
                    <div class="activity-reference">Ref: ${transaction.reference || String(transaction.id).slice(0, 8)}</div>
                    <div class="activity-time-modern">${new Date(transaction.created_at).toLocaleString()}</div>
                </div>
                <div class="activity-amount-modern">
                    <div class="activity-amount-value ${amountClass}">
                        ${amountPrefix}₱${Math.abs(parseFloat(transaction.amount)).toFixed(2)}
                    </div>
                    <div class="activity-status-badge ${statusBadgeClass}">
                        ${statusDisplay}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Update wallet preview
function updateWalletPreview() {
    const walletPreviewAmount = document.getElementById('wallet-preview-amount');
    const mobileWalletAmount = document.getElementById('mobile-wallet-amount');
    const currentBalance = document.getElementById('current-balance');
    
    if (window.currentWallet) {
        const balance = `₱${parseFloat(window.currentWallet.balance || 0).toFixed(2)}`;
        if (walletPreviewAmount) walletPreviewAmount.textContent = balance;
        if (mobileWalletAmount) mobileWalletAmount.textContent = balance;
        if (currentBalance) currentBalance.textContent = balance;
    }
}

// Profile action functions - editProfile is now handled by profile-handler.js

function changePassword() {
    window.openModal({
        title: 'Change Password',
        content: 'Password change functionality will be implemented soon.',
        primaryButton: {
            text: 'OK',
            action: () => window.closeModal()
        }
    });
}

function notificationSettings() {
    window.openModal({
        title: 'Notification Settings',
        content: 'Notification settings will be implemented soon.',
        primaryButton: {
            text: 'OK',
            action: () => window.closeModal()
        }
    });
}

function privacySettings() {
    window.openModal({
        title: 'Privacy Settings',
        content: 'Privacy settings will be implemented soon.',
        primaryButton: {
            text: 'OK',
            action: () => window.closeModal()
        }
    });
}

// Activity logging functions for user actions
async function logUserActivity(activityType, description, taskId = null, taskTitle = null, amount = null) {
    try {
        const userId = window.currentUser?.id;
        if (!userId) return;

        const activityData = {
            user_id: userId,
            activity_type: activityType,
            description: description,
            created_at: new Date().toISOString()
        };

        // Add task-specific data if provided
        if (taskId) activityData.task_id = taskId;
        if (taskTitle) activityData.task_title = taskTitle;
        if (amount) activityData.amount = amount;

        const { error } = await supabaseClient
            .from('user_activities')
            .insert(activityData);

        if (error) {
            console.error('Error logging user activity:', error);
        } else {
            console.log('User activity logged:', activityType, description);
        }
    } catch (error) {
        console.error('Error in logUserActivity:', error);
    }
}

// Render user activity item
function renderUserActivity(activity) {
    let iconSvg = '';
    let statusClass = '';
    let statusText = '';
    let amountDisplay = '';
    
    switch (activity.activity_type) {
        case 'task_started':
            iconSvg = '<path d="M8 5v14l11-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            statusClass = 'status-info';
            statusText = 'Started';
            break;
        case 'task_submitted':
            iconSvg = '<path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            statusClass = 'status-pending';
            statusText = 'Submitted';
            break;
        case 'task_restarted':
            iconSvg = '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 21v-5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            statusClass = 'status-warning';
            statusText = 'Restarted';
            break;
        case 'task_expired':
            iconSvg = '<path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            statusClass = 'status-rejected';
            statusText = 'Expired';
            break;
        case 'task_approved':
            iconSvg = '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
            statusClass = 'status-approved';
            statusText = 'Approved';
            amountDisplay = `+₱${parseFloat(activity.amount || 0).toFixed(2)}`;
            break;
        case 'task_rejected':
            iconSvg = '<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            statusClass = 'status-rejected';
            statusText = 'Rejected';
            break;
        default:
            iconSvg = '<path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            statusClass = 'status-info';
            statusText = 'Activity';
    }
    
    return `
        <div class="activity-item-modern user-activity-${activity.activity_type}">
            <div class="activity-item-content">
                <div class="activity-icon-modern ${statusClass}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        ${iconSvg}
                    </svg>
                </div>
                <div class="activity-details-modern">
                    <div class="activity-title-text">${activity.description}</div>
                    <div class="activity-description-modern">
                        <span class="activity-type-badge">TASK</span>
                        <span class="activity-status-badge ${statusClass}">
                            ${statusText}
                        </span>
                    </div>
                    <div class="activity-reference">Ref: ${activity.reference || String(activity.id).slice(0, 8)}</div>
                    <div class="activity-time-modern">${new Date(activity.created_at).toLocaleString()}</div>
                </div>
                <div class="activity-amount-modern">
                    ${amountDisplay ? `
                        <div class="activity-amount-value positive">
                            ${amountDisplay}
                        </div>
                        <div class="activity-status-badge status-approved">
                            EARNED
                        </div>
                    ` : `
                        <div class="activity-status-badge ${statusClass}">
                            ${statusText.toUpperCase()}
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

// Make functions globally available
window.switchSection = switchSection;
window.initSectionNavigation = initSectionNavigation;
window.currentSection = currentSection;
window.loadSectionData = loadSectionData;
window.updateWalletPreview = updateWalletPreview;
// editProfile is now handled by profile-handler.js
window.changePassword = changePassword;
window.showWithdrawalModal = showWithdrawalModal;
window.logUserActivity = logUserActivity;

// Activity Filter Modal Functions
function showActivityFilterModal() {
    const modalContent = `
        <div class="activity-filter-modal">
            <div class="filter-section">
                <h4 class="filter-title">Filter by Type</h4>
                <div class="filter-options">
                    <label class="filter-option">
                        <input type="radio" name="activityType" value="all" ${activityFilters.type === 'all' ? 'checked' : ''}>
                        <span class="filter-label">All Activities</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="activityType" value="withdrawal" ${activityFilters.type === 'withdrawal' ? 'checked' : ''}>
                        <span class="filter-label">Withdrawals</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="activityType" value="transaction" ${activityFilters.type === 'transaction' ? 'checked' : ''}>
                        <span class="filter-label">Transactions</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="activityType" value="submission" ${activityFilters.type === 'submission' ? 'checked' : ''}>
                        <span class="filter-label">Task Submissions</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="activityType" value="user_activity" ${activityFilters.type === 'user_activity' ? 'checked' : ''}>
                        <span class="filter-label">User Activities</span>
                    </label>
                </div>
            </div>
            
            <div class="filter-section">
                <h4 class="filter-title">Filter by Status</h4>
                <div class="filter-options">
                    <label class="filter-option">
                        <input type="radio" name="activityStatus" value="all" ${activityFilters.status === 'all' ? 'checked' : ''}>
                        <span class="filter-label">All Statuses</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="activityStatus" value="pending" ${activityFilters.status === 'pending' ? 'checked' : ''}>
                        <span class="filter-label">Pending</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="activityStatus" value="approved" ${activityFilters.status === 'approved' ? 'checked' : ''}>
                        <span class="filter-label">Approved</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="activityStatus" value="rejected" ${activityFilters.status === 'rejected' ? 'checked' : ''}>
                        <span class="filter-label">Rejected</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="activityStatus" value="completed" ${activityFilters.status === 'completed' ? 'checked' : ''}>
                        <span class="filter-label">Completed</span>
                    </label>
                </div>
            </div>
            
            <div class="filter-section">
                <h4 class="filter-title">Filter by Date</h4>
                <div class="filter-options">
                    <label class="filter-option">
                        <input type="radio" name="dateRange" value="all" ${activityFilters.dateRange === 'all' ? 'checked' : ''}>
                        <span class="filter-label">All Time</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="dateRange" value="today" ${activityFilters.dateRange === 'today' ? 'checked' : ''}>
                        <span class="filter-label">Today</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="dateRange" value="week" ${activityFilters.dateRange === 'week' ? 'checked' : ''}>
                        <span class="filter-label">This Week</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="dateRange" value="month" ${activityFilters.dateRange === 'month' ? 'checked' : ''}>
                        <span class="filter-label">This Month</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="dateRange" value="custom" ${activityFilters.dateRange === 'custom' ? 'checked' : ''}>
                        <span class="filter-label">Custom Range</span>
                    </label>
                </div>
                <div class="custom-date-range" id="customDateRange" style="display: ${activityFilters.dateRange === 'custom' ? 'block' : 'none'};">
                    <div class="date-inputs">
                        <div class="date-input-group">
                            <label>Start Date</label>
                            <input type="date" id="customStartDate" value="${activityFilters.customStartDate}">
                        </div>
                        <div class="date-input-group">
                            <label>End Date</label>
                            <input type="date" id="customEndDate" value="${activityFilters.customEndDate}">
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="filter-section">
                <h4 class="filter-title">Filter by Amount</h4>
                <div class="filter-options">
                    <label class="filter-option">
                        <input type="radio" name="amountRange" value="all" ${activityFilters.amountRange === 'all' ? 'checked' : ''}>
                        <span class="filter-label">All Amounts</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="amountRange" value="positive" ${activityFilters.amountRange === 'positive' ? 'checked' : ''}>
                        <span class="filter-label">Earnings Only</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="amountRange" value="negative" ${activityFilters.amountRange === 'negative' ? 'checked' : ''}>
                        <span class="filter-label">Deductions Only</span>
                    </label>
                    <label class="filter-option">
                        <input type="radio" name="amountRange" value="custom" ${activityFilters.amountRange === 'custom' ? 'checked' : ''}>
                        <span class="filter-label">Custom Range</span>
                    </label>
                </div>
                <div class="custom-amount-range" id="customAmountRange" style="display: ${activityFilters.amountRange === 'custom' ? 'block' : 'none'};">
                    <div class="amount-inputs">
                        <div class="amount-input-group">
                            <label>Min Amount (₱)</label>
                            <input type="number" id="customMinAmount" value="${activityFilters.customMinAmount}" placeholder="0.00" step="0.01">
                        </div>
                        <div class="amount-input-group">
                            <label>Max Amount (₱)</label>
                            <input type="number" id="customMaxAmount" value="${activityFilters.customMaxAmount}" placeholder="1000.00" step="0.01">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (window.openModal) {
        window.openModal({
            title: 'Filter Activities',
            content: modalContent,
            primaryButton: {
                text: 'Apply Filters',
                action: applyActivityFilters
            },
            secondaryButton: {
                text: 'Clear All',
                action: clearActivityFilters
            },
            closable: true,
            onOpen: () => {
                // Add event listeners for dynamic sections
                setupFilterEventListeners();
            }
        });
    }
}

// Setup filter modal event listeners
function setupFilterEventListeners() {
    // Date range toggle
    const dateRangeInputs = document.querySelectorAll('input[name="dateRange"]');
    dateRangeInputs.forEach(input => {
        input.addEventListener('change', function() {
            const customDateRange = document.getElementById('customDateRange');
            if (customDateRange) {
                customDateRange.style.display = this.value === 'custom' ? 'block' : 'none';
            }
        });
    });

    // Amount range toggle
    const amountRangeInputs = document.querySelectorAll('input[name="amountRange"]');
    amountRangeInputs.forEach(input => {
        input.addEventListener('change', function() {
            const customAmountRange = document.getElementById('customAmountRange');
            if (customAmountRange) {
                customAmountRange.style.display = this.value === 'custom' ? 'block' : 'none';
            }
        });
    });
}

// Apply activity filters
function applyActivityFilters() {
    // Get filter values from modal
    const typeInput = document.querySelector('input[name="activityType"]:checked');
    const statusInput = document.querySelector('input[name="activityStatus"]:checked');
    const dateRangeInput = document.querySelector('input[name="dateRange"]:checked');
    const amountRangeInput = document.querySelector('input[name="amountRange"]:checked');
    
    // Update filter state
    activityFilters.type = typeInput ? typeInput.value : 'all';
    activityFilters.status = statusInput ? statusInput.value : 'all';
    activityFilters.dateRange = dateRangeInput ? dateRangeInput.value : 'all';
    activityFilters.amountRange = amountRangeInput ? amountRangeInput.value : 'all';
    
    // Get custom values
    const customStartDate = document.getElementById('customStartDate');
    const customEndDate = document.getElementById('customEndDate');
    const customMinAmount = document.getElementById('customMinAmount');
    const customMaxAmount = document.getElementById('customMaxAmount');
    
    if (customStartDate) activityFilters.customStartDate = customStartDate.value;
    if (customEndDate) activityFilters.customEndDate = customEndDate.value;
    if (customMinAmount) activityFilters.customMinAmount = customMinAmount.value;
    if (customMaxAmount) activityFilters.customMaxAmount = customMaxAmount.value;
    
    // Close modal
    if (window.closeModal) {
        window.closeModal();
    }
    
    // Reload activity history with filters
    loadActivityHistory();
    
    // Update filter button to show active state
    updateFilterButtonState();
}

// Clear all activity filters
function clearActivityFilters() {
    // Reset filter state
    activityFilters = {
        type: 'all',
        status: 'all',
        dateRange: 'all',
        customStartDate: '',
        customEndDate: '',
        amountRange: 'all',
        customMinAmount: '',
        customMaxAmount: ''
    };
    
    // Close modal
    if (window.closeModal) {
        window.closeModal();
    }
    
    // Reload activity history without filters
    loadActivityHistory();
    
    // Update filter button to show inactive state
    updateFilterButtonState();
}

// Update filter button visual state
function updateFilterButtonState() {
    const filterBtn = document.querySelector('.activity-filter-btn');
    if (filterBtn) {
        const hasActiveFilters = Object.values(activityFilters).some(value => 
            value !== 'all' && value !== ''
        );
        
        if (hasActiveFilters) {
            filterBtn.classList.add('active');
            filterBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Filter <span class="filter-count">●</span>';
        } else {
            filterBtn.classList.remove('active');
            filterBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Filter';
        }
    }
}

// Filter activities based on current filters
function filterActivities(activities) {
    return activities.filter(activity => {
        // Filter by type
        if (activityFilters.type !== 'all' && activity.activity_type !== activityFilters.type) {
            return false;
        }
        
        // Filter by status
        if (activityFilters.status !== 'all') {
            const activityStatus = getActivityStatus(activity);
            if (activityStatus !== activityFilters.status) {
                return false;
            }
        }
        
        // Filter by date range
        if (activityFilters.dateRange !== 'all') {
            const activityDate = new Date(activity.created_at);
            const now = new Date();
            
            switch (activityFilters.dateRange) {
                case 'today':
                    if (!isSameDay(activityDate, now)) return false;
                    break;
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (activityDate < weekAgo) return false;
                    break;
                case 'month':
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    if (activityDate < monthAgo) return false;
                    break;
                case 'custom':
                    if (activityFilters.customStartDate && activityDate < new Date(activityFilters.customStartDate)) return false;
                    if (activityFilters.customEndDate && activityDate > new Date(activityFilters.customEndDate)) return false;
                    break;
            }
        }
        
        // Filter by amount range
        if (activityFilters.amountRange !== 'all') {
            const activityAmount = getActivityAmount(activity);
            
            switch (activityFilters.amountRange) {
                case 'positive':
                    if (activityAmount <= 0) return false;
                    break;
                case 'negative':
                    if (activityAmount >= 0) return false;
                    break;
                case 'custom':
                    if (activityFilters.customMinAmount && activityAmount < parseFloat(activityFilters.customMinAmount)) return false;
                    if (activityFilters.customMaxAmount && activityAmount > parseFloat(activityFilters.customMaxAmount)) return false;
                    break;
            }
        }
        
        return true;
    });
}

// Get activity status for filtering
function getActivityStatus(activity) {
    if (activity.activity_type === 'withdrawal') {
        return activity.status;
    } else if (activity.activity_type === 'submission') {
        return activity.status;
    } else if (activity.activity_type === 'user_activity') {
        return activity.activity_type === 'task_approved' ? 'approved' : 'completed';
    } else if (activity.activity_type === 'transaction') {
        return activity.type === 'credit' ? 'approved' : 'completed';
    }
    return 'completed';
}

// Get activity amount for filtering
function getActivityAmount(activity) {
    if (activity.amount !== undefined) {
        return parseFloat(activity.amount) || 0;
    }
    return 0;
}

// Check if two dates are the same day
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}
// Show disabled account message for activity
function showDisabledActivityMessage() {
    const activityList = document.getElementById('activity-list')
    if (activityList) {
        activityList.innerHTML = `
            <div class="activity-empty-modern">
                <div class="activity-empty-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <h4 class="activity-empty-title">Account Disabled</h4>
                <p class="activity-empty-description">Your account has been disabled by an administrator. You cannot view activity history at this time.</p>
                <p class="activity-empty-description">Please contact support if you believe this is an error.</p>
            </div>
        `
    }
}

// Render submission activity item
function renderSubmissionActivity(submission) {
    let statusClass = '';
    let statusText = '';
    let statusBadgeClass = '';
    let iconSvg = '';
    
    switch (submission.status) {
        case 'pending':
            statusClass = 'status-pending';
            statusText = 'Under Review';
            statusBadgeClass = 'status-pending';
            iconSvg = '<path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            break;
        case 'approved':
            statusClass = 'status-approved';
            statusText = 'Approved';
            statusBadgeClass = 'status-approved';
            iconSvg = '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
            break;
        case 'rejected':
            statusClass = 'status-pending';
            statusText = 'Rejected';
            statusBadgeClass = 'status-pending';
            iconSvg = '<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            break;
        case 'resubmit':
            statusClass = 'status-pending';
            statusText = 'Resubmit Required';
            statusBadgeClass = 'status-pending';
            iconSvg = '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 21v-5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
            break;
        default:
            statusClass = 'status-pending';
            statusText = 'Processing';
            statusBadgeClass = 'status-pending';
            iconSvg = '<path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    
    const taskTitle = submission.tasks?.title || 'Unknown Task';
    const rewardAmount = submission.tasks?.reward_amount || 0;
    
    return `
        <div class="activity-item-modern submission-${submission.status}">
            <div class="activity-item-content">
                <div class="activity-icon-modern ${statusClass}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        ${iconSvg}
                    </svg>
                </div>
                <div class="activity-details-modern">
                    <div class="activity-title-text">${taskTitle}</div>
                    <div class="activity-description-modern">
                        <span class="activity-type-badge">${statusText}</span>
                        <span class="activity-reference">Ref: ${submission.reference || String(submission.id).slice(0, 8)}</span>
                    </div>
                    <div class="activity-time-modern">${new Date(submission.created_at).toLocaleString()}</div>
                </div>
                <div class="activity-amount-modern">
                    <div class="activity-amount-value ${submission.status === 'approved' ? 'positive' : 'neutral'}">
                        ${submission.status === 'approved' ? '+' : ''}₱${rewardAmount.toFixed(2)}
                    </div>
                    <div class="activity-status-badge ${statusBadgeClass}">
                        ${statusText}
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.notificationSettings = notificationSettings;
window.privacySettings = privacySettings;
window.showDisabledActivityMessage = showDisabledActivityMessage;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initSectionNavigation();
    
    // Note: withdraw-funds-btn event listener is handled in dashboard-handler.js
    // to avoid duplicate event listeners
});
