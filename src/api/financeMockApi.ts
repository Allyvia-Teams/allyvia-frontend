// src/api/financeMockApi.ts
/**
 * Finance Mock API - Comprehensive Mock Data for Finance Module
 *
 * 📅 DATA COVERAGE: January 1, 2024 to September 30, 2024 (9 months)
 *
 * 📊 COMPREHENSIVE DATA STRUCTURE:
 * - 61 Invoices: Diverse types (service, consulting, AI, blockchain, IoT, VR/AR, gaming, fintech, healthcare, etc.)
 * - 61 Expenses: Multiple categories (Technology, Office Supplies, Marketing, Travel, Insurance, etc.)
 * - 54 Payments: Matching completed invoices with various payment methods
 * - 5 Account Types: Assets, Liabilities, Equity with realistic balances
 *
 * 🎯 INVOICE TYPES COVERED:
 * - Traditional: service, consulting, design, legal, software
 * - Emerging Tech: AI, blockchain, IoT, VR/AR, gaming
 * - Industry-Specific: fintech, healthcare, education, logistics, retail, manufacturing
 * - Infrastructure: cloud migration, data centers, microservices, DevOps
 * - Modern Development: mobile, web, desktop, cross-platform, PWA, hybrid apps
 *
 * 💰 REALISTIC AMOUNTS:
 * - Small: $15,000 - $35,000 (basic services)
 * - Medium: $45,000 - $75,000 (specialized development)
 * - Large: $85,000 - $158,000 (complex platforms, enterprise solutions)
 *
 * 📈 QUARTERLY GROWTH PATTERN:
 * - Q1 (Jan-Mar): Foundation services, basic development
 * - Q2 (Apr-Jun): Emerging technologies, industry solutions
 * - Q3 (Jul-Sep): Advanced infrastructure, modern development tools
 *
 * 🔄 STATUS DISTRIBUTION:
 * - Paid: January-August invoices (54 invoices)
 * - Pending: September invoices (7 invoices) - current month
 * - Overdue: None in this dataset (all historical data is paid)
 *
 * This provides a solid foundation for testing all finance module features
 * with realistic, varied data across different time periods and business types.
 */
// Centralized mock data with consistent structure for all finance components

import {
  calculateInvoiceSummary,
  calculateExpenseSummary,
  calculatePaymentSummary,
  calculateAccountSummary,
  calculateProfitAndLossSummary,
  calculateBalanceSheet,
  calculateCashFlow,
  calculateAging,
  calculateLedger,
  calculateKPIs,
  calculateSeries,
  calculateInvoiceTrends,
  calculateExpenseTrends,
  calculatePaymentTrends,
  calculateAccountTrends
} from '../utils/financeCalculations';

// ============================================================================
// CENTRALIZED FINANCE DATABASE
// ============================================================================

