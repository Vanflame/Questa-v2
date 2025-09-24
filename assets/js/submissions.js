// Submissions Module
// Get supabaseClient from global scope
const supabaseClient = window.supabaseClient || supabase.createClient(
    'https://rhfqaebkvxyayzrpmjhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZnFhZWJrdnh5YXl6cnBtamhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NDMwNzgsImV4cCI6MjA3NDIxOTA3OH0.X8nTjGBnUoOB7AJG88cJnvr8oruLrHSqrjrxCfCh4hA'
)

// Upload proof function (inline to avoid import issues)
async function uploadProof(userId, file) {
    try {
        console.log('Uploading proof:', file.name, 'for user:', userId)
        
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}/${Date.now()}_${file.name}`
        
        const { data, error } = await supabaseClient.storage
            .from('proofs')
            .upload(fileName, file)
        
        if (error) {
            console.error('Error uploading file:', error)
            return null
        }
        
        const { data: { publicUrl } } = supabaseClient.storage
            .from('proofs')
            .getPublicUrl(fileName)
        
        console.log('File uploaded successfully:', publicUrl)
        return publicUrl
        
    } catch (error) {
        console.error('Error in uploadProof:', error)
        return null
    }
}

// Submit proof for a task
export async function submitProof(submissionId, isResubmit = false) {
    try {
        console.log('Submitting proof for submission:', submissionId, 'Resubmit:', isResubmit)
        
        // Create file input
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.accept = 'image/*,.pdf,.doc,.docx'
        
        fileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0]
            if (!file) {
                console.log('No file selected')
                return
            }
            
            console.log('File selected:', file.name, 'Size:', file.size)
            
            // Get the task to check if email is required
            const { data: submission } = await supabaseClient
                .from('task_submissions')
                .select('*, tasks(*)')
                .eq('id', submissionId)
                .single()
            
            if (!submission) {
                alert('Submission not found')
                return
            }
            
            const task = submission.tasks
            let emailUsed = null
            
            // If email is required, ask for the email used
            if (task.referral_required) {
                // Check if user already provided an email when starting the task
                const originalEmail = submission.email_used
                
                if (originalEmail) {
                    // User already provided email when starting, validate it matches
                    emailUsed = prompt(`Please enter the email you used to complete this task:`)
                    if (!emailUsed) {
                        alert('Email is required for this task submission.')
                        return
                    }
                    if (emailUsed.toLowerCase() !== originalEmail.toLowerCase()) {
                        alert(`Email mismatch! Please enter the correct email address.`)
                        return
                    }
                } else {
                    // User didn't provide email when starting (shouldn't happen with new system)
                    emailUsed = prompt(`Please enter the email you used to complete this task:`)
                    if (!emailUsed) {
                        alert('Email is required for this task submission.')
                        return
                    }
                    if (!emailUsed.includes('@')) {
                        alert('Please enter a valid email address.')
                        return
                    }
                }
            }
            
            // Upload proof
            const userId = getCurrentUserId()
            if (!userId) {
                console.error('Cannot submit proof: no user ID')
                return
            }
            
            const proofUrl = await uploadProof(userId, file)
            if (!proofUrl) {
                console.error('Failed to upload proof')
                alert('Failed to upload proof. Please try again.')
                return
            }
            
            console.log('Proof uploaded successfully:', proofUrl)
            
            // Update submission
            const updateData = {
                proof_url: proofUrl,
                status: 'pending_review',
                email_used: emailUsed
            }
            
            if (isResubmit) {
                // Increment resubmission count
                const { data: currentSubmission } = await supabaseClient
                    .from('task_submissions')
                    .select('resubmission_count')
                    .eq('id', submissionId)
                    .single()
                
                updateData.resubmission_count = (currentSubmission?.resubmission_count || 0) + 1
                console.log('Resubmission count:', updateData.resubmission_count)
            }
            
            const { error: updateError } = await supabaseClient
                .from('task_submissions')
                .update(updateData)
                .eq('id', submissionId)
            
            if (updateError) {
                console.error('Error updating submission:', updateError)
                alert('Error submitting proof: ' + updateError.message)
                return
            }
            
            console.log('Proof submitted successfully')
            const message = isResubmit ? 'Proof resubmitted successfully!' : 'Proof submitted successfully!'
            alert(message)
            
            // Reload tasks
            await window.loadTasks()
            await window.renderTasks()
        })
        
        // Trigger file selection
        fileInput.click()
        
    } catch (error) {
        console.error('Error submitting proof:', error)
        alert('Error submitting proof: ' + error.message)
    }
}

// Get current user from auth module
function getCurrentUser() {
    return window.currentUser || null
}

// Get current user ID from auth module
function getCurrentUserId() {
    const user = getCurrentUser()
    if (!user) {
        console.error('No current user found in submissions module')
        return null
    }
    return user.id
}

// Export functions for global access
window.submitProof = submitProof
