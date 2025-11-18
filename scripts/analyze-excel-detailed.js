const XLSX = require('xlsx');

// Read the Excel file
const workbook = XLSX.readFile('docs/DEEPAK_ER.xlsx');
const worksheet = workbook.Sheets['Counseling Report'];

// Get cell styles and formatting
console.log('=== DETAILED EXCEL STRUCTURE ANALYSIS ===\n');

// Check header row styles
console.log('Header Row (Row 4) Details:');
const headerCells = ['A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4', 'I4', 'J4', 'K4', 'L4', 'M4', 'N4', 'O4'];
headerCells.forEach((cell) => {
  if (worksheet[cell]) {
    console.log(`  ${cell}: ${worksheet[cell].v}`);
  }
});

console.log('\n=== Title Rows (1-2) ===');
console.log('Row 1 (A1):', worksheet['A1']?.v);
console.log('Row 2 (A2):', worksheet['A2']?.v);

// Check if there are merged cells
if (worksheet['!merges']) {
  console.log('\n=== Merged Cells ===');
  worksheet['!merges'].forEach((merge) => {
    const start = XLSX.utils.encode_cell(merge.s);
    const end = XLSX.utils.encode_cell(merge.e);
    const value = worksheet[start]?.v || '';
    console.log(`  ${start}:${end} = "${value}"`);
  });
}

// Show all data rows
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
console.log('\n=== Total Rows ===');
console.log(`Total data rows: ${jsonData.length}`);
console.log(`Data rows (excluding headers): ${jsonData.length - 4}`);

// Analyze unique values in key columns
console.log('\n=== Data Analysis ===');
const sessions = new Set();
const dates = new Set();
const students = new Set();

jsonData.slice(4).forEach((row) => {
  if (row[1]) sessions.add(row[1]); // Session Name
  if (row[2]) dates.add(row[2]); // Date
  if (row[7]) students.add(row[7]); // Student Name
});

console.log(`Unique Sessions: ${sessions.size}`);
console.log('Sessions:', Array.from(sessions));
console.log(`\nUnique Dates: ${dates.size}`);
console.log('Dates:', Array.from(dates).slice(0, 5));
console.log(`\nUnique Students: ${students.size}`);

// Column headers
console.log('\n=== Column Structure ===');
const headers = jsonData[3] || [];
headers.forEach((header, idx) => {
  console.log(`Column ${String.fromCharCode(65 + idx)} (${idx}): ${header}`);
});
