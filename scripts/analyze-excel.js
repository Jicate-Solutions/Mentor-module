const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const workbook = XLSX.readFile('docs/DEEPAK_ER.xlsx');

console.log('=== EXCEL FILE ANALYSIS ===\n');

// Get all sheet names
console.log('Sheet Names:');
workbook.SheetNames.forEach((name, idx) => {
  console.log(`  ${idx + 1}. ${name}`);
});
console.log('');

// Analyze each sheet
workbook.SheetNames.forEach((sheetName) => {
  console.log(`\n=== Sheet: ${sheetName} ===`);

  const worksheet = workbook.Sheets[sheetName];

  // Get the range
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  console.log(`Range: ${worksheet['!ref']}`);
  console.log(`Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}`);

  // Convert to JSON to see data structure
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  // Show first 20 rows
  console.log('\nFirst 20 rows:');
  jsonData.slice(0, 20).forEach((row, idx) => {
    console.log(`Row ${idx + 1}:`, JSON.stringify(row));
  });

  // Check for merged cells
  if (worksheet['!merges']) {
    console.log('\nMerged Cells:');
    worksheet['!merges'].forEach((merge) => {
      const start = XLSX.utils.encode_cell(merge.s);
      const end = XLSX.utils.encode_cell(merge.e);
      console.log(`  ${start}:${end}`);
    });
  }

  // Check column widths
  if (worksheet['!cols']) {
    console.log('\nColumn Widths:');
    worksheet['!cols'].forEach((col, idx) => {
      if (col.width) {
        console.log(`  Column ${idx}: ${col.width}`);
      }
    });
  }
});

console.log('\n=== END OF ANALYSIS ===');
