/**
 * Check DR. THANKAMANI A's User Access
 *
 * This script checks what institution access DR. THANKAMANI A should have
 *
 * Run: npx tsx scripts/check-user-access.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECKING DR. THANKAMANI A USER ACCESS');
  console.log('='.repeat(80) + '\n');

  const email = 'thankamaniammal@jkkn.ac.in';

  // Get user data
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (userError) {
    console.error('❌ Error fetching user:', userError);
    process.exit(1);
  }

  if (!user) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }

  console.log('📋 USER DATA:');
  console.log('─'.repeat(80));
  console.log('  ID:', user.id);
  console.log('  Email:', user.email);
  console.log('  Name:', user.name);
  console.log('  Role:', user.role);
  console.log('  JKKN User ID:', user.jkkn_user_id);
  console.log('  Institution ID:', user.institution_id);
  console.log('  Department ID:', user.department_id);
  console.log();

  // Check if institution ID exists
  if (!user.institution_id) {
    console.log('⚠️  WARNING: No institution_id found!');
    console.log('   This user will see ALL institutions\' data!');
    console.log();
  }

  // Get institution details from JKKN API
  if (user.institution_id) {
    const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY!;
    const BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

    console.log('🏢 FETCHING INSTITUTION DETAILS FROM JKKN API...');
    console.log('─'.repeat(80));

    try {
      // Fetch all institutions
      const url = `${BASE_URL}/api-management/institutions`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const institutions = data.data || [];
        const userInstitution = institutions.find((inst: any) => inst.id === user.institution_id);

        if (userInstitution) {
          console.log('  Institution Name:', userInstitution.institution_name || userInstitution.name);
          console.log('  Institution ID:', userInstitution.id);
          console.log();
        } else {
          console.log('  ⚠️  Institution ID not found in JKKN API!');
          console.log();
        }
      }
    } catch (error) {
      console.log('  ⚠️  Could not fetch institution details:', error);
      console.log();
    }
  }

  // Check user's role and what access they should have
  console.log('🔐 ACCESS CONTROL ANALYSIS:');
  console.log('─'.repeat(80));

  const isSuperAdmin = user.role === 'super_admin';

  if (isSuperAdmin) {
    console.log('  ✅ User is SUPER ADMIN');
    console.log('  → Should see ALL institutions\' data');
  } else if (user.institution_id) {
    console.log('  ✅ User has institution_id:', user.institution_id);
    console.log('  → Should ONLY see data from this institution');
  } else {
    console.log('  ❌ User is NOT super admin AND has NO institution_id!');
    console.log('  → This will cause the institution filter to NOT be applied');
    console.log('  → User will see ALL institutions\' data (BUG!)');
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ CHECK COMPLETE');
  console.log('='.repeat(80));
  console.log();

  if (!isSuperAdmin && !user.institution_id) {
    console.log('🚨 CRITICAL ISSUE FOUND:');
    console.log('   User is not super admin but has no institution_id');
    console.log('   This violates access control - user should NOT see all institutions');
    console.log();
    console.log('💡 SOLUTION:');
    console.log('   Update user\'s institution_id to their correct institution from JKKN API');
    console.log();
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
