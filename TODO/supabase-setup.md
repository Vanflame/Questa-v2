# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization and enter project details:
   - Name: "Email To-Do Dashboard"
   - Database Password: (choose a strong password)
   - Region: (select closest to you)
5. Click "Create new project"

## 2. Get Your Project Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

## 3. Update Configuration

Open `script.js` and replace these lines with your actual values:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co'; // Replace with your URL
const SUPABASE_ANON_KEY = 'your-anon-key'; // Replace with your key
```

## 4. Create Database Tables

In your Supabase dashboard, go to the SQL Editor and run this SQL:

```sql
-- Create todoemails table
CREATE TABLE IF NOT EXISTS todoemails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    address TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create todotasks table
CREATE TABLE IF NOT EXISTS todotasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email_id UUID REFERENCES todoemails(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE todoemails ENABLE ROW LEVEL SECURITY;
ALTER TABLE todotasks ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since we're not using authentication)
CREATE POLICY "Allow all operations on todoemails" ON todoemails FOR ALL USING (true);
CREATE POLICY "Allow all operations on todotasks" ON todotasks FOR ALL USING (true);
```

## 5. Test Your Setup

1. Open `index.html` in your web browser
2. Try adding a new email
3. Check that tasks appear and can be marked as complete
4. Verify that data persists when you refresh the page

## 6. Troubleshooting

### Common Issues:

1. **"Failed to initialize application"**
   - Check that your Supabase URL and key are correct
   - Ensure the tables were created successfully
   - Check the browser console for detailed error messages

2. **"Failed to add email"**
   - Verify that the `todoemails` table exists
   - Check that RLS policies allow insert operations

3. **Tasks not loading**
   - Ensure the `todotasks` table exists
   - Check the foreign key relationship between todoemails and todotasks

### Getting Help:

- Check the browser's Developer Console (F12) for error messages
- Verify your Supabase project is active (not paused)
- Ensure your internet connection is working

## 7. Optional: Customize Default Tasks

You can modify the default tasks by editing the `DEFAULT_TASKS` array in `script.js`:

```javascript
const DEFAULT_TASKS = [
    { name: "Your custom task", points: 10 },
    { name: "Another task", points: 25 },
    // Add more tasks as needed
];
```

## 8. Create Default Tasks Table (Optional)

If you want default tasks to persist across devices, create this table:

```sql
CREATE TABLE IF NOT EXISTS default_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE default_tasks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on default_tasks" ON default_tasks
    FOR ALL USING (true);
```

## 9. Optional: Change Threshold

To modify the point threshold for the green indicator, change this value in `script.js`:

```javascript
const THRESHOLD_POINTS = 600; // Change this number
```

That's it! Your Email To-Do Dashboard should now be fully functional with Supabase data persistence.
