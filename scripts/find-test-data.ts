/**
 * Script to identify test data in the database
 * Run this before going live to find all test records
 *
 * Usage: npx tsx scripts/find-test-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestDataSummary {
  table: string;
  count: number;
  records: any[];
}

async function findTestData() {
  console.log('🔍 Searching for test data in the database...\n');

  const testDataFound: TestDataSummary[] = [];

  try {
    // 1. Check for test users/mentors
    console.log('📧 Checking users table for test emails...');
    const { data: testUsers } = await supabase
      .from('users')
      .select('*')
      .or('email.ilike.%test%,email.ilike.%demo%,full_name.ilike.%test%,full_name.ilike.%demo%')
      .order('created_at', { ascending: false });

    if (testUsers && testUsers.length > 0) {
      testDataFound.push({
        table: 'users',
        count: testUsers.length,
        records: testUsers.map(u => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          created_at: u.created_at
        }))
      });
      console.log(`   Found ${testUsers.length} test users`);
    } else {
      console.log('   ✓ No test users found');
    }

    // 2. Check for test students
    console.log('\n👨‍🎓 Checking students table for test data...');
    const { data: testStudents } = await supabase
      .from('students')
      .select('*')
      .or('email.ilike.%test%,email.ilike.%demo%,name.ilike.%test%,name.ilike.%demo%,roll_number.ilike.%test%')
      .order('created_at', { ascending: false });

    if (testStudents && testStudents.length > 0) {
      testDataFound.push({
        table: 'students',
        count: testStudents.length,
        records: testStudents.map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          roll_number: s.roll_number,
          created_at: s.created_at
        }))
      });
      console.log(`   Found ${testStudents.length} test students`);
    } else {
      console.log('   ✓ No test students found');
    }

    // 3. Check for test mentors
    console.log('\n👨‍🏫 Checking mentors table for test data...');
    const { data: testMentors } = await supabase
      .from('mentors')
      .select('*, users!inner(email, full_name)')
      .or('users.email.ilike.%test%,users.email.ilike.%demo%,users.full_name.ilike.%test%')
      .order('created_at', { ascending: false });

    if (testMentors && testMentors.length > 0) {
      testDataFound.push({
        table: 'mentors',
        count: testMentors.length,
        records: testMentors.map(m => ({
          id: m.id,
          user_id: m.user_id,
          email: (m.users as any)?.email,
          full_name: (m.users as any)?.full_name,
          created_at: m.created_at
        }))
      });
      console.log(`   Found ${testMentors.length} test mentors`);
    } else {
      console.log('   ✓ No test mentors found');
    }

    // 4. Check for test counseling sessions
    console.log('\n📅 Checking counseling_sessions table for test data...');
    const { data: testSessions } = await supabase
      .from('counseling_sessions')
      .select('*')
      .or('session_name.ilike.%test%,notes.ilike.%test%')
      .order('created_at', { ascending: false });

    if (testSessions && testSessions.length > 0) {
      testDataFound.push({
        table: 'counseling_sessions',
        count: testSessions.length,
        records: testSessions.map(s => ({
          id: s.id,
          session_name: s.session_name,
          date: s.date,
          status: s.status,
          created_at: s.created_at
        }))
      });
      console.log(`   Found ${testSessions.length} test sessions`);
    } else {
      console.log('   ✓ No test sessions found');
    }

    // 5. Check for test mentor_student assignments
    console.log('\n🔗 Checking mentor_student table for test data...');
    // Get test mentor IDs
    const testMentorIds = testMentors?.map(m => m.id) || [];
    const testStudentIds = testStudents?.map(s => s.id) || [];

    if (testMentorIds.length > 0 || testStudentIds.length > 0) {
      const { data: testAssignments } = await supabase
        .from('mentor_student')
        .select('*')
        .or(
          testMentorIds.length > 0
            ? `mentor_id.in.(${testMentorIds.join(',')}),student_id.in.(${testStudentIds.join(',')})`
            : `student_id.in.(${testStudentIds.join(',')})`
        );

      if (testAssignments && testAssignments.length > 0) {
        testDataFound.push({
          table: 'mentor_student',
          count: testAssignments.length,
          records: testAssignments.map(a => ({
            id: a.id,
            mentor_id: a.mentor_id,
            student_id: a.student_id,
            created_at: a.created_at
          }))
        });
        console.log(`   Found ${testAssignments.length} test assignments`);
      } else {
        console.log('   ✓ No test assignments found');
      }
    } else {
      console.log('   ✓ No test assignments found');
    }

    // 6. Check for test session feedback
    console.log('\n💬 Checking session_feedback table for test data...');
    const testSessionIds = testSessions?.map(s => s.id) || [];

    if (testSessionIds.length > 0) {
      const { data: testFeedback } = await supabase
        .from('session_feedback')
        .select('*')
        .in('session_id', testSessionIds);

      if (testFeedback && testFeedback.length > 0) {
        testDataFound.push({
          table: 'session_feedback',
          count: testFeedback.length,
          records: testFeedback.map(f => ({
            id: f.id,
            session_id: f.session_id,
            rating: f.rating,
            created_at: f.created_at
          }))
        });
        console.log(`   Found ${testFeedback.length} test feedback records`);
      } else {
        console.log('   ✓ No test feedback found');
      }
    } else {
      console.log('   ✓ No test feedback found');
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST DATA SUMMARY');
    console.log('='.repeat(60));

    if (testDataFound.length === 0) {
      console.log('\n✅ No test data found! Database is clean.\n');
      return;
    }

    console.log('\n⚠️  Found test data in the following tables:\n');

    let totalRecords = 0;
    testDataFound.forEach(item => {
      console.log(`   ${item.table}: ${item.count} records`);
      totalRecords += item.count;
    });

    console.log(`\n   TOTAL: ${totalRecords} test records\n`);

    // Print detailed records
    console.log('='.repeat(60));
    console.log('📋 DETAILED RECORDS');
    console.log('='.repeat(60));

    testDataFound.forEach(item => {
      console.log(`\n${item.table.toUpperCase()}:`);
      console.log(JSON.stringify(item.records, null, 2));
    });

    console.log('\n' + '='.repeat(60));
    console.log('⚠️  NEXT STEPS:');
    console.log('='.repeat(60));
    console.log('\n1. Review the test data above');
    console.log('2. Confirm you want to delete this data');
    console.log('3. Run: npx tsx scripts/cleanup-test-data.ts');
    console.log('\n⚠️  WARNING: Deletion is permanent and cannot be undone!\n');

    // Save to file for reference
    const fs = require('fs');
    const reportPath = path.join(process.cwd(), 'test-data-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(testDataFound, null, 2));
    console.log(`📄 Full report saved to: ${reportPath}\n`);

  } catch (error) {
    console.error('❌ Error finding test data:', error);
    process.exit(1);
  }
}

findTestData();
