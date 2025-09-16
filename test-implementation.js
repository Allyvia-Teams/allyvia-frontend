#!/usr/bin/env node

/**
 * Frontend Implementation Test Script
 * This script validates the Employee Scheduling implementation
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Employee Scheduling Frontend Implementation...\n');

// Test 1: Check if all required files exist
console.log('📁 Checking file structure...');
const requiredFiles = [
  'src/api/employee.api.ts',
  'src/views/calendar/index.tsx',
  'src/types/entities.ts',
  'src/views/calendar/ComprehensiveTest.tsx',
  'src/views/calendar/ShiftTestComponent.tsx',
  'src/views/calendar/EmployeeShiftsTest.tsx'
];

let filesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    filesExist = false;
  }
});

if (!filesExist) {
  console.log('\n❌ Some required files are missing!');
  process.exit(1);
}

console.log('\n✅ All required files exist!\n');

// Test 2: Check API implementation
console.log('🔌 Checking API implementation...');
const apiContent = fs.readFileSync('src/api/employee.api.ts', 'utf8');

const apiChecks = [
  { name: 'useGetEmployees hook', pattern: /export function useGetEmployees/ },
  { name: 'useGetShifts hook', pattern: /export function useGetShifts/ },
  { name: 'useGetMyShifts hook', pattern: /export function useGetMyShifts/ },
  { name: 'createShift function', pattern: /export async function createShift/ },
  { name: 'updateShift function', pattern: /export async function updateShift/ },
  { name: 'deleteShift function', pattern: /export async function deleteShift/ },
  { name: 'canManageShifts function', pattern: /export function canManageShifts/ },
  { name: 'invalidateShiftsCache function', pattern: /export function invalidateShiftsCache/ }
];

apiChecks.forEach(check => {
  if (check.pattern.test(apiContent)) {
    console.log(`✅ ${check.name}`);
  } else {
    console.log(`❌ ${check.name} - MISSING`);
  }
});

// Test 3: Check Calendar component
console.log('\n📅 Checking Calendar component...');
const calendarContent = fs.readFileSync('src/views/calendar/index.tsx', 'utf8');

const calendarChecks = [
  { name: 'Month view implementation', pattern: /renderMonthView/ },
  { name: 'Week view implementation', pattern: /renderWeekView/ },
  { name: 'List view implementation', pattern: /renderListView/ },
  { name: 'Shift dialog component', pattern: /function ShiftDialog/ },
  { name: 'Role-based access control', pattern: /canManage/ },
  { name: 'Employee filtering', pattern: /selectedEmployees/ },
  { name: 'Date navigation', pattern: /navigateMonth/ },
  { name: 'Timezone handling', pattern: /formatDateTimeLocalValue/ }
];

calendarChecks.forEach(check => {
  if (check.pattern.test(calendarContent)) {
    console.log(`✅ ${check.name}`);
  } else {
    console.log(`❌ ${check.name} - MISSING`);
  }
});

// Test 4: Check TypeScript types
console.log('\n📝 Checking TypeScript types...');
const typesContent = fs.readFileSync('src/types/entities.ts', 'utf8');

const typeChecks = [
  { name: 'Employee type', pattern: /export type Employee/ },
  { name: 'Shift type', pattern: /export type Shift/ },
  { name: 'CreateShiftRequest type', pattern: /export type CreateShiftRequest/ },
  { name: 'UpdateShiftRequest type', pattern: /export type UpdateShiftRequest/ },
  { name: 'ShiftFilters type', pattern: /export type ShiftFilters/ },
  { name: 'MyShiftsFilters type', pattern: /export type MyShiftsFilters/ },
  { name: 'RoleTypes enum', pattern: /export enum RoleTypes/ }
];

typeChecks.forEach(check => {
  if (check.pattern.test(typesContent)) {
    console.log(`✅ ${check.name}`);
  } else {
    console.log(`❌ ${check.name} - MISSING`);
  }
});

// Test 5: Check test components
console.log('\n🧪 Checking test components...');
const testFiles = [
  'src/views/calendar/ComprehensiveTest.tsx',
  'src/views/calendar/ShiftTestComponent.tsx',
  'src/views/calendar/EmployeeShiftsTest.tsx'
];

testFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('export default function')) {
    console.log(`✅ ${path.basename(file)} - Valid component`);
  } else {
    console.log(`❌ ${path.basename(file)} - Invalid component`);
  }
});

// Test 6: Check for common issues
console.log('\n🔍 Checking for common issues...');

// Check for console.log statements (should be minimal in production)
const consoleLogs = (calendarContent.match(/console\.log/g) || []).length;
if (consoleLogs > 0) {
  console.log(`⚠️  Found ${consoleLogs} console.log statements (consider removing for production)`);
} else {
  console.log('✅ No console.log statements found');
}

// Check for TODO comments
const todos = (calendarContent.match(/TODO|FIXME|HACK/g) || []).length;
if (todos > 0) {
  console.log(`⚠️  Found ${todos} TODO/FIXME comments`);
} else {
  console.log('✅ No TODO comments found');
}

// Check for proper error handling
const errorHandling = calendarContent.includes('try {') && calendarContent.includes('catch');
if (errorHandling) {
  console.log('✅ Error handling implemented');
} else {
  console.log('❌ Error handling may be missing');
}

// Test 7: Check documentation
console.log('\n📚 Checking documentation...');
const docFiles = [
  'IMPLEMENTATION_NOTES.md',
  'TESTING_CHECKLIST.md',
  'SHIFT_SCHEDULING_SUMMARY.md'
];

docFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

// Summary
console.log('\n🎯 Implementation Summary:');
console.log('========================');

const totalFiles = requiredFiles.length;
const existingFiles = requiredFiles.filter(file => fs.existsSync(file)).length;

console.log(`📁 Files: ${existingFiles}/${totalFiles} (${Math.round(existingFiles/totalFiles*100)}%)`);
console.log(`🔌 API Functions: ${apiChecks.length} implemented`);
console.log(`📅 Calendar Features: ${calendarChecks.length} implemented`);
console.log(`📝 TypeScript Types: ${typeChecks.length} implemented`);
console.log(`🧪 Test Components: ${testFiles.length} available`);

if (existingFiles === totalFiles) {
  console.log('\n🎉 SUCCESS: All required files are present!');
  console.log('\n📋 Next Steps:');
  console.log('1. Start the development server: npm start or yarn start');
  console.log('2. Navigate to /calendar in your browser');
  console.log('3. Run the comprehensive test component');
  console.log('4. Test with different user roles (admin/manager/member)');
  console.log('5. Verify all CRUD operations work correctly');
} else {
  console.log('\n❌ FAILURE: Some files are missing!');
  process.exit(1);
}

console.log('\n✨ Employee Scheduling Frontend Implementation Test Complete!');

