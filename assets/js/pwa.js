// PWA (Progressive Web App) Initialization
// This script handles service worker registration and PWA features

// Check if service workers are supported
if ('serviceWorker' in navigator) {
  console.log('PWA: Service Worker supported')
  
  // Register service worker
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('PWA: Service Worker registered successfully', registration)
      
      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, show update notification
              showUpdateNotification()
            }
          })
        }
      })
      
    } catch (error) {
      console.error('PWA: Service Worker registration failed', error)
    }
  })
} else {
  console.log('PWA: Service Worker not supported')
}

// Handle PWA install prompt
let deferredPrompt = null

window.addEventListener('beforeinstallprompt', (event) => {
  console.log('PWA: Install prompt triggered')
  
  // Prevent the mini-infobar from appearing on mobile
  event.preventDefault()
  
  // Stash the event so it can be triggered later
  deferredPrompt = event
  
  // Show custom install button/notification
  showInstallPrompt()
})

// Handle PWA installed event
window.addEventListener('appinstalled', (event) => {
  console.log('PWA: App was installed', event)
  
  // Hide install prompt
  hideInstallPrompt()
  
  // Track installation
  trackPWAInstall()
})

// Show custom install prompt
function showInstallPrompt() {
  // Check if we're already showing the prompt or if user dismissed it
  if (document.getElementById('pwa-install-prompt') || localStorage.getItem('pwa-install-dismissed')) {
    return
  }
  
  const installPrompt = document.createElement('div')
  installPrompt.id = 'pwa-install-prompt'
  installPrompt.className = 'pwa-install-prompt'
  installPrompt.innerHTML = `
    <div class="pwa-install-content">
      <div class="pwa-install-icon">
        <img src="/logo.png" alt="Questa" width="48" height="48">
      </div>
      <div class="pwa-install-text">
        <h3>Install Questa</h3>
        <p>Get quick access to earn money by completing tasks</p>
      </div>
      <div class="pwa-install-actions">
        <button id="pwa-install-btn" class="btn btn-primary">Install</button>
        <button id="pwa-install-dismiss" class="btn btn-secondary">Not now</button>
      </div>
    </div>
  `
  
  // Add styles
  const style = document.createElement('style')
  style.textContent = `
    .pwa-install-prompt {
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      animation: slideUp 0.3s ease-out;
    }
    
    .pwa-install-content {
      display: flex;
      align-items: center;
      padding: 16px;
      gap: 12px;
    }
    
    .pwa-install-icon {
      flex-shrink: 0;
    }
    
    .pwa-install-text {
      flex: 1;
    }
    
    .pwa-install-text h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }
    
    .pwa-install-text p {
      margin: 0;
      font-size: 14px;
      color: #64748b;
    }
    
    .pwa-install-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    
    .pwa-install-actions .btn {
      padding: 8px 16px;
      font-size: 14px;
      border-radius: 6px;
    }
    
    @keyframes slideUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    @media (max-width: 480px) {
      .pwa-install-prompt {
        left: 10px;
        right: 10px;
        bottom: 10px;
      }
      
      .pwa-install-content {
        flex-direction: column;
        text-align: center;
      }
      
      .pwa-install-actions {
        width: 100%;
        justify-content: center;
      }
      
      .pwa-install-actions .btn {
        flex: 1;
      }
    }
  `
  
  document.head.appendChild(style)
  document.body.appendChild(installPrompt)
  
  // Add event listeners
  document.getElementById('pwa-install-btn').addEventListener('click', installPWA)
  document.getElementById('pwa-install-dismiss').addEventListener('click', dismissInstallPrompt)
}

// Hide install prompt
function hideInstallPrompt() {
  const prompt = document.getElementById('pwa-install-prompt')
  if (prompt) {
    prompt.remove()
  }
}

// Dismiss install prompt
function dismissInstallPrompt() {
  localStorage.setItem('pwa-install-dismissed', 'true')
  hideInstallPrompt()
}

// Install PWA
async function installPWA() {
  if (!deferredPrompt) {
    return
  }
  
  try {
    // Show the install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    
    console.log('PWA: Install prompt outcome', outcome)
    
    // Clear the deferred prompt
    deferredPrompt = null
    
    // Hide our custom prompt
    hideInstallPrompt()
    
  } catch (error) {
    console.error('PWA: Install failed', error)
  }
}

// Show update notification
function showUpdateNotification() {
  if (document.getElementById('pwa-update-notification')) {
    return
  }
  
  const updateNotification = document.createElement('div')
  updateNotification.id = 'pwa-update-notification'
  updateNotification.className = 'pwa-update-notification'
  updateNotification.innerHTML = `
    <div class="pwa-update-content">
      <div class="pwa-update-text">
        <h4>Update Available</h4>
        <p>New features and improvements are ready</p>
      </div>
      <div class="pwa-update-actions">
        <button id="pwa-update-btn" class="btn btn-primary">Update</button>
        <button id="pwa-update-dismiss" class="btn btn-secondary">Later</button>
      </div>
    </div>
  `
  
  // Add styles
  const style = document.createElement('style')
  style.textContent = `
    .pwa-update-notification {
      position: fixed;
      top: 20px;
      left: 20px;
      right: 20px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
      z-index: 10000;
      animation: slideDown 0.3s ease-out;
    }
    
    .pwa-update-content {
      display: flex;
      align-items: center;
      padding: 16px;
      gap: 12px;
    }
    
    .pwa-update-text {
      flex: 1;
    }
    
    .pwa-update-text h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    .pwa-update-text p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }
    
    .pwa-update-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    
    .pwa-update-actions .btn {
      padding: 8px 16px;
      font-size: 14px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
    }
    
    .pwa-update-actions .btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `
  
  document.head.appendChild(style)
  document.body.appendChild(updateNotification)
  
  // Add event listeners
  document.getElementById('pwa-update-btn').addEventListener('click', updatePWA)
  document.getElementById('pwa-update-dismiss').addEventListener('click', dismissUpdateNotification)
}

// Update PWA
function updatePWA() {
  window.location.reload()
}

// Dismiss update notification
function dismissUpdateNotification() {
  const notification = document.getElementById('pwa-update-notification')
  if (notification) {
    notification.remove()
  }
}

// Track PWA installation
function trackPWAInstall() {
  // You can add analytics tracking here
  console.log('PWA: Installation tracked')
}

// Check if app is running as PWA
function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true
}

// Handle PWA-specific features
if (isPWA()) {
  console.log('PWA: Running as installed app')
  
  // Add PWA-specific classes
  document.body.classList.add('pwa-mode')
  
  // Handle PWA-specific behaviors
  document.addEventListener('DOMContentLoaded', () => {
    // Add PWA-specific styling or functionality
    const style = document.createElement('style')
    style.textContent = `
      .pwa-mode .landing-header {
        padding-top: env(safe-area-inset-top);
      }
      
      .pwa-mode .admin-header {
        padding-top: env(safe-area-inset-top);
      }
    `
    document.head.appendChild(style)
  })
}

// Export functions for global access
window.PWA = {
  install: installPWA,
  isInstalled: isPWA,
  showInstallPrompt,
  hideInstallPrompt
}

console.log('PWA: Module loaded')
