# 📧 Email To-Do Dashboard

A modern web-based dashboard for managing multiple email-specific to-do lists with point tracking and Supabase data persistence.

![Dashboard Preview](https://via.placeholder.com/800x400/667eea/ffffff?text=Email+To-Do+Dashboard)

## ✨ Features

- **📧 Multi-Email Management**: Create and manage separate to-do lists for different email accounts
- **🎯 Point Tracking**: Assign point values to tasks and track your progress
- **📊 Live Score Updates**: Real-time total score calculation with visual feedback
- **🏆 Threshold Indicators**: Visual indicators when you reach your goal (600 points)
- **☁️ Data Persistence**: All data synced across devices via Supabase
- **🎨 Modern UI**: Clean, responsive design with smooth animations
- **⚡ Bulk Operations**: Mark all tasks done or reset all tasks with one click
- **📝 Default Templates**: Auto-populate new emails with default task templates

## 🚀 Quick Start

1. **Clone or download** this project
2. **Set up Supabase** following the instructions in `supabase-setup.md`
3. **Open `index.html`** in your web browser
4. **Start managing your email tasks!**

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: Supabase (PostgreSQL)
- **Styling**: Custom CSS with modern design patterns
- **Icons**: Unicode emojis for cross-platform compatibility

## 📋 Core Functionality

### Email Management
- Add new email addresses
- Switch between different email dashboards
- Visual indicators for emails that have reached the threshold

### Task Management
- Create custom tasks with point values
- Mark tasks as complete/incomplete
- Edit task details
- Bulk operations (mark all done, reset all)

### Point System
- Each task has an assigned point value
- Total score updates automatically
- Threshold-based visual feedback (600 points = goal reached)
- Green highlighting when threshold is met

## 🎨 UI Components

### Sidebar
- List of all added emails
- Current score for each email
- ✅ indicator for emails that have reached the threshold
- Active email highlighting

### Main Dashboard
- Selected email's task list
- Live score display at the top
- Task completion checkboxes
- Bulk action buttons

### Modals
- Add new email
- Add new task
- Input validation and error handling

## 📊 Default Task Template

New emails automatically get these default tasks:

| Task | Points |
|------|--------|
| Check inbox | 10 |
| Reply to urgent emails | 25 |
| Organize folders | 15 |
| Archive old emails | 20 |
| Update email signatures | 10 |
| Review spam folder | 5 |
| Set up email filters | 30 |
| Backup important emails | 25 |
| Update contact lists | 15 |
| Review email subscriptions | 20 |

**Total**: 185 points (customizable)

## 🗄️ Database Schema

### todoemails Table
```sql
- id (UUID, Primary Key)
- address (Text, Unique)
- created_at (Timestamp)
```

### todotasks Table
```sql
- id (UUID, Primary Key)
- email_id (UUID, Foreign Key)
- name (Text)
- points (Integer)
- done (Boolean)
- created_at (Timestamp)
```

## 🎯 Usage Tips

1. **Start with Default Tasks**: New emails automatically get a set of common email management tasks
2. **Customize Point Values**: Adjust task points based on difficulty or importance
3. **Use Bulk Actions**: Quickly mark all tasks as done or reset progress
4. **Track Progress**: Watch your score grow as you complete tasks
5. **Reach the Threshold**: Aim for 600 points to get the green indicator

## 🔧 Customization

### Change Default Tasks
Edit the `DEFAULT_TASKS` array in `script.js`:

```javascript
const DEFAULT_TASKS = [
    { name: "Your custom task", points: 10 },
    // Add more tasks...
];
```

### Adjust Threshold
Change the threshold in `script.js`:

```javascript
const THRESHOLD_POINTS = 600; // Your desired threshold
```

### Modify Styling
Edit `styles.css` to customize colors, fonts, and layout.

## 📱 Responsive Design

The dashboard is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- Different screen orientations

## 🔒 Privacy & Security

- No user authentication required
- Email addresses are the only identifiers
- Data stored securely in Supabase
- No tracking or analytics

## 🐛 Troubleshooting

### Common Issues:

1. **"Failed to initialize application"**
   - Check Supabase configuration in `script.js`
   - Verify tables exist in your Supabase project

2. **Tasks not saving**
   - Check internet connection
   - Verify Supabase credentials are correct

3. **Styling issues**
   - Ensure `styles.css` is loaded properly
   - Check for browser compatibility

### Getting Help:

1. Check the browser console (F12) for error messages
2. Verify your Supabase project is active
3. Follow the setup instructions in `supabase-setup.md`

## 📄 File Structure

```
email-todo-dashboard/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
├── supabase-setup.md   # Supabase setup instructions
└── README.md           # This file
```

## 🚀 Future Enhancements

Potential features for future versions:
- Task categories and tags
- Due dates and reminders
- Email integration (read emails directly)
- Export/import functionality
- Team collaboration features
- Advanced analytics and reporting

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

---

**Happy email task management! 📧✅**
