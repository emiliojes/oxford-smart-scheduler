import XLSX from 'xlsx';
import fs from 'fs';

const excelPath = '2026 TEACHER SCHEDULES.xlsx';
const outputDir = 'output';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('📊 TEACHER LUNCH CLASSIFICATION ANALYSIS\n');
console.log('Reading:', excelPath);

// Read the workbook
const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// Grade level classification
const MIDDLE_SCHOOL_GRADES = ['6A', '6B', '6', '7A', '7B', '7', '8A', '8B', '8'];
const HIGH_SCHOOL_GRADES = ['9A', '9B', '9', '10A', '10B', '10', '11A', '11B', '11', '12A', '12B', '12', 'IX', 'X', 'XI', 'XII'];

// Lunch times
const LUNCH_TIMES = {
  PRIMARY: '12:00-12:30',
  MIDDLE: '11:30-12:00',
  HIGH: '12:40-1:15'
};

const teachers = [];
let currentTeacher = null;

console.log('\n🔍 PARSING TEACHER SCHEDULES...\n');

// Parse the Excel structure
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  const firstCell = String(row[0] || '').trim();
  
  // Detect teacher header (contains "GRADE" and teacher name)
  if (firstCell.includes('GRADE') && row[1] && String(row[1]).length > 10) {
    if (currentTeacher) {
      teachers.push(currentTeacher);
    }
    
    const teacherInfo = String(row[1]);
    const nameMatch = teacherInfo.match(/^([A-ZÁ-Ú\s]+)/);
    const subjectMatch = teacherInfo.match(/([A-Z\s\-,]+\d[\d\-,\s]*)/);
    const hoursMatch = teacherInfo.match(/(\d+)\s*HRS/i);
    
    currentTeacher = {
      name: nameMatch ? nameMatch[1].trim() : 'Unknown',
      subject: subjectMatch ? subjectMatch[1].trim() : '',
      hours: hoursMatch ? parseInt(hoursMatch[1]) : 0,
      gradesTaught: new Set(),
      middleSchoolClasses: 0,
      highSchoolClasses: 0,
      lunchBlocks: [],
      schedule: []
    };
    
    continue;
  }
  
  // Parse schedule rows (skip headers and empty rows)
  if (currentTeacher && firstCell && !firstCell.includes('TIME') && !firstCell.includes('REGISTRATION') && !firstCell.includes('BREAK') && !firstCell.includes('www.')) {
    const timeSlot = firstCell;
    
    // Check if it's a lunch row
    if (timeSlot.includes('LUNCH') || row.slice(1, 6).some(cell => String(cell).includes('LUNCH'))) {
      for (let dayIdx = 1; dayIdx <= 5; dayIdx++) {
        const cellValue = String(row[dayIdx] || '').trim();
        if (cellValue.includes('LUNCH')) {
          currentTeacher.lunchBlocks.push({
            day: ['', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'][dayIdx],
            time: timeSlot,
            details: cellValue
          });
        }
      }
    }
    
    // Parse class assignments
    for (let dayIdx = 1; dayIdx <= 5; dayIdx++) {
      const cellValue = String(row[dayIdx] || '').trim();
      
      if (cellValue && !cellValue.includes('LUNCH') && !cellValue.includes('DUTY') && !cellValue.includes('HOMEROOM') && !cellValue.includes('REGISTRATION') && !cellValue.includes('BREAK') && !cellValue.includes('RESOURCE')) {
        // Extract grade from cell value
        const gradeMatch = cellValue.match(/(\d{1,2})\s*([AB]?)/i) || cellValue.match(/(IX|X|XI|XII)/i);
        
        if (gradeMatch) {
          let grade = gradeMatch[0].trim();
          
          // Normalize Roman numerals
          if (grade === 'IX') grade = '9';
          if (grade === 'X') grade = '10';
          if (grade === 'XI') grade = '11';
          if (grade === 'XII') grade = '12';
          
          currentTeacher.gradesTaught.add(grade);
          
          // Classify as Middle or High School
          const isMiddle = MIDDLE_SCHOOL_GRADES.some(mg => grade.startsWith(mg.replace(/[AB]/g, '')));
          const isHigh = HIGH_SCHOOL_GRADES.some(hg => grade.startsWith(hg.replace(/[AB]/g, '')));
          
          if (isMiddle) currentTeacher.middleSchoolClasses++;
          if (isHigh) currentTeacher.highSchoolClasses++;
          
          currentTeacher.schedule.push({
            day: ['', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'][dayIdx],
            time: timeSlot,
            grade: grade,
            details: cellValue
          });
        }
      }
    }
  }
}

// Add last teacher
if (currentTeacher) {
  teachers.push(currentTeacher);
}

console.log(`✅ Found ${teachers.length} teachers\n`);

// Classify teachers
const middleOnly = [];
const highOnly = [];
const mixed = [];
const unknown = [];

teachers.forEach(teacher => {
  teacher.gradesTaught = Array.from(teacher.gradesTaught).sort();
  
  if (teacher.middleSchoolClasses > 0 && teacher.highSchoolClasses === 0) {
    teacher.classification = 'MIDDLE_ONLY';
    teacher.suggestedLunch = LUNCH_TIMES.MIDDLE;
    middleOnly.push(teacher);
  } else if (teacher.highSchoolClasses > 0 && teacher.middleSchoolClasses === 0) {
    teacher.classification = 'HIGH_ONLY';
    teacher.suggestedLunch = LUNCH_TIMES.HIGH;
    highOnly.push(teacher);
  } else if (teacher.middleSchoolClasses > 0 && teacher.highSchoolClasses > 0) {
    teacher.classification = 'MIXED';
    teacher.suggestedLunch = 'CONFLICT - Manual decision required';
    mixed.push(teacher);
  } else {
    teacher.classification = 'UNKNOWN';
    teacher.suggestedLunch = 'N/A';
    unknown.push(teacher);
  }
});

// Generate reports
console.log('📋 CLASSIFICATION SUMMARY:\n');
console.log(`🟢 Middle School Only: ${middleOnly.length} teachers`);
console.log(`🔵 High School Only: ${highOnly.length} teachers`);
console.log(`🟡 Mixed (Middle + High): ${mixed.length} teachers`);
console.log(`⚪ Unknown/No classes: ${unknown.length} teachers`);

// Detailed report
const report = {
  summary: {
    total: teachers.length,
    middleOnly: middleOnly.length,
    highOnly: highOnly.length,
    mixed: mixed.length,
    unknown: unknown.length
  },
  lunchTimes: LUNCH_TIMES,
  teachers: teachers.map(t => ({
    name: t.name,
    subject: t.subject,
    hours: t.hours,
    classification: t.classification,
    gradesTaught: t.gradesTaught,
    middleSchoolClasses: t.middleSchoolClasses,
    highSchoolClasses: t.highSchoolClasses,
    suggestedLunch: t.suggestedLunch,
    currentLunchBlocks: t.lunchBlocks
  }))
};

// Save full report
fs.writeFileSync(`${outputDir}/teacher-lunch-classification.json`, JSON.stringify(report, null, 2));
console.log(`\n✅ Full report saved: ${outputDir}/teacher-lunch-classification.json`);

// Generate conflict report for mixed teachers
const conflictReport = mixed.map(t => ({
  teacher: t.name,
  subject: t.subject,
  gradesTaught: t.gradesTaught.join(', '),
  middleClasses: t.middleSchoolClasses,
  highClasses: t.highSchoolClasses,
  currentLunches: t.lunchBlocks.map(l => `${l.day} ${l.time}`).join('; '),
  options: [
    `Option 1: Middle School lunch (${LUNCH_TIMES.MIDDLE}) - if primarily teaching grades 6-8`,
    `Option 2: High School lunch (${LUNCH_TIMES.HIGH}) - if primarily teaching grades 9-12`,
    `Option 3: Split lunch - different times on different days based on schedule`
  ]
}));

fs.writeFileSync(`${outputDir}/conflict-report-mixed-teachers.json`, JSON.stringify(conflictReport, null, 2));
console.log(`✅ Conflict report saved: ${outputDir}/conflict-report-mixed-teachers.json`);

// Generate CSV summary
const csvLines = [
  'Teacher,Subject,Hours,Classification,Grades Taught,Middle Classes,High Classes,Suggested Lunch,Current Lunch'
];

teachers.forEach(t => {
  const currentLunch = t.lunchBlocks.map(l => `${l.day} ${l.time}`).join('; ');
  csvLines.push(`"${t.name}","${t.subject}",${t.hours},${t.classification},"${t.gradesTaught.join(', ')}",${t.middleSchoolClasses},${t.highSchoolClasses},"${t.suggestedLunch}","${currentLunch}"`);
});

fs.writeFileSync(`${outputDir}/teacher-lunch-summary.csv`, csvLines.join('\n'));
console.log(`✅ CSV summary saved: ${outputDir}/teacher-lunch-summary.csv`);

// Print detailed breakdown
console.log('\n' + '='.repeat(80));
console.log('MIDDLE SCHOOL ONLY TEACHERS (Lunch: 11:30-12:00)');
console.log('='.repeat(80));
middleOnly.forEach(t => {
  console.log(`\n${t.name} - ${t.subject}`);
  console.log(`  Grades: ${t.gradesTaught.join(', ')}`);
  console.log(`  Classes: ${t.middleSchoolClasses} middle school`);
});

console.log('\n' + '='.repeat(80));
console.log('HIGH SCHOOL ONLY TEACHERS (Lunch: 12:40-1:15)');
console.log('='.repeat(80));
highOnly.forEach(t => {
  console.log(`\n${t.name} - ${t.subject}`);
  console.log(`  Grades: ${t.gradesTaught.join(', ')}`);
  console.log(`  Classes: ${t.highSchoolClasses} high school`);
});

console.log('\n' + '='.repeat(80));
console.log('⚠️  MIXED TEACHERS - MANUAL DECISION REQUIRED');
console.log('='.repeat(80));
mixed.forEach(t => {
  console.log(`\n${t.name} - ${t.subject}`);
  console.log(`  Grades: ${t.gradesTaught.join(', ')}`);
  console.log(`  Classes: ${t.middleSchoolClasses} middle + ${t.highSchoolClasses} high school`);
  console.log(`  Current lunch blocks: ${t.lunchBlocks.map(l => `${l.day} ${l.time}`).join(', ')}`);
  console.log(`  ⚠️  DECISION NEEDED: Choose Middle (11:30-12:00) or High (12:40-1:15) lunch`);
});

if (unknown.length > 0) {
  console.log('\n' + '='.repeat(80));
  console.log('UNKNOWN/NO CLASSES');
  console.log('='.repeat(80));
  unknown.forEach(t => {
    console.log(`\n${t.name} - ${t.subject}`);
  });
}

console.log('\n' + '='.repeat(80));
console.log('✅ ANALYSIS COMPLETE');
console.log('='.repeat(80));
console.log('\nGenerated files:');
console.log(`  - ${outputDir}/teacher-lunch-classification.json (full data)`);
console.log(`  - ${outputDir}/conflict-report-mixed-teachers.json (mixed teachers)`);
console.log(`  - ${outputDir}/teacher-lunch-summary.csv (spreadsheet)`);