const centralizedFinanceData = {
  // Core data for calculations
  invoices: [
    // January 2024 - Q1 Start
    {
      id: 'INV-001',
      customer: 'Tech Solutions Inc',
      amount: 25000,
      status: 'paid',
      issue_date: '2024-01-05',
      due_date: '2024-02-04',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'service'
    },
    {
      id: 'INV-002',
      customer: 'Marketing Pro LLC',
      amount: 18000,
      status: 'paid',
      issue_date: '2024-01-10',
      due_date: '2024-02-09',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'service'
    },
    {
      id: 'INV-003',
      customer: 'Consulting Corp',
      amount: 32000,
      status: 'paid',
      issue_date: '2024-01-15',
      due_date: '2024-02-14',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'consulting'
    },
    {
      id: 'INV-004',
      customer: 'Design Studio',
      amount: 15000,
      status: 'paid',
      issue_date: '2024-01-20',
      due_date: '2024-02-19',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'design'
    },
    {
      id: 'INV-005',
      customer: 'Legal Services',
      amount: 28000,
      status: 'paid',
      issue_date: '2024-01-25',
      due_date: '2024-02-24',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'legal'
    },
    {
      id: 'INV-006',
      customer: 'Software Corp',
      amount: 45000,
      status: 'paid',
      issue_date: '2024-01-30',
      due_date: '2024-02-29',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'software'
    },

    // February 2024 - Q1 Growth
    {
      id: 'INV-007',
      customer: 'Cloud Services',
      amount: 22000,
      status: 'paid',
      issue_date: '2024-02-01',
      due_date: '2024-03-02',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'service'
    },
    {
      id: 'INV-008',
      customer: 'Data Analytics Co',
      amount: 38000,
      status: 'paid',
      issue_date: '2024-02-05',
      due_date: '2024-03-06',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'analytics'
    },
    {
      id: 'INV-009',
      customer: 'Web Development',
      amount: 52000,
      status: 'paid',
      issue_date: '2024-02-10',
      due_date: '2024-03-11',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'development'
    },
    {
      id: 'INV-010',
      customer: 'Mobile Apps Inc',
      amount: 35000,
      status: 'paid',
      issue_date: '2024-02-15',
      due_date: '2024-03-16',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'mobile'
    },
    {
      id: 'INV-011',
      customer: 'AI Solutions',
      amount: 68000,
      status: 'paid',
      issue_date: '2024-02-20',
      due_date: '2024-03-21',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'ai'
    },
    {
      id: 'INV-012',
      customer: 'Cybersecurity Corp',
      amount: 42000,
      status: 'paid',
      issue_date: '2024-02-25',
      due_date: '2024-03-26',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'security'
    },

    // March 2024 - Q1 End
    {
      id: 'INV-013',
      customer: 'E-commerce Platform',
      amount: 75000,
      status: 'paid',
      issue_date: '2024-03-01',
      due_date: '2024-04-01',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'platform'
    },
    {
      id: 'INV-014',
      customer: 'Digital Marketing',
      amount: 28000,
      status: 'paid',
      issue_date: '2024-03-05',
      due_date: '2024-04-04',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'marketing'
    },
    {
      id: 'INV-015',
      customer: 'IT Consulting',
      amount: 45000,
      status: 'paid',
      issue_date: '2024-03-10',
      due_date: '2024-04-09',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'consulting'
    },
    {
      id: 'INV-016',
      customer: 'Cloud Migration',
      amount: 95000,
      status: 'paid',
      issue_date: '2024-03-15',
      due_date: '2024-04-14',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'migration'
    },
    {
      id: 'INV-017',
      customer: 'Data Center',
      amount: 120000,
      status: 'paid',
      issue_date: '2024-03-20',
      due_date: '2024-04-19',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'infrastructure'
    },
    {
      id: 'INV-018',
      customer: 'SaaS Platform',
      amount: 85000,
      status: 'paid',
      issue_date: '2024-03-25',
      due_date: '2024-04-24',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'saas'
    },
    {
      id: 'INV-019',
      customer: 'API Integration',
      amount: 32000,
      status: 'paid',
      issue_date: '2024-03-30',
      due_date: '2024-04-29',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'integration'
    },

    // April 2024 - Q2 Start
    {
      id: 'INV-020',
      customer: 'Machine Learning',
      amount: 88000,
      status: 'paid',
      issue_date: '2024-04-01',
      due_date: '2024-05-01',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'ml'
    },
    {
      id: 'INV-021',
      customer: 'Blockchain Dev',
      amount: 65000,
      status: 'paid',
      issue_date: '2024-04-05',
      due_date: '2024-05-05',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'blockchain'
    },
    {
      id: 'INV-022',
      customer: 'IoT Solutions',
      amount: 72000,
      status: 'paid',
      issue_date: '2024-04-10',
      due_date: '2024-05-10',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'iot'
    },
    {
      id: 'INV-023',
      customer: 'VR Development',
      amount: 55000,
      status: 'paid',
      issue_date: '2024-04-15',
      due_date: '2024-05-15',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'vr'
    },
    {
      id: 'INV-024',
      customer: 'AR Applications',
      amount: 48000,
      status: 'paid',
      issue_date: '2024-04-20',
      due_date: '2024-05-20',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'ar'
    },
    {
      id: 'INV-025',
      customer: 'Game Development',
      amount: 92000,
      status: 'paid',
      issue_date: '2024-04-25',
      due_date: '2024-05-25',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'gaming'
    },
    {
      id: 'INV-026',
      customer: 'Mobile Gaming',
      amount: 68000,
      status: 'paid',
      issue_date: '2024-04-30',
      due_date: '2024-05-30',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'mobile_gaming'
    },

    // May 2024 - Q2 Growth
    {
      id: 'INV-027',
      customer: 'Fintech Solutions',
      amount: 115000,
      status: 'paid',
      issue_date: '2024-05-01',
      due_date: '2024-06-01',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'fintech'
    },
    {
      id: 'INV-028',
      customer: 'Healthcare IT',
      amount: 98000,
      status: 'paid',
      issue_date: '2024-05-05',
      due_date: '2024-06-05',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'healthcare'
    },
    {
      id: 'INV-029',
      customer: 'EdTech Platform',
      amount: 75000,
      status: 'paid',
      issue_date: '2024-05-10',
      due_date: '2024-06-10',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'education'
    },
    {
      id: 'INV-030',
      customer: 'Logistics Software',
      amount: 82000,
      status: 'paid',
      issue_date: '2024-05-15',
      due_date: '2024-06-15',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'logistics'
    },
    {
      id: 'INV-031',
      customer: 'Retail Solutions',
      amount: 68000,
      status: 'paid',
      issue_date: '2024-05-20',
      due_date: '2024-06-20',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'retail'
    },
    {
      id: 'INV-032',
      customer: 'Manufacturing IT',
      amount: 95000,
      status: 'paid',
      issue_date: '2024-05-25',
      due_date: '2024-06-25',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'manufacturing'
    },
    {
      id: 'INV-033',
      customer: 'Energy Management',
      amount: 78000,
      status: 'paid',
      issue_date: '2024-05-30',
      due_date: '2024-06-30',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'energy'
    },

    // June 2024 - Q2 End
    {
      id: 'INV-034',
      customer: 'Smart Cities',
      amount: 125000,
      status: 'paid',
      issue_date: '2024-06-01',
      due_date: '2024-07-01',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'smart_cities'
    },
    {
      id: 'INV-035',
      customer: 'Digital Twins',
      amount: 88000,
      status: 'paid',
      issue_date: '2024-06-05',
      due_date: '2024-07-05',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'digital_twins'
    },
    {
      id: 'INV-036',
      customer: 'Predictive Analytics',
      amount: 72000,
      status: 'paid',
      issue_date: '2024-06-10',
      due_date: '2024-07-10',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'analytics'
    },
    {
      id: 'INV-037',
      customer: 'Data Visualization',
      amount: 55000,
      status: 'paid',
      issue_date: '2024-06-15',
      due_date: '2024-07-15',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'visualization'
    },
    {
      id: 'INV-038',
      customer: 'Business Intelligence',
      amount: 68000,
      status: 'paid',
      issue_date: '2024-06-20',
      due_date: '2024-07-20',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'bi'
    },
    {
      id: 'INV-039',
      customer: 'Data Warehousing',
      amount: 92000,
      status: 'paid',
      issue_date: '2024-06-25',
      due_date: '2024-07-25',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'warehousing'
    },
    {
      id: 'INV-040',
      customer: 'ETL Pipeline',
      amount: 75000,
      status: 'paid',
      issue_date: '2024-06-30',
      due_date: '2024-07-30',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'etl'
    },

    // July 2024 - Q3 Start
    {
      id: 'INV-041',
      customer: 'Microservices',
      amount: 98000,
      status: 'paid',
      issue_date: '2024-07-01',
      due_date: '2024-08-01',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'microservices'
    },
    {
      id: 'INV-042',
      customer: 'Container Orchestration',
      amount: 82000,
      status: 'paid',
      issue_date: '2024-07-05',
      due_date: '2024-08-05',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'containers'
    },
    {
      id: 'INV-043',
      customer: 'Serverless Architecture',
      amount: 68000,
      status: 'paid',
      issue_date: '2024-07-10',
      due_date: '2024-08-10',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'serverless'
    },
    {
      id: 'INV-044',
      customer: 'API Gateway',
      amount: 55000,
      status: 'paid',
      issue_date: '2024-07-15',
      due_date: '2024-08-15',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'api_gateway'
    },
    {
      id: 'INV-045',
      customer: 'Load Balancing',
      amount: 72000,
      status: 'paid',
      issue_date: '2024-07-20',
      due_date: '2024-08-20',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'infrastructure'
    },
    {
      id: 'INV-046',
      customer: 'Auto Scaling',
      amount: 88000,
      status: 'paid',
      issue_date: '2024-07-25',
      due_date: '2024-08-25',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'scaling'
    },
    {
      id: 'INV-047',
      customer: 'Monitoring & Alerting',
      amount: 65000,
      status: 'paid',
      issue_date: '2024-07-30',
      due_date: '2024-08-30',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'monitoring'
    },

    // August 2024 - Q3 Growth
    {
      id: 'INV-048',
      customer: 'DevOps Automation',
      amount: 95000,
      status: 'paid',
      issue_date: '2024-08-01',
      due_date: '2024-09-01',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'devops'
    },
    {
      id: 'INV-049',
      customer: 'CI/CD Pipeline',
      amount: 78000,
      status: 'paid',
      issue_date: '2024-08-05',
      due_date: '2024-09-05',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'cicd'
    },
    {
      id: 'INV-050',
      customer: 'Infrastructure as Code',
      amount: 82000,
      status: 'paid',
      issue_date: '2024-08-10',
      due_date: '2024-09-10',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'iac'
    },
    {
      id: 'INV-051',
      customer: 'Security Testing',
      amount: 68000,
      status: 'paid',
      issue_date: '2024-08-15',
      due_date: '2024-09-15',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'security'
    },
    {
      id: 'INV-052',
      customer: 'Performance Testing',
      amount: 55000,
      status: 'paid',
      issue_date: '2024-08-20',
      due_date: '2024-09-20',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'testing'
    },
    {
      id: 'INV-053',
      customer: 'Quality Assurance',
      amount: 72000,
      status: 'paid',
      issue_date: '2024-08-25',
      due_date: '2024-09-25',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'qa'
    },
    {
      id: 'INV-054',
      customer: 'User Experience Design',
      amount: 88000,
      status: 'paid',
      issue_date: '2024-08-30',
      due_date: '2024-09-30',
      balance: 0,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'ux'
    },

    // September 2024 - Q3 End (Current Month)
    {
      id: 'INV-055',
      customer: 'Mobile App Store',
      amount: 115000,
      status: 'pending',
      issue_date: '2024-09-01',
      due_date: '2024-10-01',
      balance: 115000,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'mobile'
    },
    {
      id: 'INV-056',
      customer: 'Web App Store',
      amount: 98000,
      status: 'pending',
      issue_date: '2024-09-05',
      due_date: '2024-10-05',
      balance: 98000,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'web'
    },
    {
      id: 'INV-057',
      customer: 'Desktop Application',
      amount: 125000,
      status: 'pending',
      issue_date: '2024-09-10',
      due_date: '2024-10-10',
      balance: 125000,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'desktop'
    },
    {
      id: 'INV-058',
      customer: 'Cross-Platform App',
      amount: 158000,
      status: 'pending',
      issue_date: '2024-09-15',
      due_date: '2024-10-15',
      balance: 158000,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'cross_platform'
    },
    {
      id: 'INV-059',
      customer: 'Progressive Web App',
      amount: 82000,
      status: 'pending',
      issue_date: '2024-09-20',
      due_date: '2024-10-20',
      balance: 82000,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'pwa'
    },
    {
      id: 'INV-060',
      customer: 'Hybrid Mobile App',
      amount: 95000,
      status: 'pending',
      issue_date: '2024-09-25',
      due_date: '2024-10-25',
      balance: 95000,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'hybrid'
    },
    {
      id: 'INV-061',
      customer: 'Native iOS App',
      amount: 108000,
      status: 'pending',
      issue_date: '2024-09-30',
      due_date: '2024-10-30',
      balance: 108000,
      days_past_due: 0,
      company_id: 'comp-001',
      company_name: 'ABC Corp',
      invoice_type: 'ios'
    }
  ],

  expenses: [
    // January 2024 - Q1 Start
    {
      id: 'EXP-001',
      vendor: 'Office Supplies Co',
      category: 'Office Supplies',
      amount: 500,
      date: '2024-01-05',
      description: 'Office supplies',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-002',
      vendor: 'Marketing Agency',
      category: 'Marketing',
      amount: 2500,
      date: '2024-01-10',
      description: 'Digital marketing campaign',
      payment_method: 'Bank Transfer',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-003',
      vendor: 'Software License',
      category: 'Technology',
      amount: 1200,
      date: '2024-01-15',
      description: 'Annual software subscription',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-004',
      vendor: 'Travel Agency',
      category: 'Travel',
      amount: 800,
      date: '2024-01-20',
      description: 'Business travel expenses',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-005',
      vendor: 'Insurance Co',
      category: 'Insurance',
      amount: 1500,
      date: '2024-01-25',
      description: 'Business insurance premium',
      payment_method: 'Bank Transfer',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-006',
      vendor: 'Utilities Co',
      category: 'Utilities',
      amount: 300,
      date: '2024-01-30',
      description: 'Monthly utilities',
      payment_method: 'Bank Transfer',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },

    // February 2024 - Q1 Growth
    {
      id: 'EXP-007',
      vendor: 'Maintenance Co',
      category: 'Maintenance',
      amount: 750,
      date: '2024-02-01',
      description: 'Equipment maintenance',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-008',
      vendor: 'Cloud Services',
      category: 'Technology',
      amount: 1800,
      date: '2024-02-05',
      description: 'Cloud infrastructure',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-009',
      vendor: 'Training Institute',
      category: 'Training',
      amount: 3200,
      date: '2024-02-10',
      description: 'Employee training programs',
      payment_method: 'Bank Transfer',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-010',
      vendor: 'Legal Services',
      category: 'Legal',
      amount: 2800,
      date: '2024-02-15',
      description: 'Legal consultation',
      payment_method: 'Bank Transfer',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-011',
      vendor: 'Accounting Firm',
      category: 'Professional Services',
      amount: 1500,
      date: '2024-02-20',
      description: 'Accounting services',
      payment_method: 'Bank Transfer',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-012',
      vendor: 'Internet Provider',
      category: 'Utilities',
      amount: 450,
      date: '2024-02-25',
      description: 'Internet services',
      payment_method: 'Bank Transfer',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },

    // March 2024 - Q1 End
    {
      id: 'EXP-013',
      vendor: 'Phone Services',
      category: 'Utilities',
      amount: 380,
      date: '2024-03-01',
      description: 'Phone services',
      payment_method: 'Bank Transfer',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-014',
      vendor: 'Security Services',
      category: 'Security',
      amount: 2200,
      date: '2024-03-05',
      description: 'Security system maintenance',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-015',
      vendor: 'Cleaning Services',
      category: 'Facilities',
      amount: 1200,
      date: '2024-03-10',
      description: 'Office cleaning services',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-016',
      vendor: 'Printing Services',
      category: 'Office Supplies',
      amount: 650,
      date: '2024-03-15',
      description: 'Printing and copying',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-017',
      vendor: 'Conference Services',
      category: 'Travel',
      amount: 1800,
      date: '2024-03-20',
      description: 'Conference attendance',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-018',
      vendor: 'Equipment Rental',
      category: 'Equipment',
      amount: 950,
      date: '2024-03-25',
      description: 'Equipment rental',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-019',
      vendor: 'Subscriptions',
      category: 'Technology',
      amount: 2800,
      date: '2024-03-30',
      description: 'Various software subscriptions',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },

    // April 2024 - Q2 Start
    {
      id: 'EXP-020',
      vendor: 'Data Analytics Tools',
      category: 'Technology',
      amount: 3500,
      date: '2024-04-01',
      description: 'Analytics platform subscription',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-021',
      vendor: 'AI Platform',
      category: 'Technology',
      amount: 4200,
      date: '2024-04-05',
      description: 'AI development platform',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-022',
      vendor: 'Blockchain Tools',
      category: 'Technology',
      amount: 2800,
      date: '2024-04-10',
      description: 'Blockchain development tools',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-023',
      vendor: 'IoT Platform',
      category: 'Technology',
      amount: 3200,
      date: '2024-04-15',
      description: 'IoT development platform',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-024',
      vendor: 'VR Development Kit',
      category: 'Technology',
      amount: 4500,
      date: '2024-04-20',
      description: 'VR development equipment',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-025',
      vendor: 'AR Development Kit',
      category: 'Technology',
      amount: 3800,
      date: '2024-04-25',
      description: 'AR development equipment',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-026',
      vendor: 'Game Engine License',
      category: 'Technology',
      amount: 5200,
      date: '2024-04-30',
      description: 'Game development engine',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },

    // May 2024 - Q2 Growth
    {
      id: 'EXP-027',
      vendor: 'Fintech Compliance',
      category: 'Compliance',
      amount: 6800,
      date: '2024-05-01',
      description: 'Financial compliance services',
      payment_method: 'Bank Transfer',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-028',
      vendor: 'Healthcare Certification',
      category: 'Certification',
      amount: 4500,
      date: '2024-05-05',
      description: 'Healthcare IT certification',
      payment_method: 'Bank Transfer',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-029',
      vendor: 'Educational Content',
      category: 'Content',
      amount: 3200,
      date: '2024-05-10',
      description: 'Educational content creation',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-030',
      vendor: 'Logistics Software',
      category: 'Technology',
      amount: 2800,
      date: '2024-05-15',
      description: 'Logistics management software',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-031',
      vendor: 'Retail POS System',
      category: 'Technology',
      amount: 3500,
      date: '2024-05-20',
      description: 'Point of sale system',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-032',
      vendor: 'Manufacturing Software',
      category: 'Technology',
      amount: 4200,
      date: '2024-05-25',
      description: 'Manufacturing management software',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-033',
      vendor: 'Energy Management Tools',
      category: 'Technology',
      amount: 3800,
      date: '2024-05-30',
      description: 'Energy monitoring tools',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },

    // June 2024 - Q2 End
    {
      id: 'EXP-034',
      vendor: 'Smart City Platform',
      category: 'Technology',
      amount: 5800,
      date: '2024-06-01',
      description: 'Smart city development platform',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-035',
      vendor: 'Digital Twin Software',
      category: 'Technology',
      amount: 4200,
      date: '2024-06-05',
      description: 'Digital twin development software',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-036',
      vendor: 'Predictive Analytics',
      category: 'Technology',
      amount: 3500,
      date: '2024-06-10',
      description: 'Predictive analytics tools',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-037',
      vendor: 'Data Visualization Tools',
      category: 'Technology',
      amount: 2800,
      date: '2024-06-15',
      description: 'Data visualization software',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-038',
      vendor: 'Business Intelligence',
      category: 'Technology',
      amount: 3800,
      date: '2024-06-20',
      description: 'BI platform subscription',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-039',
      vendor: 'Data Warehouse',
      category: 'Technology',
      amount: 5200,
      date: '2024-06-25',
      description: 'Data warehouse services',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-040',
      vendor: 'ETL Tools',
      category: 'Technology',
      amount: 3200,
      date: '2024-06-30',
      description: 'ETL processing tools',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },

    // July 2024 - Q3 Start
    {
      id: 'EXP-041',
      vendor: 'Microservices Platform',
      category: 'Technology',
      amount: 4800,
      date: '2024-07-01',
      description: 'Microservices development platform',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-042',
      vendor: 'Container Platform',
      category: 'Technology',
      amount: 3800,
      date: '2024-07-05',
      description: 'Container orchestration platform',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-043',
      vendor: 'Serverless Platform',
      category: 'Technology',
      amount: 3200,
      date: '2024-07-10',
      description: 'Serverless development platform',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-044',
      vendor: 'API Management',
      category: 'Technology',
      amount: 2800,
      date: '2024-07-15',
      description: 'API management platform',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-045',
      vendor: 'Load Balancer',
      category: 'Technology',
      amount: 3500,
      date: '2024-07-20',
      description: 'Load balancing services',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-046',
      vendor: 'Auto Scaling Tools',
      category: 'Technology',
      amount: 4200,
      date: '2024-07-25',
      description: 'Auto-scaling platform',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-047',
      vendor: 'Monitoring Tools',
      category: 'Technology',
      amount: 3800,
      date: '2024-07-30',
      description: 'Application monitoring tools',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },

    // August 2024 - Q3 Growth
    {
      id: 'EXP-048',
      vendor: 'DevOps Tools',
      category: 'Technology',
      amount: 5200,
      date: '2024-08-01',
      description: 'DevOps automation tools',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-049',
      vendor: 'CI/CD Platform',
      category: 'Technology',
      amount: 3800,
      date: '2024-08-05',
      description: 'CI/CD pipeline platform',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-050',
      vendor: 'Infrastructure Tools',
      category: 'Technology',
      amount: 4200,
      date: '2024-08-10',
      description: 'Infrastructure as code tools',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-051',
      vendor: 'Security Testing Tools',
      category: 'Technology',
      amount: 3500,
      date: '2024-08-15',
      description: 'Security testing platform',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-052',
      vendor: 'Performance Testing',
      category: 'Technology',
      amount: 2800,
      date: '2024-08-20',
      description: 'Performance testing tools',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-053',
      vendor: 'QA Platform',
      category: 'Technology',
      amount: 3200,
      date: '2024-08-25',
      description: 'Quality assurance platform',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-054',
      vendor: 'UX Design Tools',
      category: 'Technology',
      amount: 3800,
      date: '2024-08-30',
      description: 'User experience design tools',
      payment_method: 'Credit Card',
      status: 'paid',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },

    // September 2024 - Q3 End (Current Month)
    {
      id: 'EXP-055',
      vendor: 'Mobile Development Kit',
      category: 'Technology',
      amount: 4500,
      date: '2024-09-01',
      description: 'Mobile app development kit',
      payment_method: 'Credit Card',
      status: 'pending',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-056',
      vendor: 'Web Development Tools',
      category: 'Technology',
      amount: 3200,
      date: '2024-09-05',
      description: 'Web development tools',
      payment_method: 'Credit Card',
      status: 'pending',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-057',
      vendor: 'Desktop Development',
      category: 'Technology',
      amount: 3800,
      date: '2024-09-10',
      description: 'Desktop application tools',
      payment_method: 'Credit Card',
      status: 'pending',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-058',
      vendor: 'Cross-Platform Tools',
      category: 'Technology',
      amount: 5200,
      date: '2024-09-15',
      description: 'Cross-platform development tools',
      payment_method: 'Credit Card',
      status: 'pending',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-059',
      vendor: 'PWA Development Kit',
      category: 'Technology',
      amount: 2800,
      date: '2024-09-20',
      description: 'Progressive web app tools',
      payment_method: 'Credit Card',
      status: 'pending',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-060',
      vendor: 'Hybrid App Tools',
      category: 'Technology',
      amount: 3500,
      date: '2024-09-25',
      description: 'Hybrid mobile app tools',
      payment_method: 'Credit Card',
      status: 'pending',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'EXP-061',
      vendor: 'iOS Development Kit',
      category: 'Technology',
      amount: 4200,
      date: '2024-09-30',
      description: 'iOS development tools',
      payment_method: 'Credit Card',
      status: 'pending',
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    }
  ],

  payments: [
    // January 2024 Payments
    {
      id: 'PAY-001',
      customer_name: 'Tech Solutions Inc',
      payment_date: '2024-01-20',
      amount: '25000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-001'],
      status: 'completed'
    },
    {
      id: 'PAY-002',
      customer_name: 'Marketing Pro LLC',
      payment_date: '2024-01-25',
      amount: '18000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-002'],
      status: 'completed'
    },
    {
      id: 'PAY-003',
      customer_name: 'Consulting Corp',
      payment_date: '2024-01-30',
      amount: '32000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-003'],
      status: 'completed'
    },
    {
      id: 'PAY-004',
      customer_name: 'Design Studio',
      payment_date: '2024-02-05',
      amount: '15000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-004'],
      status: 'completed'
    },
    {
      id: 'PAY-005',
      customer_name: 'Legal Services',
      payment_date: '2024-02-10',
      amount: '28000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-005'],
      status: 'completed'
    },
    {
      id: 'PAY-006',
      customer_name: 'Software Corp',
      payment_date: '2024-02-15',
      amount: '45000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-006'],
      status: 'completed'
    },

    // February 2024 Payments
    {
      id: 'PAY-007',
      customer_name: 'Cloud Services',
      payment_date: '2024-02-20',
      amount: '22000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-007'],
      status: 'completed'
    },
    {
      id: 'PAY-008',
      customer_name: 'Data Analytics Co',
      payment_date: '2024-02-25',
      amount: '38000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-008'],
      status: 'completed'
    },
    {
      id: 'PAY-009',
      customer_name: 'Web Development',
      payment_date: '2024-03-01',
      amount: '52000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-009'],
      status: 'completed'
    },
    {
      id: 'PAY-010',
      customer_name: 'Mobile Apps Inc',
      payment_date: '2024-03-05',
      amount: '35000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-010'],
      status: 'completed'
    },
    {
      id: 'PAY-011',
      customer_name: 'AI Solutions',
      payment_date: '2024-03-10',
      amount: '68000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-011'],
      status: 'completed'
    },
    {
      id: 'PAY-012',
      customer_name: 'Cybersecurity Corp',
      payment_date: '2024-03-15',
      amount: '42000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-012'],
      status: 'completed'
    },

    // March 2024 Payments
    {
      id: 'PAY-013',
      customer_name: 'E-commerce Platform',
      payment_date: '2024-03-20',
      amount: '75000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-013'],
      status: 'completed'
    },
    {
      id: 'PAY-014',
      customer_name: 'Digital Marketing',
      payment_date: '2024-03-25',
      amount: '28000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-014'],
      status: 'completed'
    },
    {
      id: 'PAY-015',
      customer_name: 'IT Consulting',
      payment_date: '2024-03-30',
      amount: '45000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-015'],
      status: 'completed'
    },
    {
      id: 'PAY-016',
      customer_name: 'Cloud Migration',
      payment_date: '2024-04-01',
      amount: '95000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-016'],
      status: 'completed'
    },
    {
      id: 'PAY-017',
      customer_name: 'Data Center',
      payment_date: '2024-04-05',
      amount: '120000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-017'],
      status: 'completed'
    },
    {
      id: 'PAY-018',
      customer_name: 'SaaS Platform',
      payment_date: '2024-04-10',
      amount: '85000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-018'],
      status: 'completed'
    },
    {
      id: 'PAY-019',
      customer_name: 'API Integration',
      payment_date: '2024-04-15',
      amount: '32000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-019'],
      status: 'completed'
    },

    // April 2024 Payments
    {
      id: 'PAY-020',
      customer_name: 'Machine Learning',
      payment_date: '2024-04-20',
      amount: '88000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-020'],
      status: 'completed'
    },
    {
      id: 'PAY-021',
      customer_name: 'Blockchain Dev',
      payment_date: '2024-04-25',
      amount: '65000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-021'],
      status: 'completed'
    },
    {
      id: 'PAY-022',
      customer_name: 'IoT Solutions',
      payment_date: '2024-04-30',
      amount: '72000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-022'],
      status: 'completed'
    },
    {
      id: 'PAY-023',
      customer_name: 'VR Development',
      payment_date: '2024-05-01',
      amount: '55000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-023'],
      status: 'completed'
    },
    {
      id: 'PAY-024',
      customer_name: 'AR Applications',
      payment_date: '2024-05-05',
      amount: '48000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-024'],
      status: 'completed'
    },
    {
      id: 'PAY-025',
      customer_name: 'Game Development',
      payment_date: '2024-05-10',
      amount: '92000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-025'],
      status: 'completed'
    },
    {
      id: 'PAY-026',
      customer_name: 'Mobile Gaming',
      payment_date: '2024-05-15',
      amount: '68000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-026'],
      status: 'completed'
    },

    // May 2024 Payments
    {
      id: 'PAY-027',
      customer_name: 'Fintech Solutions',
      payment_date: '2024-05-20',
      amount: '115000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-027'],
      status: 'completed'
    },
    {
      id: 'PAY-028',
      customer_name: 'Healthcare IT',
      payment_date: '2024-05-25',
      amount: '98000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-028'],
      status: 'completed'
    },
    {
      id: 'PAY-029',
      customer_name: 'EdTech Platform',
      payment_date: '2024-05-30',
      amount: '75000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-029'],
      status: 'completed'
    },
    {
      id: 'PAY-030',
      customer_name: 'Logistics Software',
      payment_date: '2024-06-01',
      amount: '82000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-030'],
      status: 'completed'
    },
    {
      id: 'PAY-031',
      customer_name: 'Retail Solutions',
      payment_date: '2024-06-05',
      amount: '68000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-031'],
      status: 'completed'
    },
    {
      id: 'PAY-032',
      customer_name: 'Manufacturing IT',
      payment_date: '2024-06-10',
      amount: '95000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-032'],
      status: 'completed'
    },
    {
      id: 'PAY-033',
      customer_name: 'Energy Management',
      payment_date: '2024-06-15',
      amount: '78000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-033'],
      status: 'completed'
    },

    // June 2024 Payments
    {
      id: 'PAY-034',
      customer_name: 'Smart Cities',
      payment_date: '2024-06-20',
      amount: '125000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-034'],
      status: 'completed'
    },
    {
      id: 'PAY-035',
      customer_name: 'Digital Twins',
      payment_date: '2024-06-25',
      amount: '88000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-035'],
      status: 'completed'
    },
    {
      id: 'PAY-036',
      customer_name: 'Predictive Analytics',
      payment_date: '2024-06-30',
      amount: '72000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-036'],
      status: 'completed'
    },
    {
      id: 'PAY-037',
      customer_name: 'Data Visualization',
      payment_date: '2024-07-01',
      amount: '55000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-037'],
      status: 'completed'
    },
    {
      id: 'PAY-038',
      customer_name: 'Business Intelligence',
      payment_date: '2024-07-05',
      amount: '68000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-038'],
      status: 'completed'
    },
    {
      id: 'PAY-039',
      customer_name: 'Data Warehousing',
      payment_date: '2024-07-10',
      amount: '92000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-039'],
      status: 'completed'
    },
    {
      id: 'PAY-040',
      customer_name: 'ETL Pipeline',
      payment_date: '2024-07-15',
      amount: '75000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-040'],
      status: 'completed'
    },

    // July 2024 Payments
    {
      id: 'PAY-041',
      customer_name: 'Microservices',
      payment_date: '2024-07-20',
      amount: '98000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-041'],
      status: 'completed'
    },
    {
      id: 'PAY-042',
      customer_name: 'Container Orchestration',
      payment_date: '2024-07-25',
      amount: '82000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-042'],
      status: 'completed'
    },
    {
      id: 'PAY-043',
      customer_name: 'Serverless Architecture',
      payment_date: '2024-07-30',
      amount: '68000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-043'],
      status: 'completed'
    },
    {
      id: 'PAY-044',
      customer_name: 'API Gateway',
      payment_date: '2024-08-01',
      amount: '55000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-044'],
      status: 'completed'
    },
    {
      id: 'PAY-045',
      customer_name: 'Load Balancing',
      payment_date: '2024-08-05',
      amount: '72000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-045'],
      status: 'completed'
    },
    {
      id: 'PAY-046',
      customer_name: 'Auto Scaling',
      payment_date: '2024-08-10',
      amount: '88000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-046'],
      status: 'completed'
    },
    {
      id: 'PAY-047',
      customer_name: 'Monitoring & Alerting',
      payment_date: '2024-08-15',
      amount: '65000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-047'],
      status: 'completed'
    },

    // August 2024 Payments
    {
      id: 'PAY-048',
      customer_name: 'DevOps Automation',
      payment_date: '2024-08-20',
      amount: '95000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-048'],
      status: 'completed'
    },
    {
      id: 'PAY-049',
      customer_name: 'CI/CD Pipeline',
      payment_date: '2024-08-25',
      amount: '78000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-049'],
      status: 'completed'
    },
    {
      id: 'PAY-050',
      customer_name: 'Infrastructure as Code',
      payment_date: '2024-08-30',
      amount: '82000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-050'],
      status: 'completed'
    },
    {
      id: 'PAY-051',
      customer_name: 'Security Testing',
      payment_date: '2024-09-01',
      amount: '68000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-051'],
      status: 'completed'
    },
    {
      id: 'PAY-052',
      customer_name: 'Performance Testing',
      payment_date: '2024-09-05',
      amount: '55000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-052'],
      status: 'completed'
    },
    {
      id: 'PAY-053',
      customer_name: 'Quality Assurance',
      payment_date: '2024-09-10',
      amount: '72000',
      payment_method: 'Credit Card',
      applied_to_invoices: ['INV-053'],
      status: 'completed'
    },
    {
      id: 'PAY-054',
      customer_name: 'User Experience Design',
      payment_date: '2024-09-15',
      amount: '88000',
      payment_method: 'Bank Transfer',
      applied_to_invoices: ['INV-054'],
      status: 'completed'
    }

    // Note: September invoices (INV-055 to INV-061) are pending, so no payments yet
  ],

  accounts: [
    {
      id: 'acc-001',
      name: 'Cash & Cash Equivalents',
      account_code: '1000',
      account_type: 'bank',
      category: 'assets',
      balance: 2142500,
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'acc-002',
      name: 'Accounts Receivable',
      account_code: '1100',
      account_type: 'accounts_receivable',
      category: 'assets',
      balance: 821250,
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'acc-003',
      name: 'Accounts Payable',
      account_code: '2000',
      account_type: 'accounts_payable',
      category: 'liabilities',
      balance: -657000,
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'acc-004',
      name: 'Equipment',
      account_code: '1500',
      account_type: 'fixed_assets',
      category: 'assets',
      balance: 500000,
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    },
    {
      id: 'acc-005',
      name: 'Retained Earnings',
      account_code: '3000',
      account_type: 'equity',
      category: 'equity',
      balance: 1500000,
      company_id: 'comp-001',
      company_name: 'ABC Corp'
    }
  ]
};

