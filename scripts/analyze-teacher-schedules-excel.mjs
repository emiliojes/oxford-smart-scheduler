import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const excelPath = '2026 TEACHER SCHEDULES.xlsx';
const outputDir = 'output';

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('📊 ANALYZING TEACHER SCHEDULES EXCEL\n');
console.log('Reading:', excelPath);

// Read the workbook
const workbook = XLSX.readFile(excelPath);

console.log('\n📋 WORKBOOK STRUCTURE:');
console.log('Sheet names:', workbook.SheetNames);
console.log('Total sheets:', workbook.SheetNames.length);

// Analyze each sheet
workbook.SheetNames.forEach((sheetName, index) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`SHEET ${index + 1}: "${sheetName}"`);
  console.log('='.repeat(60));
  
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  
  console.log(`Range: ${sheet['!ref']}`);
  console.log(`Rows: ${range.e.r + 1}, Columns: ${range.e.c + 1}`);
  
  // Convert to JSON to inspect structure
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Show first 20 rows
  console.log('\nFirst 20 rows preview:');
  data.slice(0, 20).forEach((row, i) => {
    const rowStr = row.map(cell => String(cell).substring(0, 30)).join(' | ');
    console.log(`Row ${i + 1}: ${rowStr}`);
  });
  
  // Export to CSV
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const csvPath = path.join(outputDir, `${sheetName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
  fs.writeFileSync(csvPath, csv);
  console.log(`\n✅ Exported to: ${csvPath}`);
  
  // Export to JSON
  const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
  const jsonPath = path.join(outputDir, `${sheetName.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
  console.log(`✅ Exported to: ${jsonPath}`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ ANALYSIS COMPLETE');
console.log('='.repeat(60));
console.log('\nAll sheets exported to:', outputDir);
console.log('\nNext steps:');
console.log('1. Review the CSV/JSON files to understand the structure');
console.log('2. Identify teacher names, grades, time slots, and lunch blocks');
console.log('3. Create classification logic for Middle/High School teachers');
