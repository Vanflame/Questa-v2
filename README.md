# Questa - Earn Money by Completing Tasks

![Questa Logo](logo.svg)

A modern Progressive Web App (PWA) that allows users to earn money by completing various digital tasks. Built with vanilla JavaScript and powered by Supabase.

## 🚀 Features

### For Users
- **📱 PWA Support** - Install as a native app on any device
- **💰 Earn Money** - Complete tasks and earn real rewards
- **📊 Dashboard** - Track earnings, completed tasks, and wallet balance
- **💳 Withdrawals** - Request payouts via GCash, PayPal, or bank transfer
- **📱 Mobile Responsive** - Optimized for all screen sizes
- **⚡ Offline Support** - Core functionality works without internet

### For Administrators
- **🎛️ Admin Panel** - Comprehensive management dashboard
- **📋 Task Management** - Create, edit, and manage tasks
- **👥 User Management** - Monitor users and manage accounts
- **📤 Submission Review** - Review and approve task submissions
- **💸 Withdrawal Processing** - Process user withdrawal requests
- **📊 Analytics** - Track platform performance and user activity

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Styling**: Custom CSS with modern design system
- **PWA**: Service Worker, Web App Manifest
- **Icons**: Custom SVG icons

## 📁 Project Structure

```
Questa v2/
├── index.html                    # Landing page
├── login/index.html              # User login
├── register/index.html           # User registration
├── dashboard/index.html          # User dashboard
├── admin/index.html              # Admin panel
├── manifest.json                 # PWA manifest
├── sw.js                         # Service worker
├── assets/
│   ├── css/
│   │   ├── styles.css            # Main stylesheet
│   │   ├── variables.css         # CSS custom properties
│   │   ├── base.css              # Reset & typography
│   │   ├── layout.css            # Layout components
│   │   ├── components.css        # UI components
│   │   ├── auth.css              # Authentication styles
│   │   ├── dashboard.css         # Dashboard styles
│   │   ├── admin.css             # Admin panel styles
│   │   ├── landing.css           # Landing page styles
│   │   └── ui-modal.css          # Modal components
│   └── js/
│       ├── supabase.js           # Supabase configuration
│       ├── auth.js               # Authentication module
│       ├── pwa.js                # PWA functionality
│       ├── dashboard-handler.js  # Dashboard coordination
│       ├── admin-handler.js      # Admin panel coordination
│       ├── tasks.js              # Task management
│       ├── submissions.js        # Submission handling
│       ├── wallet.js             # Wallet management
│       ├── ui-modal.js           # Modal system
│       └── admin-*.js            # Admin modules
├── logo.png                      # App icon
├── logo.svg                      # SVG logo
├── favicon.ico                   # Favicon
└── README.md                     # This file
```

## 🗄️ Database Schema

### Core Tables

#### `profiles`
- `id` (UUID) - User ID from auth
- `email` (Text) - User email
- `role` (Text) - 'user' or 'admin'
- `balance` (Decimal) - Wallet balance
- `is_active` (Boolean) - Account status
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### `tasks`
- `id` (UUID) - Task ID
- `title` (Text) - Task title
- `description` (Text) - Task description
- `instruction` (Text) - Detailed instructions
- `reward_amount` (Decimal) - Reward in PHP
- `difficulty` (Text) - 'Easy', 'Medium', 'Hard'
- `category` (Text) - Task category
- `status` (Text) - 'active', 'inactive'
- `referral_required` (Boolean) - Email requirement
- `email_list` (Text) - Valid emails (JSON)
- `task_deadline` (Timestamp) - Expiration date
- `user_deadline` (Integer) - Time limit in hours
- `restart_limit` (Integer) - Max restart attempts
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### `task_submissions`
- `id` (UUID) - Submission ID
- `user_id` (UUID) - User reference
- `task_id` (UUID) - Task reference
- `status` (Text) - 'in_progress', 'pending_review', 'approved', 'rejected'
- `proof_url` (Text) - Uploaded proof URL
- `email_used` (Text) - Email used for task
- `user_deadline` (Timestamp) - User's deadline
- `submitted_at` (Timestamp)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

#### `withdrawals`
- `id` (UUID) - Withdrawal ID
- `user_id` (UUID) - User reference
- `amount` (Decimal) - Withdrawal amount
- `method` (Text) - 'gcash', 'paypal', 'bank'
- `account_info` (Text) - Account details
- `status` (Text) - 'pending', 'approved', 'rejected'
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