// Use centralized data
const financeData = centralizedFinanceData;

// Show available date ranges in the data
const availableDates = {
  invoices: financeData.invoices.map((inv) => inv.issue_date).sort(),
  expenses: financeData.expenses.map((exp) => exp.date).sort(),
  payments: financeData.payments.map((pay) => pay.payment_date).sort()
};

// Helper function to check if date range has data
function hasDataForDateRange(startDate?: string, endDate?: string): boolean {
  if (!startDate || !endDate) return true;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Check if any data falls within the range
  const hasInvoices = financeData.invoices.some((inv) => {
    const invDate = new Date(inv.issue_date);
    return invDate >= start && invDate <= end;
  });

  const hasExpenses = financeData.expenses.some((exp) => {
    const expDate = new Date(exp.date);
    return expDate >= start && expDate <= end;
  });

  const hasPayments = financeData.payments.some((pay) => {
    const payDate = new Date(pay.payment_date);
    return payDate >= start && payDate <= end;
  });

  const hasData = hasInvoices || hasExpenses || hasPayments;

  return hasData;
}

// Debug function to show what data is available for a specific date range
export function debugDateRangeData(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) {
    return {
      invoices: financeData.invoices.length,
      expenses: financeData.expenses.length,
      payments: financeData.payments.length
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const filteredInvoices = financeData.invoices.filter((inv) => {
    const invDate = new Date(inv.issue_date);
    return invDate >= start && invDate <= end;
  });

  const filteredExpenses = financeData.expenses.filter((exp) => {
    const expDate = new Date(exp.date);
    return expDate >= start && expDate <= end;
  });

  const filteredPayments = financeData.payments.filter((pay) => {
    const payDate = new Date(pay.payment_date);
    return payDate >= start && payDate <= end;
  });

  const result = {
    requestedRange: { startDate, endDate },
    availableData: {
      invoices: filteredInvoices.length,
      expenses: filteredExpenses.length,
      payments: filteredPayments.length
    },
    sampleData: {
      invoices: filteredInvoices.slice(0, 2),
      expenses: filteredExpenses.slice(0, 2),
      payments: filteredPayments.slice(0, 2)
    }
  };

  return result;
}

// ============================================================================
// DYNAMIC CALCULATION FUNCTIONS
// ============================================================================

// Safe data access with fallbacks
function getSafeData() {
  if (!financeData) {
    console.error('❌ financeData is undefined');
    return {
      invoices: [],
      expenses: [],
      payments: [],
      accounts: []
    };
  }

  return {
    invoices: financeData.invoices || [],
    expenses: financeData.expenses || [],
    payments: financeData.payments || [],
    accounts: financeData.accounts || []
  };
}

// Transform payment data to match expected structure
function transformPaymentData(payments: any[]) {
  if (!Array.isArray(payments)) {
    console.warn('⚠️ payments is not an array:', payments);
    return [];
  }

  return payments.map((payment) => ({
    ...payment,
    date: payment.payment_date,
    amount: Number(payment.amount)
  }));
}

export function mockKPIs(startDate?: string, endDate?: string) {
  // Check if we have data for the requested date range
  if (!hasDataForDateRange(startDate, endDate)) {
    console.warn('⚠️ No data available for date range:', { startDate, endDate });
    console.warn('⚠️ Available dates:', availableDates);
  }

  const safeData = getSafeData();
  const transformedPayments = transformPaymentData(safeData.payments);

  // Calculate KPIs from centralized data with date filtering
  const result = calculateKPIs(safeData.invoices, safeData.expenses, transformedPayments, startDate, endDate);
  return result;
}

export function getSeries(startDate?: string, endDate?: string) {
  const safeData = getSafeData();
  const transformedPayments = transformPaymentData(safeData.payments);

  // Calculate series from centralized data with date filtering
  const result = calculateSeries(safeData.invoices, safeData.expenses, transformedPayments, startDate, endDate);
  return result;
}

export function getExpenseCategories(startDate?: string, endDate?: string) {
  const safeData = getSafeData();

  // Calculate expense categories from centralized data with date filtering
  const summary = calculateExpenseSummary(safeData.expenses, startDate, endDate);
  const result = summary.expenses_by_category;
  return result;
}

export function getInvoiceList(startDate?: string, endDate?: string) {
  const safeData = getSafeData();

  // Apply date filtering to match getInvoiceStatistics behavior
  if (startDate && endDate) {
    const filteredInvoices = safeData.invoices.filter((inv) => {
      const invDate = new Date(inv.issue_date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return invDate >= start && invDate <= end;
    });
    return filteredInvoices;
  }

  return safeData.invoices;
}

export function getExpenseList(startDate?: string, endDate?: string) {
  const safeData = getSafeData();

  // Apply date filtering to match other functions
  if (startDate && endDate) {
    const filteredExpenses = safeData.expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return expDate >= start && expDate <= end;
    });
    return filteredExpenses;
  }

  return safeData.expenses;
}

