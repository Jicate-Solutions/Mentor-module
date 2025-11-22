/**
 * Sync User Institutions from JKKN API
 *
 * This script fetches institution and department data from JKKN API
 * for users who have NULL institution_id or department_id.
 *
 * Usage:
 *   npx tsx scripts/sync-user-institutions.ts
 */

import { createAdminClient } from '../lib/supabase/server';

const JKKN_API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
const JKKN_BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

interface JKKNStaffMember {
  id: string;
  institution?: {
    id: string;
    name: string;
  } | string;
  institution_id?: string;
  department?: {
    id: string;
    name: string;
  } | string;
  department_id?: string;
  email?: string;
  [key: string]: any;
}

async function fetchStaffFromJKKN(jkknUserId: string): Promise<JKKNStaffMember | null> {
  try {
    const url = `${JKKN_BASE_URL}/api-management/staff/${jkknUserId}`;

    console.log(`[JKKN API] Fetching staff: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JKKN_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[JKKN API] Error ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    // Handle different response formats
    if (data.data) {
      return data.data;
    } else if (data.id) {
      return data;
    }

    return null;
  } catch (error) {
    console.error(`[JKKN API] Fetch error:`, error);
    return null;
  }
}

function extractInstitutionId(staff: JKKNStaffMember): string | null {
  if (staff.institution_id) return staff.institution_id;

  if (typeof staff.institution === 'object' && staff.institution !== null) {
    return staff.institution.id || null;
  }

  if (typeof staff.institution === 'string') {
    return staff.institution;
  }

  return null;
}

function extractDepartmentId(staff: JKKNStaffMember): string | null {
  if (staff.department_id) return staff.department_id;

  if (typeof staff.department === 'object' && staff.department !== null) {
    return staff.department.id || null;
  }

  if (typeof staff.department === 'string') {
    return staff.department;
  }

  return null;
}

async function syncUserInstitutions() {
  console.log('🔄 Starting user institution sync...\n');

  if (!JKKN_API_KEY) {
    console.error('❌ JKKN API key not configured. Set NEXT_PUBLIC_MYJKKN_API_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createAdminClient();

  // Get users with missing institution or department data
  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('id, email, full_name, role, institution_id, department_id, jkkn_user_id')
    .or('institution_id.is.null,department_id.is.null')
    .not('role', 'eq', 'super_admin');

  if (fetchError) {
    console.error('❌ Error fetching users:', fetchError);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('✅ No users need institution/department updates');
    return;
  }

  console.log(`📋 Found ${users.length} users with missing data:\n`);

  let updatedCount = 0;
  let failedCount = 0;

  for (const user of users) {
    console.log(`\n👤 Processing: ${user.full_name} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Current: institution=${user.institution_id || 'NULL'}, department=${user.department_id || 'NULL'}`);

    // Skip if both values are already set
    if (user.institution_id && user.department_id) {
      console.log('   ⏭️  Skipping (already has both values)');
      continue;
    }

    // Fetch from JKKN API
    const staffData = await fetchStaffFromJKKN(user.jkkn_user_id);

    if (!staffData) {
      console.log('   ❌ Failed to fetch from JKKN API');
      failedCount++;
      continue;
    }

    const institutionId = extractInstitutionId(staffData);
    const departmentId = extractDepartmentId(staffData);

    console.log(`   JKKN API: institution=${institutionId || 'NULL'}, department=${departmentId || 'NULL'}`);

    // Prepare update
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (!user.institution_id && institutionId) {
      updates.institution_id = institutionId;
    }

    if (!user.department_id && departmentId) {
      updates.department_id = departmentId;
    }

    // Skip if no updates needed
    if (Object.keys(updates).length === 1) { // Only updated_at
      console.log('   ⚠️  No new data from JKKN API');
      failedCount++;
      continue;
    }

    // Update database
    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (updateError) {
      console.log(`   ❌ Update failed:`, updateError.message);
      failedCount++;
    } else {
      console.log(`   ✅ Updated successfully`);
      updatedCount++;
    }

    // Rate limiting - wait 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Sync Summary:');
  console.log(`   Total users processed: ${users.length}`);
  console.log(`   ✅ Successfully updated: ${updatedCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  console.log('='.repeat(60));

  // Verification query
  const { data: verification } = await supabase
    .from('users')
    .select('role, institution_id, department_id')
    .not('role', 'eq', 'super_admin');

  if (verification) {
    const missing = verification.filter(u => !u.institution_id || !u.department_id);

    if (missing.length > 0) {
      console.log(`\n⚠️  Still ${missing.length} users with missing data`);
      console.log('   These may need manual intervention.');
    } else {
      console.log('\n✅ All users now have institution and department data!');
    }
  }
}

// Run the sync
syncUserInstitutions()
  .then(() => {
    console.log('\n✅ Sync completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  });
