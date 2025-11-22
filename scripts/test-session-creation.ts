/**
 * Test Session Creation Script
 *
 * This script tests if session creation is working correctly.
 * Run with: npx tsx scripts/test-session-creation.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please ensure .env.local contains:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testSessionCreation() {
  console.log('\n===========================================');
  console.log('🧪 Session Creation Test Script');
  console.log('===========================================\n');

  try {
    // Step 1: Check database connection
    console.log('📊 Step 1: Testing database connection...');
    const { data: testQuery, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message);
      return;
    }
    console.log('✅ Database connection successful\n');

    // Step 2: Get a test user
    console.log('👤 Step 2: Finding a test user...');
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .limit(5);

    if (userError || !users || users.length === 0) {
      console.error('❌ No users found in database');
      console.log('\n💡 TIP: You need to log in at least once to create a user record');
      return;
    }

    console.log(`✅ Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role})`);
    });

    const testUser = users[0];
    console.log(`\n🎯 Using test user: ${testUser.email}\n`);

    // Step 3: Check existing sessions
    console.log('📋 Step 3: Checking existing sessions...');
    const { data: existingSessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('id, created_at, expires_at')
      .eq('user_id', testUser.id);

    if (sessionsError) {
      console.error('❌ Failed to query sessions:', sessionsError.message);
      return;
    }

    console.log(`✅ User has ${existingSessions?.length || 0} existing sessions\n`);

    // Step 4: Create a test session
    console.log('🔧 Step 4: Creating a test session...');
    const testAccessToken = `test_token_${Date.now()}`;
    const testRefreshToken = `test_refresh_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    console.log('   Token:', testAccessToken.substring(0, 20) + '...');
    console.log('   Expires:', expiresAt.toISOString());

    const { data: newSession, error: createError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: testUser.id,
        access_token: testAccessToken,
        refresh_token: testRefreshToken,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Session creation failed!');
      console.error('   Error code:', createError.code);
      console.error('   Error message:', createError.message);
      console.error('   Error details:', createError.details);
      console.error('   Error hint:', createError.hint);

      console.log('\n🔍 Possible causes:');
      if (createError.code === '23503') {
        console.log('   - Foreign key constraint violation');
        console.log('   - User ID does not exist in users table');
      } else if (createError.code === '23505') {
        console.log('   - Unique constraint violation');
        console.log('   - Session with this token already exists');
      } else if (createError.code === '42P01') {
        console.log('   - Table does not exist');
        console.log('   - Run migrations to create user_sessions table');
      }
      return;
    }

    console.log('✅ Session created successfully!');
    console.log('   Session ID:', newSession.id);
    console.log('   Created at:', newSession.created_at);

    // Step 5: Verify the session was created
    console.log('\n✓ Step 5: Verifying session...');
    const { data: verifySession, error: verifyError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('id', newSession.id)
      .single();

    if (verifyError || !verifySession) {
      console.error('❌ Failed to verify session:', verifyError?.message);
      return;
    }

    console.log('✅ Session verified successfully');
    console.log('   Access token:', verifySession.access_token.substring(0, 20) + '...');
    console.log('   Expires at:', verifySession.expires_at);

    // Step 6: Clean up test session
    console.log('\n🧹 Step 6: Cleaning up test session...');
    const { error: deleteError } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', newSession.id);

    if (deleteError) {
      console.error('❌ Failed to delete test session:', deleteError.message);
      console.log('   ⚠️  You may need to manually delete session:', newSession.id);
      return;
    }

    console.log('✅ Test session deleted successfully\n');

    // Success summary
    console.log('===========================================');
    console.log('✅ ALL TESTS PASSED!');
    console.log('===========================================');
    console.log('Session creation is working correctly.');
    console.log('If you\'re experiencing login issues, check:');
    console.log('  1. Browser console for client-side errors');
    console.log('  2. Server logs for authentication errors');
    console.log('  3. MyJKKN Auth server is responding');
    console.log('  4. Environment variables are set correctly\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    console.log('\n📖 See docs/SESSION_CREATION_DEBUG_GUIDE.md for troubleshooting');
  }
}

// Run the test
testSessionCreation()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
