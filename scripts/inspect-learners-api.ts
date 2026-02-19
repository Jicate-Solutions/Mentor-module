
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local for Next.js projects
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.NEXT_PUBLIC_MYJKKN_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_MYJKKN_BASE_URL || 'https://www.jkkn.ai/api';

async function inspectLearners() {
    const url = `${BASE_URL}/api-management/learners/profiles?page=1&limit=1`;
    console.log(`Fetching: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();

        const output = {
            metadata: data.pagination || data.metadata || {},
            firstItem: data.data && data.data.length > 0 ? data.data[0] : null
        };

        const fs = require('fs');
        fs.writeFileSync('learners-structure.json', JSON.stringify(output, null, 2));
        console.log('Output written to learners-structure.json');

    } catch (error) {
        console.error('Fetch error:', error);
    }
}

inspectLearners();
