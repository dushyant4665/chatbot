import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';
let token = '';
let userId = '';
let projectId = '';
let chatId = '';

async function runTests() {
  try {
    console.log('--- STARTING API TESTS ---');
    const testEmail = `test_${Date.now()}@example.com`;
    
    // 1. REGISTER
    console.log(`1. Testing /auth/register with email ${testEmail}...`);
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Test User',
      email: testEmail,
      password: 'password123'
    });
    console.log('   Success! Status:', regRes.status);
    token = regRes.data.data.token;
    
    // 2. GET ME
    console.log(`2. Testing /auth/me...`);
    const meRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Success! User:', meRes.data.data.email);
    userId = meRes.data.data.id;
    
    // 3. CREATE PROJECT
    console.log(`3. Testing /projects (Create)...`);
    const projRes = await axios.post(`${BASE_URL}/projects`, {
      title: 'Test Project',
      description: 'You are a test agent.'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Success! Project ID:', projRes.data.data.id);
    projectId = projRes.data.data.id;
    
    // 4. GET PROJECTS
    console.log(`4. Testing /projects (Get)...`);
    const projsRes = await axios.get(`${BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Success! Projects count:', projsRes.data.data.length);
    
    // 5. CREATE CHAT
    console.log(`5. Testing /chat/project/${projectId}/chats (Create)...`);
    const chatRes = await axios.post(`${BASE_URL}/chat/project/${projectId}/chats`, {
      title: 'Test Chat'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Success! Chat ID:', chatRes.data.data.id);
    chatId = chatRes.data.data.id;
    
    // 6. GET CHATS
    console.log(`6. Testing /chat/project/${projectId}/chats (Get)...`);
    const chatsRes = await axios.get(`${BASE_URL}/chat/project/${projectId}/chats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   Success! Chats count:', chatsRes.data.data.length);
    
    // 7. STREAM CHAT
    console.log(`7. Testing /chat/stream (POST)...`);
    const streamRes = await fetch(`${BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ chatId: chatId, message: 'Hello AI' })
    });
    console.log('   Stream HTTP Status:', streamRes.status);
    if(streamRes.status === 200) {
       console.log('   Success! Streaming endpoint connected.');
       // Read stream chunks
       const reader = streamRes.body.getReader();
       const decoder = new TextDecoder();
       let fullResponse = '';
       while(true) {
         const {done, value} = await reader.read();
         if(done) break;
         const chunk = decoder.decode(value, {stream: true});
         fullResponse += chunk;
         // print a small part of chunk to show it's working
         process.stdout.write(chunk.replace(/data: /g, '').replace(/\n/g, ''));
       }
       console.log('\n   Stream fully received!');
    } else {
       throw new Error('Stream failed with status ' + streamRes.status);
    }
    
    console.log('\n--- ALL TESTS PASSED SUCCESSFULLY ---');
    process.exit(0);
  } catch (error) {
    console.error('!!! TEST FAILED !!!');
    if (error.response) {
      console.error(error.response.status, error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

runTests();
