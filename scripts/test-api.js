// Test if API is accessible
async function testAPI() {
  try {
    console.log('Testing API connection...');
    const response = await fetch('http://localhost:8080/api/users');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API is working!');
      console.log('Users:', data);
    } else {
      console.log('❌ API returned error:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ API not accessible:', error.message);
    console.log('\n💡 In local development, API routes only work when:');
    console.log('   1. Deployed to Vercel, OR');
    console.log('   2. Running Vercel dev server: npx vercel dev');
  }
}

// Run in browser context
if (typeof window !== 'undefined') {
  testAPI();
} else {
  console.log('Run this in browser console or use: npx vercel dev');
}

