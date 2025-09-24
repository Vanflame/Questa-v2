// Storage Module
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Upload proof file to Supabase Storage
export async function uploadProof(userId, file) {
    try {
        // Generate unique filename with timestamp
        const fileName = `${Date.now()}_${file.name}`
        const filePath = `${userId}/${fileName}`
        
        // Upload file to 'proofs' bucket
        const { data, error } = await supabaseClient.storage
            .from('proofs')
            .upload(filePath, file)
        
        if (error) {
            console.error('Upload error:', error)
            throw new Error('Failed to upload file: ' + error.message)
        }
        
        // Get public URL for the uploaded file
        const { data: publicUrlData } = supabaseClient.storage
            .from('proofs')
            .getPublicUrl(filePath)
        
        return publicUrlData.publicUrl
        
    } catch (error) {
        console.error('Storage error:', error)
        throw new Error('Failed to upload proof: ' + error.message)
    }
}
