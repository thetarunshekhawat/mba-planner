import type { Course, Spec } from '@/types';

export const SPECS: Spec[] = [
  { id: 'FIN',  label: 'Finance',           color: '#1565c0', bg: '#e3f2fd' },
  { id: 'OPS',  label: 'Operations',         color: '#2e7d32', bg: '#e8f5e9' },
  { id: 'ENT',  label: 'Entrepreneurship',   color: '#6a1b9a', bg: '#f3e5f5' },
  { id: 'ECOM', label: 'E-Commerce',          color: '#e65100', bg: '#fff3e0' },
  { id: 'MKT',  label: 'Marketing',           color: '#ad1457', bg: '#fce4ec' },
  { id: 'LSTR', label: 'Leadership & Strat.', color: '#00695c', bg: '#e0f2f1' },
];

export const ALL_COURSES: Course[] = [
  // ─── TERM 4  (Jun 29 – Sep 27 2026) ───────────────────────────────────────

  // Block 16 (Jun 29 – Jul 12) — ABMK, SCAT, IFIN all run simultaneously in different time slots
  {
    id: 1, term: 4, week: 1,
    startDate: '2026-06-29', endDate: '2026-07-12',
    dates: 'Jun 29–Jul 12', block: 16,
    name: 'Account Based Marketing',
    code: 'ABMK',
    faculty: 'Prof. Piyush Kumar',
    seats: 60, specs: ['ENT', 'MKT'], type: 'elective', conflictGroup: null,
    timings: [{ slot: '17:30–20:30', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu'] }],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/abmk.docx',
    review: {
      learningDepth: 3, workload: 'Low', careerRelevance: 3,
      whatYouLearn: ['New Approach towards B2B', 'ABM transformation (cases)', 'Organizational Structure'],
      highlights: [
        'Top quality cases, goes into depth about ABM-based companies (structure, roles, strategies)',
        'No exam, final project only',
        'Useful for people entering the B2B space, not just marketing',
      ],
      lowlights: [
        'Cases need to be prepped for proper understanding',
      ],
      summary: 'Brilliant cases, can be paired with Santiago\'s course easily.',
    },
  },

  {
    id: 2, term: 4, week: 1,
    startDate: '2026-06-29', endDate: '2026-07-12',
    dates: 'Jun 29–Jul 12', block: 16,
    name: 'Supply Chain Analytics',
    code: 'SCAT',
    faculty: 'Prof. Ravi Subramanian',
    seats: 60, specs: ['ECOM', 'OPS'], mandatoryFor: ['OPS'], type: 'elective', conflictGroup: null,
    timings: [{ slot: '09:00–12:00', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/scat.docx',
    review: {
      learningDepth: 2, workload: 'Moderate', careerRelevance: 1,
      whatYouLearn: ['Bull Whip effect', 'Push Pull Supply chains', 'Real-time Operational Decision Making'],
      highlights: [
        'Daily articles discussion, Guest Speakers (Tucker, GSK, TATA Steel, etc)',
        'CP, Group Presentation (supply chain/ops articles deep dive), Individual Simulations',
      ],
      lowlights: [
        'No "analytics". Heavy on case discussions. Very less hands-on SCM management',
        'Did not find much value wrt the "analytics" part. Sort of an overview course of what SCM is.',
      ],
      summary: 'Marked compulsory for OPS specialization. Not recommended.',
    },
  },
  {
    id: 3, term: 4, week: 1,
    startDate: '2026-06-29', endDate: '2026-07-12',
    dates: 'Jun 29–Jul 12', block: 16,
    name: 'International Finance',
    code: 'IFIN',
    faculty: 'Prof. Prachi Mishra',
    seats: 60, specs: ['FIN'], type: 'elective', conflictGroup: null,
    timings: [{ slot: '13:30–16:30', room: 'S04', days: ['Wed', 'Thu', 'Fri', 'Sat'], week2Days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/ifin.pdf',
    review: null,
  },

  // Block 17 (Jul 13 – Jul 26) — STOP, SADT, AITM all run in different time slots
  {
    id: 4, term: 4, week: 3,
    startDate: '2026-07-13', endDate: '2026-07-26',
    dates: 'Jul 13–26', block: 17,
    name: 'Sustainable Operations',
    code: 'STOP',
    faculty: 'Prof. Vinayak Deshpande',
    seats: 60, specs: ['LSTR', 'OPS'], type: 'elective', conflictGroup: null,
    timings: [{ slot: '09:00–12:00', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], week2Days: ['Mon', 'Tue', 'Wed', 'Thu'] }],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/stop.docx',
    review: {
      learningDepth: 5, workload: 'Moderate-Low', careerRelevance: 3,
      whatYouLearn: ['Sustainable ops setup', 'Environmental factors', 'Lean and green ops', 'Sustainability across ops'],
      highlights: [
        'New course and prof, in general good reviews',
        'CP, Individual case reports, group case analysis, group ppt and report',
        'Intersection of sustainability and ops, managing regulatory expectations',
      ],
      lowlights: [],
      summary: 'General consensus: Recommended. New concept — how being sustainable drives profits.',
    },
  },
  // WaW — Block 17 (Winning at Workplace, two sections A/B)
  {
    id: 101, term: 4, week: 3,
    startDate: '2026-07-13', endDate: '2026-07-26',
    dates: 'Jul 13–26', block: 17,
    name: 'Winning at Workplace',
    code: 'AITM',
    faculty: 'TBD',
    seats: null, specs: [], type: 'waw', conflictGroup: null,
    timings: [
      { slot: '13:30–15:00', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu'], part: 'A' },
      { slot: '17:00–18:30', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu'], part: 'B' },
    ],
    seatingCharts: [
      { section: 'A', url: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/seating-charts/aitm-section-a.pdf' },
      { section: 'B', url: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/seating-charts/aitm-section-b.pdf' },
    ],
    review: null,
  },

  {
    id: 5, term: 4, week: 3,
    startDate: '2026-07-13', endDate: '2026-07-26',
    dates: 'Jul 13–26', block: 17,
    name: 'Sales & Distribution',
    code: 'SADT',
    faculty: 'Prof. Mudit Mathur',
    seats: 120, specs: ['ECOM', 'MKT'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '09:00–12:00', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'A' },
      { slot: '13:30–16:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], week2Days: ['Mon', 'Tue', 'Wed', 'Thu'], part: 'B' },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/sadt.docx',
    seatingCharts: [
      { section: 'A', url: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/seating-charts/sadt-section-a.pdf' },
      { section: 'B', url: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/seating-charts/sadt-section-b.pdf' },
    ],
    review: {
      learningDepth: 5, workload: 'Moderate', careerRelevance: 5,
      whatYouLearn: ['Sales Strategies/Frameworks', 'Distribution Channels & Value Chain'],
      highlights: [
        'Good cases, excellent class teaching',
        'Has a staggered project and MCQ based exam',
        'Extremely important for sales & marketing roles',
      ],
      lowlights: [
        'Staggered project can be painful to manage',
        'Little technical at points',
      ],
      summary: 'Staggered project is a pain, but Mudit Mathur is a brilliant prof.',
    },
  },

  // Block 18 (Jul 27 – Aug 9) — FWKJ + FSAT (FSAT continues into Block 19)
  {
    id: 6, term: 4, week: 5,
    startDate: '2026-07-27', endDate: '2026-08-09',
    dates: 'Jul 27–Aug 9', block: 18,
    name: 'Future of Work and Jobs',
    code: 'FWKJ',
    faculty: 'Prof. Prithwiraj Choudhury',
    seats: 120, specs: ['ENT', 'LSTR'], mandatoryFor: ['LSTR'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '09:30–12:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'A' },
      { slot: '13:30–16:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'B' },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/fwkj.pdf',
    review: {
      learningDepth: 3, workload: 'Low', careerRelevance: 4,
      whatYouLearn: ['Human Capital, Jobs in the future', 'Impact of AI & Automation on Jobs', 'Remote vs Hybrid vs WFA vs In Office', 'Frameworks to Evaluate'],
      highlights: [
        'Good Cases & Readings, concepts taught through cases & discussions',
        'Least faffy LSTR course',
        'Important Framework(s)/Concepts: JTBD Framework',
      ],
      lowlights: [
        'High CP Component leads to DCP, study groups of 2',
        'Please do readings before class',
        'Grading: CP (40%) + Final PPT (60%)',
      ],
      summary: 'Would recommend, one of the better courses at BITSoM. Professor is knowledgeable in this domain.',
    },
  },
  // WaW — Block 18
  {
    id: 105, term: 4, week: 5,
    startDate: '2026-07-27', endDate: '2026-08-06',
    dates: 'Jul 27–Aug 6', block: 18,
    name: 'Expression through Theatre',
    code: 'EXTT',
    faculty: 'Drama School Mumbai',
    seats: null, specs: [], type: 'waw', conflictGroup: null,
    timings: [
      { slot: '17:00–18:30', room: 'MPH / Moot Court', days: ['Mon', 'Tue', 'Wed', 'Thu'], part: 'A' },
      { slot: '19:00–20:30', room: 'MPH / Moot Court', days: ['Mon', 'Tue', 'Wed', 'Thu'], part: 'B' },
    ],
    review: null,
  },

  {
    id: 7, term: 4, week: 5,
    startDate: '2026-07-27', endDate: '2026-08-21',
    dates: 'Jul 27–Aug 21', block: 18,
    name: 'Financial Statement Analysis',
    code: 'FSAT',
    faculty: 'Prof. Prabhu Venkatachalam',
    seats: 120, specs: ['FIN'], type: 'elective', conflictGroup: null,
    // Section B mornings / A afternoons; spans Blocks 18 & 19 with different week-1 days per block
    timings: [
      { slot: '09:30–12:30', room: 'S02', days: ['Thu', 'Fri'], week2Days: ['Mon', 'Tue', 'Thu'], block2Days: ['Wed', 'Fri'], block2Week2Days: ['Mon', 'Tue', 'Thu'], part: 'B' },
      { slot: '13:30–16:30', room: 'S02', days: ['Thu', 'Fri'], week2Days: ['Mon', 'Tue', 'Thu'], block2Days: ['Wed', 'Fri'], block2Week2Days: ['Mon', 'Tue', 'Thu'], part: 'A' },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/fsat.docx',
    review: {
      learningDepth: 5, workload: 'High', careerRelevance: 5,
      whatYouLearn: ['Ratio Analysis', 'Structured forecasting', 'Cash Flow & Earnings Analysis', 'Equity Valuation Models'],
      highlights: [
        'End-to-end analysis of a business with daily in-class numericals; small cases',
        'Concept-first teaching style, slow-paced, and structured',
        'Covers equity research, fundamental analysis with respect to career in finance',
      ],
      lowlights: [
        'Exam, Quiz, Heavy Final Project with regular check-ins, No CP',
        'Avoid Double Block with this',
      ],
      summary: 'Would recommend. Covers everything needed to analyze a business fundamentally.',
    },
  },

  // SADM makeup — one-off session on Wed Aug 05 (Block 18 Week 2)
  {
    id: 109, term: 4, week: 6,
    startDate: '2026-08-05', endDate: '2026-08-05',
    dates: 'Aug 5', block: 18,
    name: 'Sales & Distribution (Makeup)',
    code: 'SADT',
    faculty: 'Prof. Mudit Mathur',
    seats: 120, specs: ['ECOM', 'MKT'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '09:30–12:30', room: 'S02', days: [], week2Days: ['Wed'], part: 'A' },
      { slot: '13:30–16:30', room: 'S02', days: [], week2Days: ['Wed'], part: 'B' },
    ],
    review: null,
  },

  // Block 19 (Aug 10 – Aug 23) — BECB, MHLG, + FSAT continues
  {
    id: 8, term: 4, week: 7,
    startDate: '2026-08-10', endDate: '2026-08-23',
    dates: 'Aug 10–23', block: 19,
    name: 'Building an E-Commerce Business',
    code: 'BECB',
    faculty: 'Prof. Lil Mohan',
    seats: 120, specs: ['ENT', 'ECOM'], type: 'elective', conflictGroup: null,
    // Section A mornings (09:00 start in week 1, 09:30 in week 2 per timetable), B afternoons
    timings: [
      { slot: '09:30–12:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'A' },
      { slot: '13:30–16:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'B' },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/becb.pdf',
    review: {
      learningDepth: 5, workload: 'Heavy', careerRelevance: 4,
      whatYouLearn: ['UI/UX of E-commerce platform', 'Digital Marketing', 'Being forcefully punctual'],
      highlights: [
        'E-commerce business ideation',
        'Will get exposure to Figma, storyboarding and personas',
        'Amazon.com behind the scene',
        'Excellent and engaging professor',
      ],
      lowlights: [
        '100% attendance policy; 40% individual assignment (Making your own app)',
      ],
      summary: 'Would highly recommend — deeper understanding of how ECOM works.',
    },
  },
  {
    id: 9, term: 4, week: 7,
    startDate: '2026-08-10', endDate: '2026-08-23',
    dates: 'Aug 10–23', block: 19,
    name: 'Machine Learning for Managers',
    code: 'MHLG',
    faculty: 'Prof. Meenakshi Balakrishna',
    seats: 60, specs: ['MKT', 'OPS'], type: 'elective', conflictGroup: null,
    timings: [{ slot: '17:30–20:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/mhlg.docx',
    review: {
      learningDepth: 3, workload: 'Moderate', careerRelevance: 2,
      whatYouLearn: ['Basic Classification & Trees', 'Basics of Neural Networks', 'Clustering, Data Handling, Vibe Coding'],
      highlights: [
        'Good overview of Basic ML concepts & not very technical',
        'Daily Quizzes & CP (20%) + Individual Assignments (40%) + Final Project (30%) + Peer Review (10%)',
      ],
      lowlights: [
        'Nothing you can\'t learn on your own',
        'Due to Gen AI & lack of practical projects, you don\'t really internalise these concepts',
      ],
      summary: 'Prof teaches decently well. Can skip if not actively working on these concepts.',
    },
  },

  // Exam Week — Aug 24
  {
    id: 11, term: 4, week: 9,
    startDate: '2026-08-24', endDate: '2026-08-28',
    dates: 'Aug 24–28', block: null,
    name: 'Exam Week',
    faculty: '', seats: null, specs: [], type: 'exam', conflictGroup: null, review: null,
  },

  // Block 20 (Aug 31 – Sep 13) — ABMA + PSWT (WaW)
  {
    id: 10, term: 4, week: 10,
    startDate: '2026-08-31', endDate: '2026-09-11',
    dates: 'Aug 31–Sep 11', block: 20,
    name: 'AI in Business: From Models to Agents',
    code: 'ABMA',
    faculty: 'Prof. Daniel Ringel',
    seats: null, specs: [], type: 'mandatory', conflictGroup: null,
    timings: [
      { slot: '09:00–12:00', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'A' },
      { slot: '13:30–16:30', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'B' },
    ],
    review: null,
  },

  // WaW — Block 20
  {
    id: 102, term: 4, week: 10,
    startDate: '2026-08-31', endDate: '2026-09-11',
    dates: 'Aug 31–Sep 11', block: 20,
    name: 'Persuasive Writing for Managers',
    code: 'PSWT',
    faculty: 'Prof. Somak Ghoshal',
    seats: null, specs: [], type: 'waw', conflictGroup: null,
    timings: [
      { slot: '09:00–10:30', room: 'S03', days: ['Mon', 'Tue', 'Wed', 'Thu'], part: 'A' },
      { slot: '13:30–15:00', room: 'S03', days: ['Mon', 'Tue', 'Wed', 'Thu'], part: 'B' },
    ],
    review: null,
  },

  // Block 21 Week 1 — Sep 14
  {
    id: 14, term: 4, week: 12,
    startDate: '2026-09-14', endDate: '2026-09-27',
    dates: 'Sep 14–27', block: 21,
    name: 'Product Management',
    code: 'PDMT',
    faculty: 'Prof. Srinivas Pingali',
    seats: 60, specs: ['ECOM', 'MKT'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '09:00–12:00', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], week2Days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'A' },
      { slot: '13:30–16:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], week2Days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'B' },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/pdmt.pdf',
    review: {
      learningDepth: 1, workload: 'Low-Moderate', careerRelevance: 4,
      whatYouLearn: ['JBTD', 'User Stories', 'Prototyping, PoC build, Claude usage'],
      highlights: [
        'Can use laptop throughout the class',
        'Almost all assignments can be done using AI',
      ],
      lowlights: [
        'No structure, open ended, mid week change of prof, no clarity on grading weightages',
        'Lackluster',
      ],
      summary: 'Prof(s) will change for Co27, not sure if fate of the course will change.',
    },
  },
  {
    id: 15, term: 4, week: 12,
    startDate: '2026-09-14', endDate: '2026-09-27',
    dates: 'Sep 14–27', block: 21,
    name: 'Managing High Performance Teams',
    code: 'MHPT',
    faculty: 'Prof. Pooja Mishra',
    seats: 60, specs: ['ENT', 'LSTR'], type: 'elective', conflictGroup: null,
    timings: [{ slot: '09:00–12:00', room: 'S03', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], week2Days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/mhpt.docx',
    review: {
      learningDepth: 2, workload: 'Low-Moderate', careerRelevance: 3,
      whatYouLearn: ['How to build Effective HP Teams', 'Power & Influence in Teams', 'Team Member roles & How to manage members'],
      highlights: [
        'This course is not very heavy',
        'Not too theoretical as concepts were taught through cases',
        'Some concepts on team dynamics, power & influence are interesting & potentially useful',
      ],
      lowlights: [
        'Different Prof teaching this course for Co\'27. Most OB courses tend to be faffy',
        'Grading: CP (15%) + Group PPT & Report (35%) + Final Exam (50%)',
      ],
      summary: 'Can take this. Typical OB-HR course, some relevant takeaways, not very heavy.',
    },
  },

  // ─── TERM 5  (Sep 28 – Dec 27 2026) ──────────────────────────────────────
  // Sources: "Term 5 Structure.xlsx" (blocks, seats, specs, faculty; red font = mandatoryFor),
  // "Term 5 (Tentative Time Table).xlsx" (slots, rooms, days), "Bidding Guidelines (Term 5,
  // AY 26-27).docx" (staggered CIVB + FDE session dates), and the 12 course outlines.
  // Non-teaching days already reflected in the day arrays below: Gandhi Jayanti (Fri Oct 2),
  // 5 Year Celebration (Mon Oct 5), Dussehra (Tue Oct 13).

  // Block 22 (Sep 28 – Oct 11) — OPST + VALU (mornings, different rooms) + RAIG (WaW)
  {
    id: 16, term: 5, week: 14,
    startDate: '2026-09-28', endDate: '2026-10-11',
    dates: 'Sep 28–Oct 11', block: 22,
    name: 'Operations Strategy',
    code: 'OPST',
    faculty: 'Prof. Santiago Kraiselburd',
    seats: 120, specs: ['ENT', 'ECOM', 'LSTR', 'OPS'], mandatoryFor: ['OPS'], type: 'elective', conflictGroup: null,
    // Week 1 skips Fri Oct 2 (Gandhi Jayanti); week 2 skips Mon Oct 5 (5 Year Celebration).
    timings: [
      { slot: '09:00–12:00', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Sat'], week2Days: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'], part: 'A' },
      { slot: '13:30–16:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Sat'], week2Days: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'], part: 'B' },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/opst.pdf',
    review: {
      learningDepth: 5, workload: 'Moderate-High', careerRelevance: 5,
      whatYouLearn: ['Industry 4.0 (Agri + Biotech)', 'Diagnosis', 'Agility, Planning & Execution'],
      highlights: [
        'Strong case-based learning',
        'CP, project and exam',
        'Highly interactive, discussion-led classes',
      ],
      lowlights: [
        'Grading: CP (20%) + Group Assignment (40%) + Final Exam (40%)',
      ],
      summary: 'Very interactive course — loved the professor, and a must-take for the specialization.',
    },
  },
  {
    id: 17, term: 5, week: 14,
    startDate: '2026-09-28', endDate: '2026-10-11',
    dates: 'Sep 28–Oct 11', block: 22,
    name: 'Valuation',
    code: 'VALU',
    faculty: 'Prof. Sughosh Moharikar',
    seats: 60, specs: ['FIN'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '09:00–12:00', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Sat'], week2Days: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/valu.docx',
    review: null,
  },
  // WaW — Block 22
  {
    id: 104, term: 5, week: 14,
    startDate: '2026-09-28', endDate: '2026-10-09',
    dates: 'Sep 28–Oct 9', block: 22,
    name: 'Responsible AI & Governance',
    code: 'RAIG',
    faculty: 'Kashyap Kompella',
    seats: null, specs: [], type: 'waw', conflictGroup: null,
    timings: [
      { slot: '13:30–15:00', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu'], week2Days: ['Tue', 'Wed', 'Thu', 'Fri'], part: 'A' },
      { slot: '17:00–18:30', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu'], week2Days: ['Tue', 'Wed', 'Thu', 'Fri'], part: 'B' },
    ],
    review: null,
  },

  // Block 23 (Oct 12 – Oct 25) — TOPS (mornings) + CLAW (afternoons) + CIVB (evenings, 3 sessions)
  {
    id: 18, term: 5, week: 16,
    startDate: '2026-10-12', endDate: '2026-10-25',
    dates: 'Oct 12–25', block: 23,
    name: 'Technology in Operations',
    code: 'TOPS',
    faculty: 'Prof. Deepanshi Bhardwaj',
    seats: 60, specs: ['ECOM', 'OPS'], type: 'elective', conflictGroup: null,
    // Week 2 skips Tue Oct 20 (Dussehra) and Sat Oct 24 (EB exam).
    timings: [
      { slot: '09:00–12:00', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], week2Days: ['Mon', 'Wed', 'Thu', 'Fri'] },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/tops.pdf',
    review: {
      learningDepth: 4, workload: 'Moderate', careerRelevance: 4,
      whatYouLearn: ['Demand Forecasting & Logistics', 'Network Effects', 'Emerging Tech (3D printing, platforms, etc.)'],
      highlights: [
        'Covers modern tech trends in operations',
        'CP, group assignments and no exam',
        'Mandatory day field visit included',
      ],
      lowlights: [
        'Different prof for Co\'27 — Deepanshi Bhardwaj replaces Saravanan Kesavan & Probal Mojumder, so the review below describes a different instructor',
        'Field trip can be exhausting',
        'Grading: CP (35%, incl. 10% attendance) + Case & plant-visit write-ups (30%) + Final Project (35%)',
      ],
      summary: 'Useful course with hardly any workload and practical exposure.',
    },
  },
  {
    id: 19, term: 5, week: 16,
    startDate: '2026-10-12', endDate: '2026-10-25',
    dates: 'Oct 12–25', block: 23,
    name: 'Corporate Law',
    code: 'CLAW',
    faculty: 'Prof. Kishu Daswani',
    seats: 60, specs: ['ENT', 'LSTR'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '13:30–16:30', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], week2Days: ['Mon', 'Wed', 'Thu', 'Fri'] },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/claw.pdf',
    review: null,
  },
  // CIVB is staggered across Term 5 and Term 6. Sessions 1–3 sit here in Block 23;
  // sessions 4–6 are the Block 25 row below; sessions 7–10 run in Term 6 (Jan 2027).
  {
    id: 20, term: 5, week: 16,
    startDate: '2026-10-12', endDate: '2026-10-14',
    dates: 'Oct 12–14', block: 23,
    name: 'Corporate Innovation & Venture Building (Staggered)',
    code: 'CIVB',
    faculty: 'Srikant Sastri',
    seats: 60, specs: ['ENT', 'LSTR'], mandatoryFor: ['ENT'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '17:30–20:30', room: 'S04', days: ['Mon', 'Tue', 'Wed'] },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/civb.pdf',
    review: {
      learningDepth: 4, workload: 'Heavy', careerRelevance: 4,
      whatYouLearn: ['MVP Building', 'User feedback and market research', 'Different pitches to investors/customers'],
      highlights: [
        'Forces you to execute on your ideas over 3 months',
        'Guest lectures: Senior people from great companies or founders themselves. Interactive.',
        'Got us to actually start conversations with potential customers, and then redefine our idea',
      ],
      lowlights: [
        'Will have to strategically form your study group (90% of the grade is group work)',
        'The staggered format can make it harder to manage and disrupt the flow',
        'Grading: CP (30%) + Mid-course Group Submission (20%) + Final Group Presentation/Video (40%) + Individual Reflection (10%)',
      ],
      summary: 'Should take it if you want to experiment with an idea in a structured way.',
    },
  },

  // Block 24 (Oct 26 – Nov 8) — AMST + DGTK (WaW) + FDEM (evenings)
  {
    id: 21, term: 5, week: 18,
    startDate: '2026-10-26', endDate: '2026-11-08',
    dates: 'Oct 26–Nov 8', block: 24,
    name: 'Advanced Marketing Strategy',
    code: 'AMST',
    faculty: 'Prof. Wilfred Amaldoss',
    seats: 120, specs: ['ECOM', 'MKT'], mandatoryFor: ['MKT'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '09:00–12:00', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'A' },
      { slot: '13:30–16:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'B' },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/amst.pdf',
    review: {
      learningDepth: 3, workload: 'Moderate', careerRelevance: 3,
      whatYouLearn: ['Demand Elasticity Economic Value', 'Multi-sided markets and managing product portfolios'],
      highlights: [
        'Excellent cases — 1 intl + 1 Indian per class',
        'Practical exposure to conjoint analysis through assignments',
        'Extremely high quality — great concepts + guest lectures',
      ],
      lowlights: [
        'Grading: CP (30%) + Group Assignment (30%) + in-class Final Exam (40%)',
      ],
      summary: 'One of the most relevant marketing courses at BITSoM. No filler topics, excellent class notes.',
    },
  },
  // WaW — Block 24
  {
    id: 110, term: 5, week: 18,
    startDate: '2026-10-26', endDate: '2026-11-05',
    dates: 'Oct 26–Nov 5', block: 24,
    name: 'Design Thinking',
    code: 'DGTK',
    faculty: 'Ashish Bansal',
    seats: null, specs: [], type: 'waw', conflictGroup: null,
    timings: [
      { slot: '09:00–10:30', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu'], part: 'A' },
      { slot: '13:30–15:00', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu'], part: 'B' },
    ],
    review: null,
  },
  {
    id: 48, term: 5, week: 18,
    startDate: '2026-10-26', endDate: '2026-11-06',
    dates: 'Oct 26–Nov 6', block: 24,
    name: 'Forward Deployed Expert (FDE) Management I',
    code: 'FDEM',
    faculty: 'Srinivas Atreya & Sirisha Peyyeti',
    seats: 45, specs: ['ECOM', 'LSTR'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '17:30–20:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/fdem.docx',
    review: null,
  },

  // Exam Break — Nov 9
  {
    id: 23, term: 5, week: 20,
    startDate: '2026-11-09', endDate: '2026-11-15',
    dates: 'Nov 9–15', block: null,
    name: 'Exam Break',
    faculty: '', seats: null, specs: [], type: 'exam', conflictGroup: null, review: null,
  },

  // Placements Week — Nov 16
  {
    id: 24, term: 5, week: 21,
    startDate: '2026-11-16', endDate: '2026-11-22',
    dates: 'Nov 16–22', block: null,
    name: 'Placements Week',
    faculty: '', seats: null, specs: [], type: 'free', conflictGroup: null, review: null,
  },

  // Block 25 (Nov 23 – Dec 6) — ENFF + SBRM (mornings) + CIVB (evenings) + ESGV (WaW)
  {
    id: 25, term: 5, week: 22,
    startDate: '2026-11-23', endDate: '2026-12-06',
    dates: 'Nov 23–Dec 6', block: 25,
    name: 'Entrepreneurial Finance & Fundraising',
    code: 'ENFF',
    faculty: 'Prof. Amit Bubna',
    seats: 60, specs: ['ENT', 'FIN'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '09:00–12:00', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/enff.pdf',
    review: {
      learningDepth: 2, workload: 'Heavy', careerRelevance: 3,
      whatYouLearn: ['Options', 'Valuation of Fixed Income & Equities', 'Revision of M&A Concepts'],
      highlights: [
        'Introduced VC and PE',
        'Good exposure to macro finance like retirement, corporate governance',
      ],
      lowlights: [
        'Cases were pretty dated, and felt disconnected to the current scenario',
        'Quiz before classes start. Had to read/be lucky with seating chart',
        'Grading: Case write-ups & presentations (50%) + Assignments (20%) + CP (20%) + Peer evaluation (10%)',
      ],
      summary: 'Would suggest to skip this course since it doesn\'t follow the name.',
    },
  },
  {
    id: 26, term: 5, week: 22,
    startDate: '2026-11-23', endDate: '2026-12-06',
    dates: 'Nov 23–Dec 6', block: 25,
    name: 'Strategic Brand Management',
    code: 'SBRM',
    faculty: 'Prof. Shailendra (Shelley) Jain',
    seats: 120, specs: ['ECOM', 'MKT'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '09:00–12:00', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'A' },
      { slot: '13:30–16:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'B' },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/sbrm.pdf',
    review: {
      learningDepth: 3, workload: 'Moderate-High', careerRelevance: 2,
      whatYouLearn: ['Brand Positioning', 'Associations', 'Extensions', 'Touch Points'],
      highlights: [
        'Good cases',
        'Maybe relevant lingo for future brand managers',
        'Fun prof (free YogaBars!)',
      ],
      lowlights: [
        'Limited depth in concepts',
        'Groups are 7–8 people — the largest of any Term 5 course',
        'Grading: Group Assignments (30%) + Brand Authenticity individual (20%) + CP (20%) + Brand Audit final group project (30%)',
      ],
      summary: 'Fun prof, but limited takeaways.',
    },
  },
  {
    id: 27, term: 5, week: 22,
    startDate: '2026-11-23', endDate: '2026-11-25',
    dates: 'Nov 23–25', block: 25,
    name: 'Corporate Innovation & Venture Building (Staggered — Part 2)',
    code: 'CIVB',
    faculty: 'Srikant Sastri',
    seats: 60, specs: ['ENT'], mandatoryFor: ['ENT'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '17:30–20:30', room: 'S04', days: ['Mon', 'Tue', 'Wed'] },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/civb.pdf',
    review: {
      learningDepth: 4, workload: 'Heavy', careerRelevance: 4,
      whatYouLearn: ['MVP Building', 'User feedback and market research', 'Different pitches to investors/customers'],
      highlights: [
        'Forces you to execute on your ideas over 3 months',
        'Guest lectures: Senior people from great companies or founders themselves',
      ],
      lowlights: [
        '90% of the grade is group work — strategic group formation needed',
        'Staggered format can disrupt the flow; sessions 7–10 land in Term 6 (Jan 2027)',
      ],
      summary: 'Should take it if you want to experiment with an idea in a structured way.',
    },
  },
  // WaW — Block 25
  {
    id: 106, term: 5, week: 22,
    startDate: '2026-11-26', endDate: '2026-12-04',
    dates: 'Nov 26–Dec 4', block: 25,
    name: 'Environmental, Social & Governance',
    code: 'ESGV',
    faculty: 'Ram Mahidhara',
    seats: null, specs: [], type: 'waw', conflictGroup: null,
    timings: [
      { slot: '13:30–15:00', room: 'S02', days: ['Thu', 'Fri', 'Sat'], week2Days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'A' },
      { slot: '17:30–19:00', room: 'S02', days: ['Thu', 'Fri', 'Sat'], week2Days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'B' },
    ],
    review: null,
  },

  // Block 26 (Dec 7 – Dec 20) — INMK + SVOP (mornings/afternoons) + MGAQ (evenings)
  {
    id: 28, term: 5, week: 24,
    startDate: '2026-12-07', endDate: '2026-12-20',
    dates: 'Dec 7–20', block: 26,
    name: 'International Marketing',
    code: 'INMK',
    faculty: 'Prof. Venkatesh (Venky) Shankar',
    seats: 60, specs: ['MKT'], type: 'elective', conflictGroup: null,
    // Week 1 has no Monday session; week 2 runs Mon–Fri.
    timings: [
      { slot: '09:00–12:00', room: 'S02', days: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'], week2Days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'A' },
      { slot: '13:30–16:30', room: 'S02', days: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'], week2Days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'B' },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/inmk.pdf',
    review: {
      learningDepth: 3, workload: 'Moderate', careerRelevance: 2,
      whatYouLearn: ['Market entry mechanisms', 'Market Expansion frameworks', 'International Pricing mechanism', 'International Sales & Distribution'],
      highlights: [
        'Marketing frameworks, in-class exercises',
        'Grading: Group Project (50%) + Mid-term individual case report (30%) + CP (20%)',
      ],
      lowlights: [
        'Limited quantitative depth',
        'Peer review is very important — under-contributing is graded down explicitly',
        'More like good talking points/awareness than deep learning',
      ],
      summary: 'Good frameworks for a project looking at international expansion. Note: no longer compulsory for Marketing — Advanced Marketing Strategy carries that flag this year.',
    },
  },
  {
    id: 29, term: 5, week: 24,
    startDate: '2026-12-07', endDate: '2026-12-20',
    dates: 'Dec 7–20', block: 26,
    name: 'Mergers & Acquisitions',
    code: 'MGAQ',
    faculty: 'Prof. Mark Finn',
    seats: 60, specs: ['FIN'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '17:30–20:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/mgaq.pdf',
    review: {
      learningDepth: 5, workload: 'Moderate', careerRelevance: 5,
      whatYouLearn: ['Mergers vs Acquisitions', 'Cash vs Share', 'LBO, Demerger', 'Hostile Takeovers & Defences'],
      highlights: [
        'Class discussions are interesting, course does not involve a lot of excel work',
        'Grading: CP (10%) + closed-book Quiz (10%) + 2 group case studies (40%) + closed-book End Term (40%)',
      ],
      lowlights: [
        'Different prof for Co\'27 — Mark Finn (Kellogg) replaces Sughosh Moharikar, so the review below describes a different instructor',
        'Strictly avoid using devices in class',
        'No points for attendance — participation is graded on contribution only',
      ],
      summary: 'Would recommend — rare relatively chill FIN course at BITSoM. Prof is very engaging.',
    },
  },
  {
    id: 30, term: 5, week: 24,
    startDate: '2026-12-07', endDate: '2026-12-20',
    dates: 'Dec 7–20', block: 26,
    name: 'Service Operations',
    code: 'SVOP',
    faculty: 'Prof. Vishal Ahuja',
    seats: 120, specs: ['ECOM', 'OPS'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '09:00–12:00', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'A' },
      { slot: '13:30–16:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'B' },
    ],
    outlineUrl: 'https://rtchhbkrzdmfryxxuyih.supabase.co/storage/v1/object/public/course-outlines/svop.pdf',
    review: {
      learningDepth: 5, workload: 'High', careerRelevance: 3,
      whatYouLearn: ['Service Models', 'C-ID, Service Innovations', 'Service Quality Mgmt: DEA, Six Sigma'],
      highlights: [
        'THE BEST Operations prof in 2nd year, quality class discussions',
        'All projects are 2-week CLPs',
        'Grading: Quizzes best 3 of 4 (15%) + 7 group case assignments (25%) + Final group project (20%) + in-class Final Exam (25%) + CP (15%)',
      ],
      lowlights: [
        'Very heavy course load — seven group case assignments plus four quizzes in two weeks. Double block not recommended',
        'Ops refresh needed (though prof helps)',
      ],
      summary: 'Best course to learn about services and how they are operationalized. Recommended irrespective of target specialization.',
    },
  },

  // AI Incubation Project — runs Oct–Dec alongside the blocks, no fixed class slot.
  // 6 credits on successful completion (Bidding Guidelines, Term 5).
  {
    id: 49, term: 5, week: 14,
    startDate: '2026-10-01', endDate: '2026-12-20',
    dates: 'Oct–Dec', block: null,
    name: 'AI Incubation Project',
    code: 'AIIP',
    faculty: 'Arvind Ravishunkar',
    seats: null, specs: [], type: 'elective', conflictGroup: null,
    review: null,
  },

  // Exam Week — Dec 21
  {
    id: 31, term: 5, week: 26,
    startDate: '2026-12-21', endDate: '2026-12-27',
    dates: 'Dec 21–27', block: null,
    name: 'Exam Week',
    faculty: '', seats: null, specs: [], type: 'exam', conflictGroup: null, review: null,
  },

  // Term Break — Dec 28
  {
    id: 32, term: 5, week: 27,
    startDate: '2026-12-28', endDate: '2027-01-03',
    dates: 'Dec 28–Jan 3', block: null,
    name: 'Term Break',
    faculty: '', seats: null, specs: [], type: 'free', conflictGroup: null, review: null,
  },

  // ─── TERM 6  (Jan 4 – Apr 4 2027) ────────────────────────────────────────

  // Block 27 Week 1 — Jan 4
  {
    id: 33, term: 6, week: 28,
    startDate: '2027-01-04', endDate: '2027-01-08',
    dates: 'Jan 4–8', block: 27,
    name: 'Corp Innovation & Venture Building (Staggered)',
    faculty: 'Srikant Sastri',
    seats: null, specs: ['ENT'], type: 'elective', conflictGroup: null,
    review: {
      learningDepth: 4, workload: 'Heavy', careerRelevance: 4,
      whatYouLearn: ['MVP Building', 'User feedback and market research', 'Different pitches to investors/customers'],
      highlights: [
        'Forces you to execute on your ideas over 3 months',
        'Guest lectures from senior founders and company leaders',
      ],
      lowlights: [
        '75% grades is group work — strategic group formation needed',
        'Staggered format can disrupt the flow',
      ],
      summary: 'Should take it if you want to experiment with an idea in a structured way.',
    },
  },
  // WaW — Block 27
  {
    id: 107, term: 6, week: 28,
    startDate: '2027-01-04', endDate: '2027-01-08',
    dates: 'Jan 4–8', block: 27,
    name: 'Geopolitics and Business',
    faculty: 'TBD',
    seats: null, specs: [], type: 'waw', conflictGroup: null, review: null,
  },

  // Block 27 Week 2 — Jan 11
  {
    id: 34, term: 6, week: 29,
    startDate: '2027-01-11', endDate: '2027-01-15',
    dates: 'Jan 11–15', block: 27,
    name: 'Advanced Corporate Finance',
    faculty: 'N Prabhala',
    seats: null, specs: ['FIN'], type: 'elective', conflictGroup: 'T6W29',
    review: null,
  },
  {
    id: 35, term: 6, week: 29,
    startDate: '2027-01-11', endDate: '2027-01-15',
    dates: 'Jan 11–15', block: 27,
    name: 'Pricing & Revenue Optimisation',
    faculty: 'Prof. Andrew Gershoff',
    seats: null, specs: ['ECOM', 'MKT'], type: 'elective', conflictGroup: 'T6W29',
    review: {
      learningDepth: 5, workload: 'High', careerRelevance: 4,
      whatYouLearn: ['Pricing Strategies/TEV', 'Willingness to Pay', 'Competitor Response'],
      highlights: [
        'Useful strategies with daily in-class exercises in excel',
        'Knowing these strategies will help regardless of the future field of work',
        'Highly technical — attention in class is critical',
      ],
      lowlights: [
        'Exam + project; avoid double-blocking',
      ],
      summary: 'Highly technical – attention in class is critical. Project + final exam.',
    },
  },

  // Block 28 Week 1 — Jan 18
  {
    id: 36, term: 6, week: 30,
    startDate: '2027-01-18', endDate: '2027-01-22',
    dates: 'Jan 18–22', block: 28,
    name: 'Crafting & Delivering Services',
    faculty: 'Prof. Kapil Tuli',
    seats: null, specs: ['ENT', 'ECOM', 'MKT'], mandatoryFor: ['ENT', 'ECOM'], type: 'elective', conflictGroup: null,
    review: {
      learningDepth: 1, workload: 'High', careerRelevance: 1,
      whatYouLearn: ['CLV (but other profs do it better)'],
      highlights: [
        'Class discussions outside of cases were fine',
      ],
      lowlights: [
        'Case submissions every day. Cases were also average.',
        '40% individual assignment — irrelevant case',
        'Not a "fun" prof at all',
      ],
      summary: 'Don\'t take it. But since it is a compulsory course for ENT & ECOM, there is no option.',
    },
  },

  // Block 28 Week 2 — Jan 25
  {
    id: 37, term: 6, week: 31,
    startDate: '2027-01-25', endDate: '2027-01-29',
    dates: 'Jan 25–29', block: 28,
    name: 'Organisation Change Management',
    faculty: 'Prof. Ranjeet Nambudiri',
    seats: null, specs: ['LSTR'], type: 'elective', conflictGroup: 'T6W31',
    review: {
      learningDepth: 3, workload: 'Low', careerRelevance: 2,
      whatYouLearn: ['Organizational Development', 'Process Consulting', 'Change intervention & implementation in Organizations'],
      highlights: [
        'The prof is engaging, clear & to the point. Classes are well designed',
        'A relatively simple course with many in-class activities',
        'Grading: CP + Peer CP (25%) + Group Report Submission (25%) + In-Class Quizzes (25%) + Final Exam (25%)',
      ],
      lowlights: [
        'Low Career relevance, at least in the initial stages',
      ],
      summary: 'Would recommend. Chill course — learn new concepts about influencing change & process consulting.',
    },
  },
  {
    id: 38, term: 6, week: 31,
    startDate: '2027-01-25', endDate: '2027-01-29',
    dates: 'Jan 25–29', block: 28,
    name: 'New Product & Service Development',
    faculty: 'Prof. Rohit Verma',
    seats: null, specs: ['MKT', 'OPS'], type: 'elective', conflictGroup: 'T6W31',
    review: null,
  },

  // Block 29 Week 1 — Feb 1
  {
    id: 39, term: 6, week: 32,
    startDate: '2027-02-01', endDate: '2027-02-05',
    dates: 'Feb 1–5', block: 29,
    name: 'Game Theory for Strategic Decision Making',
    faculty: 'Prof. Pallavi Vyas',
    seats: null, specs: ['LSTR'], type: 'elective', conflictGroup: null,
    review: {
      learningDepth: 3, workload: 'Low-Moderate', careerRelevance: 3,
      whatYouLearn: ['Nash Equilibrium', 'Sequential Games, Auctions', 'Behavioural Economics & Bayesian Games'],
      highlights: [
        'The course is not very heavy',
        'Game Theory as a subject is very interesting',
        'Grading: CP (40%) + 2 Quizzes (30%) + Group Presentation (30%)',
      ],
      lowlights: [
        'The prof did confuse the class at times',
        'You can learn most of the concepts on your own',
      ],
      summary: 'Can take this if you are looking for a low-stress course mapped to both FIN & LSTR.',
    },
  },
  // WaW — Block 29
  {
    id: 108, term: 6, week: 32,
    startDate: '2027-02-01', endDate: '2027-02-05',
    dates: 'Feb 1–5', block: 29,
    name: 'Non Market Strategy',
    faculty: 'TBD',
    seats: null, specs: [], type: 'waw', conflictGroup: null, review: null,
  },

  // Block 29 Week 2 — Feb 8
  {
    id: 40, term: 6, week: 33,
    startDate: '2027-02-08', endDate: '2027-02-12',
    dates: 'Feb 8–12', block: 29,
    name: 'Private Markets, Equities & Hedge Funds',
    faculty: 'Prof. Vikram Kuriyan',
    seats: null, specs: ['FIN'], type: 'elective', conflictGroup: null,
    review: {
      learningDepth: 4, workload: 'Low', careerRelevance: 4,
      whatYouLearn: ['Value Investing', 'Portfolio Strategy', 'Hedge Funds & PE', 'Risk & Return'],
      highlights: [
        'Indexing vs Picking stocks, Diversification vs Concentrated bets',
        'Has the best cases and guest speakers for any FIN Course',
        'CP, Attendance, Final Exam, Case Writeups',
      ],
      lowlights: [
        'Case discussions involve heavy writing',
      ],
      summary: 'Would recommend. Prof sticks to 2–3 large ideas and drives them home via cases and guest speakers.',
    },
  },

  // Exam Week — Feb 15
  {
    id: 41, term: 6, week: 34,
    startDate: '2027-02-15', endDate: '2027-02-19',
    dates: 'Feb 15–19', block: null,
    name: 'Exam Week',
    faculty: '', seats: null, specs: [], type: 'exam', conflictGroup: null, review: null,
  },

  // Block 30 Week 1 — Feb 22
  {
    id: 42, term: 6, week: 35,
    startDate: '2027-02-22', endDate: '2027-02-26',
    dates: 'Feb 22–26', block: 30,
    name: 'Fintech and Future of Finance',
    faculty: 'Prof. Pulak Ghosh',
    seats: null, specs: ['FIN'], type: 'elective', conflictGroup: null,
    review: {
      learningDepth: 4, workload: 'Moderate-High', careerRelevance: 3,
      whatYouLearn: ['AI & ML in Finance', 'Blockchain & Crypto', 'Digital Lending', 'Payment Systems'],
      highlights: [
        'Prof has lots of experience in the field, is on the RBI decision-making body for Fintech in India',
        'Group project requires pitching an original fintech startup idea to the class',
        'CP, Mid-Term, Group Project',
      ],
      lowlights: [
        'Some classes will be too tech-heavy covering similar stuff',
      ],
      summary: 'Good course, very niche and gets repeatable in between. Can be skipped if Fintech does not interest you.',
    },
  },

  // Block 30 Week 2 — Mar 1
  {
    id: 43, term: 6, week: 36,
    startDate: '2027-03-01', endDate: '2027-03-05',
    dates: 'Mar 1–5', block: 30,
    name: 'Economics of Strategy',
    faculty: 'Prof. Parasuram Balasubramanian',
    seats: null, specs: ['LSTR'], type: 'elective', conflictGroup: null,
    review: {
      learningDepth: 4, workload: 'Moderate', careerRelevance: 4,
      whatYouLearn: ['Horizontal & Vertical Boundaries of firms', 'Forward & Backward Integration, Make or Buy', 'Entry & Exit, MOAT & Competitive Dynamics', 'Market & Org Structure'],
      highlights: [
        'Prof teaches EOS very well',
        'Deepens understanding of microeconomics, industrial org & strategy',
        'Grading: CP (20%) + 2 Take Home Assignment (30%) + 1 In Class PPT (10%) + Final PPT & Report (40%)',
      ],
      lowlights: [
        'Can become boring at times',
        'Cases are generic. Workload can become hectic if it clashes with placements or double blocks',
      ],
      summary: 'Would recommend. Useful for people going into consulting or strategy roles.',
    },
  },

  // Block 31 Week 1 — Mar 8
  {
    id: 44, term: 6, week: 37,
    startDate: '2027-03-08', endDate: '2027-03-12',
    dates: 'Mar 8–12', block: 31,
    name: 'Project Management',
    faculty: 'Prof. Luigi Laporte',
    seats: null, specs: ['OPS'], type: 'elective', conflictGroup: null,
    review: {
      learningDepth: 5, workload: 'Moderate-High', careerRelevance: 4,
      whatYouLearn: ['Project Management Fundamentals', 'WBS, PERT, GERT, CPM', 'Planning, Scheduling, Forecasting'],
      highlights: [
        'Prof is a seasoned practitioner, has held PMO positions at major firms',
        'Steering Committee presentation, 3 quizzes, Final Exam',
      ],
      lowlights: [
        'Can feel a bit dull and boring at times, too technical and quants heavy',
        'Professor is short tempered',
      ],
      summary: 'Great if you are new to Project Mgmt. Requires a lot of self learning. Recommended.',
    },
  },

  // Block 31 Week 2 — Mar 15  (free week)
  {
    id: 45, term: 6, week: 38,
    startDate: '2027-03-15', endDate: '2027-03-19',
    dates: 'Mar 15–19', block: null,
    name: 'Free Week',
    faculty: '', seats: null, specs: [], type: 'free', conflictGroup: null, review: null,
  },

  // Block 32 Week 1 — Mar 22
  {
    id: 46, term: 6, week: 39,
    startDate: '2027-03-22', endDate: '2027-03-26',
    dates: 'Mar 22–26', block: 32,
    name: 'Digital Strategy & Marketing',
    faculty: 'Prof. Srinivas Pingali',
    seats: null, specs: ['ENT', 'ECOM', 'MKT'], type: 'elective', conflictGroup: null,
    review: {
      learningDepth: 1, workload: 'Moderate-High', careerRelevance: 2,
      whatYouLearn: ['Digital Transformation: Overview', 'Different Components of DT', 'Customer Experience & Digital Mindset'],
      highlights: [
        'The course is designed to finish well before 10 days, hence lots of breaks',
      ],
      lowlights: [
        'The cases were boring, and the lectures were stale. The professor really didn\'t teach much',
        'Daily cases & in-class activities (Best of 5 considered for grading)',
      ],
      summary: 'Would not recommend if the same professor is teaching this course.',
    },
  },

  // Block 32 Week 2 — Mar 29
  {
    id: 47, term: 6, week: 40,
    startDate: '2027-03-29', endDate: '2027-04-02',
    dates: 'Mar 29–Apr 2', block: 32,
    name: 'ML OPS',
    faculty: 'Prof. Shankar Prakash',
    seats: null, specs: ['OPS'], type: 'elective', conflictGroup: null,
    review: null,
  },
];

export const MANDATORY_IDS = new Set(
  ALL_COURSES.filter(c => c.type === 'mandatory').map(c => c.id),
);

export const WAW_IDS = new Set(
  ALL_COURSES.filter(c => c.type === 'waw').map(c => c.id),
);

export function getElectives() {
  return ALL_COURSES.filter(c => c.type === 'elective');
}

export function coursesByTerm(term: 4 | 5 | 6) {
  return ALL_COURSES.filter(c => c.term === term);
}

export function coursesByWeek(term: 4 | 5 | 6, week: number) {
  return ALL_COURSES.filter(c => c.term === term && c.week === week);
}

export function normalizeWorkload(w: string): { label: string; color: string; bg: string } {
  const l = w.toLowerCase();
  if (l.includes('heavy') || l === 'high') return { label: 'High', color: '#b71c1c', bg: '#ffebee' };
  if (l.includes('moderate-high') || l.includes('moderate - high')) return { label: 'Mod-High', color: '#e65100', bg: '#fff3e0' };
  if (l.includes('moderate-low') || l.includes('moderate - low')) return { label: 'Mod-Low', color: '#2e7d32', bg: '#e8f5e9' };
  if (l.includes('moderate')) return { label: 'Medium', color: '#f57f17', bg: '#fff8e1' };
  if (l.includes('low-moderate') || l.includes('low - moderate')) return { label: 'Low-Med', color: '#0288d1', bg: '#e1f5fe' };
  return { label: 'Low', color: '#2e7d32', bg: '#e8f5e9' };
}
