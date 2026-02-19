/**
 * Test JKKN API Connection
 *
 * This script tests if the API key is valid and the endpoints are working.
 * Run: npx tsx scripts/test-jkkn-api.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local for Next.js projects
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

async function testEndpoint(name: string, url: string): Promise<boolean> {
  console.log(`\n📡 Testing: ${name}`);
  console.log(`   URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${contentType}`);

    if (response.ok && isJson) {
      const data = await response.json();
      console.log(`   ✅ SUCCESS! Response has ${data.data?.length || 0} items`);
      return true;
    } else {
      const text = await response.text();
      const preview = text.substring(0, 200);
      console.log(`   ❌ FAILED: ${preview}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('🔑 JKKN API CONNECTION TEST');
  console.log('='.repeat(80));

  console.log('\n📋 Configuration:');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   API Key: ${API_KEY ? `${API_KEY.substring(0, 10)}...${API_KEY.slice(-4)}` : 'NOT SET'}`);
  console.log(`   Key Length: ${API_KEY?.length || 0} characters`);

  if (!API_KEY) {
    console.error('\n❌ Error: NEXT_PUBLIC_MYJKKN_API_KEY is not set in .env.local');
    process.exit(1);
  }

  // Test various endpoints
  const endpoints = [
    // Learners API
    { name: 'Learners/Students (Profiles)', url: `${BASE_URL}/api-management/learners/profiles?page=1&limit=1` },
    { name: 'Students (Legacy/Alt)', url: `${BASE_URL}/api-management/students?page=1&limit=1` },
    // Staff API
    { name: 'Staff', url: `${BASE_URL}/api-management/staff?page=1&limit=1` },
    // Organizations API
    { name: 'Institutions', url: `${BASE_URL}/api-management/organizations/institutions?page=1&limit=1` },
    { name: 'Departments', url: `${BASE_URL}/api-management/organizations/departments?page=1&limit=1` },
    // Academic API
    { name: 'Academic Years', url: `${BASE_URL}/api-management/academic/academic-years?page=1&limit=1` },
    { name: 'Regulations', url: `${BASE_URL}/api-management/academic/regulations?page=1&limit=1` },
    { name: 'Batches', url: `${BASE_URL}/api-management/academic/batches?page=1&limit=1` },
  ];

  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING ENDPOINTS');
  console.log('='.repeat(80));

  let successCount = 0;

  for (const endpoint of endpoints) {
    const success = await testEndpoint(endpoint.name, endpoint.url);
    if (success) successCount++;
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 RESULTS');
  console.log('='.repeat(80));
  console.log(`   Passed: ${successCount}/${endpoints.length}`);

  if (successCount === 0) {
    console.log('\n⚠️  ALL endpoints failed!');
    console.log('\nPossible causes:');
    console.log('1. API key has expired or been revoked');
    console.log('2. API key format is incorrect');
    console.log('3. JKKN API server is down');
    console.log('4. Network connectivity issue');
    console.log('\n💡 Solution: Generate a new API key from JKKN API Management dashboard');
  } else if (successCount < endpoints.length) {
    console.log('\n⚠️  Some endpoints failed - check specific errors above');
  } else {
    console.log('\n✅ All endpoints working correctly!');
  }

  console.log('\n');
}

main().catch(console.error);
