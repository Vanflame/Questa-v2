// Questa PWA Service Worker
const CACHE_NAME = 'questa-v1.0.0'
const STATIC_CACHE = 'questa-static-v1.0.0'
const DYNAMIC_CACHE = 'questa-dynamic-v1.0.0'

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/login/',
  '/register/',
  '/dashboard/',
  '/admin/',
  '/assets/css/styles.css',
  '/assets/css/ui-modal.css',
  '/assets/css/admin.css',
  '/assets/css/dashboard.css',
  '/assets/css/auth.css',
  '/assets/css/landing.css',
  '/assets/css/base.css',
  '/assets/css/layout.css',
  '/assets/css/components.css',
  '/assets/css/variables.css',
  '/assets/css/task-details.css',
  '/assets/css/activity-modern.css',
  '/assets/css/disabled-account.css',
  '/assets/js/supabase.js',
  '/assets/js/auth.js',
  '/assets/js/dashboard-handler.js',
  '/assets/js/dashboard-sections.js',
  '/assets/js/tasks.js',
  '/assets/js/submissions.js',
  '/assets/js/wallet.js',
  '/assets/js/profile-handler.js',
  '/assets/js/mobile-menu.js',
  '/assets/js/landing-stats.js',
  '/assets/js/ui-modal.js',
  '/assets/js/ui-toast.js',
  '/assets/js/storage.js',
  '/assets/js/admin-handler.js',
  '/assets/js/admin-auth.js',
  '/assets/js/admin-tasks.js',
  '/assets/js/admin-submissions.js',
  '/assets/js/admin-withdrawals.js',
  '/assets/js/admin-users.js',
  '/assets/js/admin-balance.js',
  '/assets/js/auth-login.js',
  '/assets/js/auth-register.js',
  '/logo.png',
  '/logo.svg',
  '/favicon.ico',
  '/favicon.svg',
  '/manifest.json'
]

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        console.log('Service Worker: Static files cached successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static files', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker: Activated successfully')
        return self.clients.claim()
      })
  )
})

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip Supabase API calls
  if (url.hostname.includes('supabase.co')) {
    return
  }
  
  // Skip external resources
  if (url.hostname !== location.hostname) {
    return
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache', request.url)
          return cachedResponse
        }
        
        // Otherwise fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }
            
            // Clone the response for caching
            const responseToCache = response.clone()
            
            // Cache dynamic content
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache)
              })
            
            return response
          })
          .catch((error) => {
            console.log('Service Worker: Network request failed', error)
            
            // Return offline page for navigation requests
            if (request.destination === 'document') {
              return caches.match('/index.html')
            }
            
            // Return a basic offline response for other requests
            return new Response('Offline content not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            })
          })
      })
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle any pending offline actions here
      handleBackgroundSync()
    )
  }
})

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received')
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Questa',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Tasks',
        icon: '/logo.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/logo.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification('Questa', options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event.action)
  
  event.notification.close()
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard?section=tasks')
    )
  } else if (event.action === 'close') {
    // Just close the notification
    return
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Handle background sync
async function handleBackgroundSync() {
  try {
    // Check for pending offline actions
    const pendingActions = await getPendingActions()
    
    for (const action of pendingActions) {
      await processOfflineAction(action)
    }
    
    console.log('Service Worker: Background sync completed')
  } catch (error) {
    console.error('Service Worker: Background sync failed', error)
  }
}

// Get pending offline actions from IndexedDB
async function getPendingActions() {
  // This would typically read from IndexedDB
  // For now, return empty array
  return []
}

// Process individual offline action
async function processOfflineAction(action) {
  try {
    // Process the action based on its type
    switch (action.type) {
      case 'task_submission':
        await submitTaskOffline(action.data)
        break
      case 'withdrawal_request':
        await requestWithdrawalOffline(action.data)
        break
      default:
        console.log('Service Worker: Unknown action type', action.type)
    }
  } catch (error) {
    console.error('Service Worker: Failed to process offline action', error)
  }
}

// Submit task offline (placeholder)
async function submitTaskOffline(data) {
  console.log('Service Worker: Processing offline task submission', data)
  // Implementation would go here
}

// Request withdrawal offline (placeholder)
async function requestWithdrawalOffline(data) {
  console.log('Service Worker: Processing offline withdrawal request', data)
  // Implementation would go here
}

console.log('Service Worker: Script loaded')