export function getProfitAndLossSummary(startDate?: string, endDate?: string) {
  const safeData = getSafeData();

  // Calculate P&L summary from centralized data with date filtering
  const result = calculateProfitAndLossSummary(safeData.invoices, safeData.expenses, startDate, endDate);
  return result;
}

export function getPaymentSummary(startDate?: string, endDate?: string) {
  const safeData = getSafeData();
  const transformedPayments = transformPaymentData(safeData.payments);
  return calculatePaymentSummary(transformedPayments, startDate, endDate);
}

export function getPaymentTrends(startDate?: string, endDate?: string) {
  const safeData = getSafeData();
  const transformedPayments = transformPaymentData(safeData.payments);
  return calculatePaymentTrends(transformedPayments, startDate, endDate);
}

export function getPaymentDetails(startDate?: string, endDate?: string) {
  const safeData = getSafeData();
  return transformPaymentData(safeData.payments);
}

export function getExpenseTrends(startDate?: string, endDate?: string) {
  const safeData = getSafeData();
  return calculateExpenseTrends(safeData.expenses, startDate, endDate);
}

export function getAccountTrends(startDate?: string, endDate?: string) {
  const safeData = getSafeData();
  return calculateAccountTrends(safeData.accounts, startDate, endDate);
}

export function getEnhancedSeries(startDate?: string, endDate?: string) {
  const safeData = getSafeData();
  const transformedPayments = transformPaymentData(safeData.payments);
  return calculateSeries(safeData.invoices, safeData.expenses, transformedPayments, startDate, endDate);
}

