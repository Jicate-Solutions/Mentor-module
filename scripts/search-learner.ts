/**
 * Search for specific learner in JKKN API
 * Run: npx tsx scripts/search-learner.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

const SEARCH_NAME = 'NIDHARSHANA';
const SEARCH_LAST_NAME = 'K';

interface Learner {
  id: string;
  first_name: string;
  last_name: string;
  register_number: string;
  college_email: string;
  student_email: string;
  student_mobile: string;
  department_id: string;
  lifecycle_status: string;
}

async function fetchPage(page: number, limit: number = 100): Promise<{ data: Learner[]; total: number; totalPages: number }> {
  const url = `${BASE_URL}/api-management/learners/profiles?page=${page}&limit=${limit}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return {
    data: result.data || [],
    total: result.pagination?.total || result.total || 0,
    totalPages: result.pagination?.totalPages || result.totalPages || 0,
  };
}

async function searchWithSearchParam(): Promise<boolean> {
  console.log('\n1️⃣ Testing API search parameter...');

  // Try with search parameter
  const searchUrl = `${BASE_URL}/api-management/learners/profiles?search=${encodeURIComponent(SEARCH_NAME)}&page=1&limit=100`;
  console.log(`   URL: ${searchUrl}`);

  try {
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Search param supported! Found ${result.data?.length || 0} results`);

      if (result.data && result.data.length > 0) {
        result.data.forEach((learner: Learner) => {
          console.log(`   - ${learner.first_name} ${learner.last_name} | ${learner.register_number || 'No Reg#'} | ${learner.college_email || 'No Email'}`);
        });
        return true;
      }
    } else {
      console.log(`   ❌ Search param not supported or no results`);
    }
  } catch (error) {
    console.log(`   ❌ Search param failed: ${error}`);
  }

  return false;
}

async function searchByFirstName(): Promise<boolean> {
  console.log('\n2️⃣ Testing first_name filter...');

  const url = `${BASE_URL}/api-management/learners/profiles?first_name=${encodeURIComponent(SEARCH_NAME)}&page=1&limit=100`;
  console.log(`   URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const result = await response.json();
      const matches = result.data?.filter((l: Learner) =>
        l.first_name?.toUpperCase().includes(SEARCH_NAME.toUpperCase())
      ) || [];

      console.log(`   Total in response: ${result.data?.length || 0}`);
      console.log(`   Matches for "${SEARCH_NAME}": ${matches.length}`);

      if (matches.length > 0) {
        matches.forEach((learner: Learner) => {
          console.log(`   ✅ FOUND: ${learner.first_name} ${learner.last_name} | ${learner.register_number || 'No Reg#'} | Status: ${learner.lifecycle_status}`);
        });
        return true;
      }
    }
  } catch (error) {
    console.log(`   ❌ Filter failed: ${error}`);
  }

  return false;
}

async function paginateAndSearch(): Promise<void> {
  console.log('\n3️⃣ Paginating through all learners to find matches...');

  const firstPage = await fetchPage(1, 100);
  const totalPages = firstPage.totalPages;
  const total = firstPage.total;

  console.log(`   Total learners: ${total}`);
  console.log(`   Total pages: ${totalPages}`);
  console.log(`   Searching for: "${SEARCH_NAME}" with last name "${SEARCH_LAST_NAME}"...`);

  const foundLearners: Learner[] = [];
  const partialMatches: Learner[] = [];

  for (let page = 1; page <= totalPages; page++) {
    process.stdout.write(`\r   Scanning page ${page}/${totalPages}...`);

    try {
      const result = await fetchPage(page, 100);

      for (const learner of result.data) {
        const firstName = learner.first_name?.toUpperCase() || '';
        const lastName = learner.last_name?.toUpperCase() || '';

        // Exact match
        if (firstName === SEARCH_NAME.toUpperCase() && lastName === SEARCH_LAST_NAME.toUpperCase()) {
          foundLearners.push(learner);
        }
        // Partial match on first name containing NIDHARSHANA
        else if (firstName.includes('NIDHARSHANA') || firstName.includes('NIDHAR')) {
          partialMatches.push(learner);
        }
      }
    } catch (error) {
      console.log(`\n   ⚠️ Error on page ${page}: ${error}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('\n\n' + '='.repeat(60));
  console.log('SEARCH RESULTS');
  console.log('='.repeat(60));

  if (foundLearners.length > 0) {
    console.log(`\n✅ EXACT MATCHES for "${SEARCH_NAME} ${SEARCH_LAST_NAME}": ${foundLearners.length}`);
    foundLearners.forEach((l, i) => {
      console.log(`\n   Match ${i + 1}:`);
      console.log(`   - ID: ${l.id}`);
      console.log(`   - Name: ${l.first_name} ${l.last_name}`);
      console.log(`   - Register#: ${l.register_number || 'N/A'}`);
      console.log(`   - College Email: ${l.college_email || 'N/A'}`);
      console.log(`   - Status: ${l.lifecycle_status}`);
    });
  } else {
    console.log(`\n❌ NO EXACT MATCH found for "${SEARCH_NAME} ${SEARCH_LAST_NAME}"`);
  }

  if (partialMatches.length > 0) {
    console.log(`\n📋 PARTIAL MATCHES (similar names): ${partialMatches.length}`);
    partialMatches.forEach((l, i) => {
      console.log(`   ${i + 1}. ${l.first_name} ${l.last_name} | ${l.register_number || 'No Reg#'} | ${l.lifecycle_status}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔍 LEARNER SEARCH TEST');
  console.log('='.repeat(60));
  console.log(`Searching for: ${SEARCH_NAME}.${SEARCH_LAST_NAME}`);
  console.log(`API: ${BASE_URL}/api-management/learners/profiles`);

  if (!API_KEY) {
    console.error('❌ API key not set!');
    process.exit(1);
  }

  // Try different search methods
  const searchParamFound = await searchWithSearchParam();

  if (!searchParamFound) {
    await searchByFirstName();
  }

  // Always do full pagination search to be thorough
  await paginateAndSearch();
}

main().catch(console.error);
