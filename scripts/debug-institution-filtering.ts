/**
 * Debug Institution Filtering Issues
 *
 * This script helps debug why some mentors/staff don't appear when filtering by institution.
 *
 * Run: npx tsx scripts/debug-institution-filtering.ts
 */

import 'dotenv/config';

const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

interface StaffMember {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  designation?: string;
  institution?: any;
  institution_id?: string;
  department?: any;
}

async function fetchAllStaff(): Promise<StaffMember[]> {
  console.log('🔍 Fetching ALL staff from JKKN API...\n');

  let allStaff: StaffMember[] = [];
  let currentPage = 1;
  const maxLimit = 1000;
  let hasMore = true;

  while (hasMore) {
    const url = `${BASE_URL}/api-management/staff?page=${currentPage}&limit=${maxLimit}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`❌ Failed to fetch page ${currentPage}: ${response.status} ${response.statusText}`);
        break;
      }

      const data = await response.json();
      const pageStaff = data.data || [];

      allStaff = [...allStaff, ...pageStaff];
      console.log(`✓ Page ${currentPage}: ${pageStaff.length} staff members (total: ${allStaff.length})`);

      hasMore = pageStaff.length === maxLimit;
      currentPage++;
    } catch (error) {
      console.error(`❌ Error fetching page ${currentPage}:`, error);
      break;
    }
  }

  console.log(`\n📊 Total staff fetched: ${allStaff.length}\n`);
  return allStaff;
}

function extractInstitutionId(staff: StaffMember): string {
  // Try multiple ways to extract institution_id
  if (typeof staff.institution === 'object' && staff.institution !== null) {
    return staff.institution.id || staff.institution.institution_id || '';
  }
  if (typeof staff.institution === 'string') {
    return staff.institution;
  }
  if (staff.institution_id) {
    return staff.institution_id;
  }
  return '';
}

function extractInstitutionName(staff: StaffMember): string {
  if (typeof staff.institution === 'object' && staff.institution !== null) {
    return staff.institution.institution_name || staff.institution.name || 'Unknown';
  }
  if (typeof staff.institution === 'string') {
    return staff.institution;
  }
  return 'Unknown';
}

async function analyzeInstitutionData(allStaff: StaffMember[]) {
  console.log('🔬 ANALYZING INSTITUTION DATA\n');
  console.log('='.repeat(80));

  // Group staff by institution
  const institutionGroups = new Map<string, StaffMember[]>();
  const staffWithoutInstitution: StaffMember[] = [];

  allStaff.forEach(staff => {
    const institutionId = extractInstitutionId(staff);

    if (!institutionId) {
      staffWithoutInstitution.push(staff);
    } else {
      if (!institutionGroups.has(institutionId)) {
        institutionGroups.set(institutionId, []);
      }
      institutionGroups.get(institutionId)!.push(staff);
    }
  });

  // Show institution breakdown
  console.log('\n📍 INSTITUTION BREAKDOWN:\n');
  console.log('Institution ID                        | Institution Name              | Staff Count');
  console.log('-'.repeat(80));

  const sortedInstitutions = Array.from(institutionGroups.entries())
    .sort((a, b) => b[1].length - a[1].length); // Sort by staff count

  sortedInstitutions.forEach(([institutionId, staff]) => {
    const institutionName = extractInstitutionName(staff[0]);
    console.log(
      `${institutionId.padEnd(40)} | ${institutionName.padEnd(30)} | ${staff.length}`
    );
  });

  // Show staff WITHOUT institution
  if (staffWithoutInstitution.length > 0) {
    console.log('\n⚠️  STAFF WITHOUT INSTITUTION ID:\n');
    console.log('ID                                   | Name                     | Email');
    console.log('-'.repeat(80));

    staffWithoutInstitution.slice(0, 20).forEach(staff => {
      const name = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'N/A';
      const email = staff.email || 'N/A';
      console.log(`${staff.id.padEnd(40)} | ${name.padEnd(25)} | ${email}`);
    });

    if (staffWithoutInstitution.length > 20) {
      console.log(`\n... and ${staffWithoutInstitution.length - 20} more without institution ID`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY:\n');
  console.log(`Total Staff: ${allStaff.length}`);
  console.log(`Unique Institutions: ${institutionGroups.size}`);
  console.log(`Staff WITHOUT institution: ${staffWithoutInstitution.length} (${((staffWithoutInstitution.length / allStaff.length) * 100).toFixed(1)}%)`);

  return { institutionGroups, staffWithoutInstitution };
}

async function debugSpecificStaff(allStaff: StaffMember[], searchTerm: string) {
  console.log(`\n\n🔍 SEARCHING FOR: "${searchTerm}"\n`);
  console.log('='.repeat(80));

  const normalizedSearch = searchTerm.toLowerCase();

  const matches = allStaff.filter(staff => {
    const name = `${staff.first_name || ''} ${staff.last_name || ''}`.toLowerCase();
    const email = (staff.email || '').toLowerCase();
    const id = staff.id.toLowerCase();

    return name.includes(normalizedSearch) ||
           email.includes(normalizedSearch) ||
           id.includes(normalizedSearch);
  });

  if (matches.length === 0) {
    console.log('❌ No staff members found matching your search.\n');
    return;
  }

  console.log(`✓ Found ${matches.length} matching staff member(s):\n`);

  matches.forEach((staff, index) => {
    const name = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'N/A';
    const institutionId = extractInstitutionId(staff);
    const institutionName = extractInstitutionName(staff);

    console.log(`\n--- Match #${index + 1} ---`);
    console.log(`ID: ${staff.id}`);
    console.log(`Name: ${name}`);
    console.log(`Email: ${staff.email || 'N/A'}`);
    console.log(`Designation: ${staff.designation || 'N/A'}`);
    console.log(`Institution ID: ${institutionId || '❌ MISSING'}`);
    console.log(`Institution Name: ${institutionName}`);
    console.log(`\nRaw institution data:`, JSON.stringify(staff.institution, null, 2));

    if (!institutionId) {
      console.log('\n⚠️  THIS STAFF MEMBER HAS NO INSTITUTION ID!');
      console.log('   This is why they won\'t appear when filtering by institution.');
    }
  });

  console.log('\n' + '='.repeat(80));
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 INSTITUTION FILTERING DEBUGGER');
  console.log('='.repeat(80) + '\n');

  if (!API_KEY) {
    console.error('❌ Error: NEXT_PUBLIC_MYJKKN_API_KEY not found in .env.local');
    process.exit(1);
  }

  // Fetch all staff
  const allStaff = await fetchAllStaff();

  if (allStaff.length === 0) {
    console.error('❌ No staff data fetched. Cannot continue.');
    process.exit(1);
  }

  // Analyze institution data
  const { institutionGroups, staffWithoutInstitution } = await analyzeInstitutionData(allStaff);

  // Interactive search
  const searchTerm = process.argv[2];

  if (searchTerm) {
    await debugSpecificStaff(allStaff, searchTerm);
  } else {
    console.log('\n💡 TIP: To search for a specific staff member, run:');
    console.log('   npx tsx scripts/debug-institution-filtering.ts "search term"');
    console.log('\n   Example:');
    console.log('   npx tsx scripts/debug-institution-filtering.ts "john"');
    console.log('   npx tsx scripts/debug-institution-filtering.ts "mentor@jkkn.ac.in"\n');
  }

  // Show sample data structure
  console.log('\n📋 SAMPLE STAFF DATA STRUCTURE:\n');
  if (allStaff.length > 0) {
    console.log(JSON.stringify(allStaff[0], null, 2));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Analysis complete!');
  console.log('='.repeat(80) + '\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