export function getInvoiceStatistics(startDate?: string, endDate?: string) {
  const safeData = getSafeData();

  // Calculate invoice statistics from centralized data with date filtering
  const result = calculateInvoiceSummary(safeData.invoices, startDate, endDate);
  return result;
}

export function getAccountSummary(startDate?: string, endDate?: string) {
  const safeData = getSafeData();
  return calculateAccountSummary(safeData.accounts, startDate, endDate);
}

export function getExpenseSummary(startDate?: string, endDate?: string) {
  const safeData = getSafeData();
  return calculateExpenseSummary(safeData.expenses, startDate, endDate);
}

export function getAccountDetails(startDate?: string, endDate?: string) {
  const safeData = getSafeData();
  return safeData.accounts;
}

export function getBalanceSheet(startDate?: string, endDate?: string) {
  const safeData = getSafeData();
  return calculateBalanceSheet(safeData.accounts, startDate, endDate);
}

export function getCashFlow(startDate?: string, endDate?: string) {
  const safeData = getSafeData();
  const transformedPayments = transformPaymentData(safeData.payments);
  return calculateCashFlow(transformedPayments, safeData.expenses, startDate, endDate);
}

export function getAging(startDate?: string, endDate?: string) {
  const safeData = getSafeData();
  return calculateAging(safeData.invoices, startDate, endDate);
}