## 🚀 Getting Started

### Prerequisites

- A Supabase account and project
- Modern web browser with PWA support
- Local web server (for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Questa-v2
   ```

2. **Set up Supabase**
   - Create a new Supabase project
   - Set up the database tables (see Database Schema section)
   - Get your project URL and anon key

3. **Configure Supabase**
   - Update `assets/js/supabase.js` with your Supabase credentials:
   ```javascript
   const supabaseUrl = 'YOUR_SUPABASE_URL'
   const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'
   ```

4. **Set up file storage**
   - Enable Supabase Storage
   - Create a `task-proofs` bucket for file uploads
   - Set appropriate RLS policies

5. **Deploy or run locally**
   - For production: Deploy to your hosting platform
   - For development: Use a local server like Live Server

### Database Setup

Run the following SQL commands in your Supabase SQL editor:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Create policies (example)
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

## 📱 PWA Features

### Installation
- **Desktop**: Install button appears in browser address bar
- **Mobile**: Custom install prompt with app preview
- **App Shortcuts**: Quick access to Dashboard, Tasks, and Wallet

### Offline Support
- Core pages cached for offline access
- Task browsing works without internet
- Data syncs when connection is restored

### Performance
- Intelligent caching for fast loading
- Service worker handles updates automatically
- Optimized for mobile and desktop

## 🎨 UI/UX Features

### Design System
- **Colors**: Modern blue theme (#3b82f6)
- **Typography**: Inter font family
- **Components**: Consistent button, form, and card styles
- **Responsive**: Mobile-first design approach

### Components
- **Modals**: Reusable modal system with animations
- **Toasts**: Success/error notifications
- **Loading**: Spinner overlays and inline loading states
- **Forms**: Inline validation and error handling

## 🔧 Development

### File Organization
- **HTML**: Pretty URLs with folder structure
- **CSS**: Modular stylesheets with variables
- **JavaScript**: ES6 modules with clear separation of concerns

### Key Modules
- `auth.js` - Authentication and user management
- `dashboard-handler.js` - Dashboard UI coordination
- `admin-handler.js` - Admin panel management
- `pwa.js` - Progressive Web App functionality
- `ui-modal.js` - Modal component system

### Adding New Features
1. Create new JavaScript module in `assets/js/`
2. Add corresponding CSS in `assets/css/`
3. Update HTML pages as needed
4. Test PWA functionality

## 🔒 Security

### Authentication
- Supabase Auth with email/password
- JWT tokens for session management
- Role-based access control (user/admin)

### Data Protection
- Row Level Security (RLS) policies
- Input validation and sanitization
- Secure file upload handling

## 📊 Analytics & Monitoring

### Built-in Tracking
- User registration and login events
- Task completion rates
- Withdrawal processing times
- Admin panel usage

### Performance Monitoring
- Service worker cache hit rates
- Page load times
- Error tracking and logging

## 🚀 Deployment

### Production Checklist
- [ ] Update Supabase credentials
- [ ] Configure CORS settings
- [ ] Set up file storage policies
- [ ] Test PWA installation
- [ ] Verify offline functionality
- [ ] Test on multiple devices

### Hosting Recommendations
- **Vercel**: Easy deployment with PWA support
- **Netlify**: Great for static sites with PWA
- **GitHub Pages**: Free hosting option
- **Firebase Hosting**: Google's hosting platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues
- **PWA not installing**: Check manifest.json and service worker
- **Authentication errors**: Verify Supabase configuration
- **File upload issues**: Check storage bucket permissions
- **Mobile responsiveness**: Test on actual devices

### Getting Help
- Check the documentation
- Review the code comments
- Test in different browsers
- Verify Supabase setup

## 🔮 Future Enhancements

### Planned Features
- Push notifications
- Advanced analytics dashboard
- Mobile app (React Native)
- API for third-party integrations
- Advanced task categories
- Referral system
- Multi-language support

### Technical Improvements
- TypeScript migration
- Component library
- Automated testing
- CI/CD pipeline
- Performance optimizations

---

**Built with ❤️ using vanilla JavaScript and Supabase**

*Questa - Turn Your Time Into Real Money* 💰
