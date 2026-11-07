// The five mock recommendations the redesigned /insights page is built against.
// Copy is from the design reference and is final: change it there first.

import type { InsightsPayload } from '../types';

export const INSIGHTS_MOCK: InsightsPayload = {
  storeName: 'Juniper & Rye',
  mode: 'save',
  refreshedAt: 'today at 7:02 AM',
  recommendations: [
    {
      id: 'rec-mara-reorder',
      category: 'inventory',
      title: 'Reorder the Mara cable-knit sweater in M and L before Saturday',
      summary:
        'You will likely sell through medium and large by Friday afternoon. A 6-unit reorder from your rep lands Wednesday if you place it today.',
      deadline: 'Order by 5 PM today',
      confidence: 'high',
      impact: { amount: 1140, label: 'revenue protected', signed: true },
      primaryAction: { label: 'Draft purchase order', kind: 'purchase_order' },
      actionPayload: {
        item: 'Mara cable-knit sweater',
        lines: [
          { size: 'M', quantity: 3 },
          { size: 'L', quantity: 3 }
        ]
      },
      rationale: {
        narrative:
          'Mara is selling at more than twice its normal November pace, and the two things that drove the same spike last year (the first freeze and a home football weekend) both land this week. At the current rate, M and L run out before Saturday, which is usually your biggest day of the month. Six units (3 M, 3 L) covers the forecast with one or two left over, so you are not overbuying into December.',
        steps: [
          'Spotted Mara selling well above its 8-week baseline',
          'Matched this week to the closest precedent: Nov 15 to 21, 2025',
          'Checked floor stock and vendor lead time against the forecast',
          'Sized the order to the forecast, not the spike, because you are in Save mode'
        ]
      },
      facts: [
        { source: 'sales_history', label: 'Units sold, last 10 days', value: '14', sub: '2.3x its November average' },
        { source: 'inventory', label: 'On the floor now', value: '3 M · 2 L', sub: 'None in back stock' },
        { source: 'weather', label: 'Forecast, Thu to Sun', value: '28 to 33°F lows', sub: 'First freeze of the season' },
        { source: 'local_events', label: 'IU home game, Sat Nov 14', value: '52,000', sub: 'Expected attendance' },
        { source: 'sales_history', label: 'Same week last year', value: '19 sold', sub: 'Sold out of M by Sat 2 PM' },
        { source: 'inventory', label: 'Vendor lead time', value: '4 days', sub: 'Average of last 5 orders' }
      ],
      signalCount: 6,
      lastChecked: '7:02 AM'
    },
    {
      id: 'rec-saturday-shift',
      category: 'staffing',
      title: 'Add a second associate Saturday, 11 AM to 3 PM',
      summary: 'Home-game Saturdays run well above a normal Saturday, and you have one person scheduled for the busiest window.',
      deadline: 'Schedule by Thursday',
      confidence: 'medium',
      impact: { amount: 620, label: 'est. sales captured', signed: true },
      primaryAction: { label: 'Add shift', kind: 'shift' },
      actionPayload: { date: '2026-11-14', start: '11:00', end: '15:00', role: 'associate' },
      rationale: {
        narrative:
          'Your last three home-game Saturdays averaged 1.6x a normal Saturday, and most of that came between 11 AM and 3 PM. Right now one associate covers that window. On the last home game with one person on, the register queue backed up and conversion dropped for about two hours. A four-hour second shift costs roughly $84 and should capture a good share of what walks out otherwise.',
        steps: [
          'Flagged Saturday as a home-game day with a large expected crowd',
          'Compared the last three home-game Saturdays to your normal Saturday',
          'Checked the current schedule for the 11 AM to 3 PM window',
          'Estimated captured sales against the cost of a four-hour shift'
        ]
      },
      facts: [
        { source: 'local_events', label: 'IU home game, Sat Nov 14', value: '52,000', sub: 'Expected attendance' },
        { source: 'sales_history', label: 'Last 3 home-game Saturdays', value: '1.6x', sub: "A normal Saturday's sales" },
        { source: 'sales_history', label: 'Share of sales, 11 AM to 3 PM', value: '62%', sub: 'Last home-game Saturday' },
        { source: 'staffing', label: 'Scheduled, Sat 11 AM to 3 PM', value: '1 associate', sub: 'Register and floor' },
        { source: 'staffing', label: 'Cost of a 4-hour shift', value: '$84', sub: 'At your average hourly rate' }
      ],
      signalCount: 5,
      lastChecked: '7:02 AM'
    },
    {
      id: 'rec-linen-markdown',
      category: 'pricing',
      title: 'Mark down 42 summer linen dresses by 30%',
      summary: 'They have been on the floor 118 days with almost no movement, and the cash they hold is worth more to you this month.',
      deadline: 'This week',
      confidence: 'high',
      impact: { amount: 2050, label: 'cash freed', signed: true },
      primaryAction: { label: 'Schedule markdown', kind: 'markdown' },
      actionPayload: { item: 'Summer linen dress', units: 42, percentOff: 30 },
      rationale: {
        narrative:
          'The linen dresses have been on the floor since July and sold three units in the last 30 days. The weather has turned, so demand is not coming back this season. Your last two seasonal markdowns at 30% cleared about 70% of units within three weeks. Freeing that cash now matters more than the margin you give up, because you are in Save mode heading into your busiest weeks.',
        steps: [
          'Flagged the linen dresses as aged stock with no recent sales',
          "Confirmed the season is over from the forecast and last year's pattern",
          'Looked at how your last two 30% markdowns cleared',
          'Chose 30% as the depth that clears stock without giving away more margin than needed'
        ]
      },
      facts: [
        { source: 'inventory', label: 'Summer linen dresses on floor', value: '42 units', sub: 'Average age 118 days' },
        { source: 'sales_history', label: 'Units sold, last 30 days', value: '3', sub: 'Down from 19 in August' },
        { source: 'inventory', label: 'Cash tied up at cost', value: '$2,940', sub: 'Across all sizes' },
        { source: 'pricing', label: 'Sell-through at 30% off', value: '71%', sub: 'Your last two seasonal markdowns' },
        { source: 'weather', label: 'Forecast lows this week', value: '28 to 33°F', sub: 'No linen demand expected' }
      ],
      signalCount: 5,
      lastChecked: '7:02 AM'
    },
    {
      id: 'rec-inner-circle-invite',
      category: 'inner_circle',
      title: 'Invite 38 lapsed Inner Circle members to your holiday preview',
      summary: 'These are good customers who have not been in for 90+ days. Last year the preview brought back about 1 in 4 of them.',
      deadline: 'Send by Monday',
      confidence: 'medium',
      impact: { amount: 1860, label: 'est. sales', signed: true },
      primaryAction: { label: 'Review invite', kind: 'invite' },
      actionPayload: { segment: 'lapsed_90_days', members: 38, campaign: 'Holiday preview' },
      rationale: {
        narrative:
          "Thirty-eight Inner Circle members who used to shop regularly have not visited in over 90 days. Last year's holiday preview brought back about one in four of the lapsed members you invited, and the ones who came spent close to $200 each. The preview is eight days out, so the invite needs to go by Monday to give people time to plan.",
        steps: [
          'Found Inner Circle members with no visit in 90 or more days',
          "Checked how last year's preview invite performed with the same group",
          'Estimated sales from the return rate and average preview spend',
          'Set the send date so the invite lands a week before the event'
        ]
      },
      facts: [
        { source: 'inner_circle', label: 'Members lapsed 90+ days', value: '38', sub: 'Average prior spend $412 per year' },
        { source: 'sales_history', label: 'Return rate, 2025 preview', value: '1 in 4', sub: '9 of 36 lapsed invitees came back' },
        { source: 'sales_history', label: 'Spend per returning member', value: '$196', sub: '2025 holiday preview' },
        { source: 'inner_circle', label: 'Days until preview', value: '8', sub: 'Invite should land by Monday' }
      ],
      signalCount: 4,
      lastChecked: '7:02 AM'
    },
    {
      id: 'rec-spring-deposit',
      category: 'cash',
      title: 'Move the $4,200 spring deposit to December 1',
      summary: 'Your vendor allows it at no cost, and it keeps you above your cash floor through your two busiest weeks.',
      deadline: 'Before Nov 10',
      confidence: 'high',
      impact: { amount: 4200, label: 'kept on hand in Nov', signed: false },
      primaryAction: { label: 'Reschedule payment', kind: 'payment' },
      actionPayload: { bill: 'Spring order deposit', amount: 4200, dueDate: '2026-11-10', newDate: '2026-12-01' },
      rationale: {
        narrative:
          "The spring deposit is due November 10. Paying it then puts you below your $8,000 cash floor around November 12 to 14, right before your two biggest weeks of the month. Your vendor's terms allow moving the deposit to December 1 with no fee, and by then the November inflows have landed. Nothing about the spring order changes; only the payment date does.",
        steps: [
          'Projected cash day by day through the end of November',
          'Found the deposit pushes you below your cash floor for about two weeks',
          "Checked the vendor's terms for a no-cost reschedule",
          'Confirmed December 1 clears the floor with your November inflows'
        ]
      },
      facts: [
        { source: 'cash', label: 'Cash on hand today', value: '$11,300', sub: 'Floor set at $8,000' },
        { source: 'cash', label: 'Spring deposit due', value: '$4,200', sub: 'Due Nov 10' },
        { source: 'cash', label: 'Projected low point, Nov 12 to 14', value: '$6,900', sub: 'If the deposit is paid on time' },
        { source: 'vendor_terms', label: 'Reschedule to Dec 1', value: 'No fee', sub: "Per your vendor's terms" },
        { source: 'sales_history', label: 'Nov 14 to 28', value: 'Busiest two weeks', sub: 'Of the month, last two years' }
      ],
      signalCount: 5,
      lastChecked: '7:02 AM'
    }
  ]
};