export function getLedger(startDate?: string, endDate?: string) {
  const safeData = getSafeData();
  return calculateLedger(safeData.accounts, startDate, endDate);
}

export function getCOGSDetail(startDate?: string, endDate?: string) {
  // Return mock COGS detail data
  return {
    total_cost: 1971000,
    cost_breakdown: [
      { name: 'Direct Materials', amount: 1182600, percentage: 60 },
      { name: 'Direct Labor', amount: 591300, percentage: 30 },
      { name: 'Manufacturing Overhead', amount: 197100, percentage: 10 }
    ],
    period: startDate && endDate ? `${startDate} to ${endDate}` : 'Current Period'
  };
}

export function getGrossProfitDetail(startDate?: string, endDate?: string) {
  // Return mock gross profit detail data
  return {
    gross_profit: 3504000,
    gross_margin: 64.0,
    monthly_breakdown: [
      { month: 'Jan', revenue: 456250, cogs: 164250, gross_profit: 292000 },
      { month: 'Feb', revenue: 456250, cogs: 164250, gross_profit: 292000 },
      { month: 'Mar', revenue: 456250, cogs: 164250, gross_profit: 292000 }
    ],
    period: startDate && endDate ? `${startDate} to ${endDate}` : 'Current Period'
  };
}

export function getTopExpenses(startDate?: string, endDate?: string, limit: number = 10) {
  const safeData = getSafeData();
  const expenses = safeData.expenses;
  const filteredExpenses =
    startDate && endDate
      ? expenses.filter((exp) => {
          const expDate = new Date(exp.date);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return expDate >= start && expDate <= end;
        })
      : expenses;

  return filteredExpenses.sort((a, b) => (b.amount || 0) - (a.amount || 0)).slice(0, limit);
}

