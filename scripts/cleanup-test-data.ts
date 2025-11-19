/**
 * Script to delete test data from the database
 * ⚠️  WARNING: This will permanently delete data!
 *
 * Usage: npx tsx scripts/cleanup-test-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function cleanupTestData() {
  console.log('🧹 TEST DATA CLEANUP SCRIPT');
  console.log('='.repeat(60));
  console.log('\n⚠️  WARNING: This will permanently delete test data!');
  console.log('   - Test users and their associated data');
  console.log('   - Test students and their counseling sessions');
  console.log('   - Test mentors and their assignments');
  console.log('   - Test counseling sessions and feedback');
  console.log('\n⚠️  This action CANNOT be undone!\n');

  try {
    // First, load the test data report
    const fs = require('fs');
    const reportPath = path.join(process.cwd(), 'test-data-report.json');

    if (!fs.existsSync(reportPath)) {
      console.error('❌ Test data report not found!');
      console.log('   Run: npx tsx scripts/find-test-data.ts first\n');
      rl.close();
      process.exit(1);
    }

    const testDataReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

    if (testDataReport.length === 0) {
      console.log('✅ No test data to clean up!\n');
      rl.close();
      return;
    }

    console.log('📊 Found test data in these tables:');
    testDataReport.forEach((item: any) => {
      console.log(`   - ${item.table}: ${item.count} records`);
    });
    console.log('');

    // Get user confirmation
    const answer = await askQuestion('Type "DELETE" to proceed with cleanup (or anything else to cancel): ');

    if (answer.trim() !== 'DELETE') {
      console.log('\n❌ Cleanup cancelled by user\n');
      rl.close();
      return;
    }

    console.log('\n🗑️  Starting cleanup...\n');

    let deletedCount = 0;

    // Delete in order to respect foreign key constraints
    // 1. Delete session feedback first
    const feedbackData = testDataReport.find((item: any) => item.table === 'session_feedback');
    if (feedbackData) {
      const feedbackIds = feedbackData.records.map((r: any) => r.id);
      const { error } = await supabase
        .from('session_feedback')
        .delete()
        .in('id', feedbackIds);

      if (error) {
        console.error('❌ Error deleting session feedback:', error);
      } else {
        console.log(`   ✓ Deleted ${feedbackData.count} session feedback records`);
        deletedCount += feedbackData.count;
      }
    }

    // 2. Delete counseling sessions
    const sessionsData = testDataReport.find((item: any) => item.table === 'counseling_sessions');
    if (sessionsData) {
      const sessionIds = sessionsData.records.map((r: any) => r.id);
      const { error } = await supabase
        .from('counseling_sessions')
        .delete()
        .in('id', sessionIds);

      if (error) {
        console.error('❌ Error deleting counseling sessions:', error);
      } else {
        console.log(`   ✓ Deleted ${sessionsData.count} counseling sessions`);
        deletedCount += sessionsData.count;
      }
    }

    // 3. Delete mentor_student assignments
    const assignmentsData = testDataReport.find((item: any) => item.table === 'mentor_student');
    if (assignmentsData) {
      const assignmentIds = assignmentsData.records.map((r: any) => r.id);
      const { error } = await supabase
        .from('mentor_student')
        .delete()
        .in('id', assignmentIds);

      if (error) {
        console.error('❌ Error deleting mentor assignments:', error);
      } else {
        console.log(`   ✓ Deleted ${assignmentsData.count} mentor-student assignments`);
        deletedCount += assignmentsData.count;
      }
    }

    // 4. Delete students
    const studentsData = testDataReport.find((item: any) => item.table === 'students');
    if (studentsData) {
      const studentIds = studentsData.records.map((r: any) => r.id);
      const { error } = await supabase
        .from('students')
        .delete()
        .in('id', studentIds);

      if (error) {
        console.error('❌ Error deleting students:', error);
      } else {
        console.log(`   ✓ Deleted ${studentsData.count} students`);
        deletedCount += studentsData.count;
      }
    }

    // 5. Delete mentors
    const mentorsData = testDataReport.find((item: any) => item.table === 'mentors');
    if (mentorsData) {
      const mentorIds = mentorsData.records.map((r: any) => r.id);
      const { error } = await supabase
        .from('mentors')
        .delete()
        .in('id', mentorIds);

      if (error) {
        console.error('❌ Error deleting mentors:', error);
      } else {
        console.log(`   ✓ Deleted ${mentorsData.count} mentors`);
        deletedCount += mentorsData.count;
      }
    }

    // 6. Delete all records that reference test users
    const usersData = testDataReport.find((item: any) => item.table === 'users');
    if (usersData) {
      const userIds = usersData.records.map((r: any) => r.id);

      // First delete session_feedback records where submitted_by references test users
      const { data: feedbackToDelete } = await supabase
        .from('session_feedback')
        .select('id')
        .in('submitted_by', userIds);

      if (feedbackToDelete && feedbackToDelete.length > 0) {
        const { error: deleteFeedbackError } = await supabase
          .from('session_feedback')
          .delete()
          .in('id', feedbackToDelete.map(f => f.id));

        if (deleteFeedbackError) {
          console.error('❌ Error deleting session_feedback:', deleteFeedbackError);
        } else {
          console.log(`   ✓ Deleted ${feedbackToDelete.length} session_feedback records referencing test users`);
          deletedCount += feedbackToDelete.length;
        }
      }

      // Delete mentor_students records where assigned_by references test users
      const { data: mentorStudentsToDelete } = await supabase
        .from('mentor_students')
        .select('id')
        .in('assigned_by', userIds);

      if (mentorStudentsToDelete && mentorStudentsToDelete.length > 0) {
        const { error: deleteAssignmentsError } = await supabase
          .from('mentor_students')
          .delete()
          .in('id', mentorStudentsToDelete.map(ms => ms.id));

        if (deleteAssignmentsError) {
          console.error('❌ Error deleting mentor_students assignments:', deleteAssignmentsError);
        } else {
          console.log(`   ✓ Deleted ${mentorStudentsToDelete.length} mentor_students assignments referencing test users`);
          deletedCount += mentorStudentsToDelete.length;
        }
      }

      // Now delete users
      const { error } = await supabase
        .from('users')
        .delete()
        .in('id', userIds);

      if (error) {
        console.error('❌ Error deleting users:', error);
      } else {
        console.log(`   ✓ Deleted ${usersData.count} users`);
        deletedCount += usersData.count;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ CLEANUP COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n   Total records deleted: ${deletedCount}\n`);
    console.log('🎉 Your database is now ready for production!\n');

    // Delete the report file
    fs.unlinkSync(reportPath);
    console.log('📄 Test data report deleted\n');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

cleanupTestData();
