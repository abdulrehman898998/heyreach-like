// Simple script to set up user ID in localStorage
// Run this in the browser console to fix authentication issues

const userId = "89f5672c-82a9-48cf-a0ff-33fba93e2c5a";
const userEmail = "test@example.com";

// Set the user ID in localStorage
localStorage.setItem('userId', userId);
localStorage.setItem('userEmail', userEmail);

console.log('✅ User ID set in localStorage:', userId);
console.log('✅ User email set in localStorage:', userEmail);
console.log('🔄 Please refresh the page to apply changes');

// Test the authentication
fetch('/api/campaigns', {
  headers: {
    'X-User-ID': userId
  }
})
.then(response => response.json())
.then(data => {
  console.log('✅ Authentication test successful:', data);
})
.catch(error => {
  console.error('❌ Authentication test failed:', error);
});