// ============================================================================
// TEST FUNCTIONS - Hardcoded data to ensure charts work
// ============================================================================

export function getTestKPIs() {
  return [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: 175000,
      change: 12500,
      change_percentage: 7.7,
      trend: 'up',
      period: 'Current Period'
    },
    {
      id: 'expenses',
      title: 'Total Expenses',
      value: 6550,
      change: -800,
      change_percentage: -10.9,
      trend: 'down',
      period: 'Current Period'
    },
    {
      id: 'profit',
      title: 'Net Profit',
      value: 168450,
      change: 13300,
      change_percentage: 8.6,
      trend: 'up',
      period: 'Current Period'
    },
    {
      id: 'payments',
      title: 'Total Payments',
      value: 163000,
      change: 15000,
      change_percentage: 10.1,
      trend: 'up',
      period: 'Current Period'
    }
  ];
}

export function getTestSeries() {
  return [
    { date: '2024-01-15', revenue: 25000, expense: 500, profit: 24500, payments: 25000 },
    { date: '2024-01-20', revenue: 18000, expense: 2500, profit: 15500, payments: 18000 },
    { date: '2024-01-25', revenue: 15000, expense: 800, profit: 14200, payments: 15000 },
    { date: '2024-01-30', revenue: 28000, expense: 1500, profit: 26500, payments: 28000 },
    { date: '2024-02-01', revenue: 45000, expense: 300, profit: 44700, payments: 45000 },
    { date: '2024-02-05', revenue: 22000, expense: 750, profit: 21250, payments: 22000 }
  ];
}

export function getTestExpenseCategories() {
  return [
    { category: 'Office Supplies', amount: 500, count: 1 },
    { category: 'Marketing', amount: 2500, count: 1 },
    { category: 'Technology', amount: 1200, count: 1 },
    { category: 'Travel', amount: 800, count: 1 },
    { category: 'Insurance', amount: 1500, count: 1 },
    { category: 'Utilities', amount: 300, count: 1 },
    { category: 'Maintenance', amount: 750, count: 1 }
  ];
}

export function getTestInvoiceStatistics() {
  return {
    total_invoices: 7,
    total_amount: 175000,
    paid_amount: 92000,
    outstanding_amount: 83000,
    overdue_amount: 54000,
    average_invoice_value: 25000,
    invoices_by_status: { paid: 3, pending: 2, overdue: 2 }
  };
}

export function getTestProfitAndLossSummary() {
  return {
    total_income: 175000,
    total_expenses: 6550,
    gross_profit: 168450,
    net_income: 168450,
    cost_of_goods_sold: 0,
    operating_expenses: 6550,
    other_income: 0,
    other_expenses: 0,
    period: 'Current Period'
  };
}
