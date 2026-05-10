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
    timings: [{ slot: '17:30–20:30', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }],
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
    seats: 60, specs: ['ECOM', 'OPS'], type: 'elective', conflictGroup: null,
    timings: [{ slot: '09:00–12:00', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }],
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
    timings: [{ slot: '13:30–16:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }],
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
    timings: [{ slot: '09:00–12:00', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }],
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
  // WaW — Block 17
  {
    id: 101, term: 4, week: 3,
    startDate: '2026-07-13', endDate: '2026-07-26',
    dates: 'Jul 13–26', block: 17,
    name: 'AI Tools for Managers',
    code: 'AITM',
    faculty: 'TBD',
    seats: null, specs: [], type: 'waw', conflictGroup: null,
    timings: [
      { slot: '13:30–15:00', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu'], part: 'A' },
      { slot: '17:00–18:30', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu'], part: 'B' },
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
      { slot: '13:30–16:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'B' },
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
    seats: 120, specs: ['ENT', 'LSTR'], type: 'elective', conflictGroup: null,
    timings: [
      { slot: '09:00–12:00', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'A' },
      { slot: '13:30–16:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'B' },
    ],
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

  {
    id: 7, term: 4, week: 5,
    startDate: '2026-07-27', endDate: '2026-08-21',
    dates: 'Jul 27–Aug 21', block: 18,
    name: 'Financial Statement Analysis',
    code: 'FSAT',
    faculty: 'Prof. Prabhu Venkatachalam',
    seats: 60, specs: ['FIN'], type: 'elective', conflictGroup: 'T4FSA',
    timings: [{ slot: '09:00–12:00', room: 'S02', days: ['Mon', 'Wed', 'Fri'] }],
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

  // Block 19 (Aug 10 – Aug 23) — BECB, MHLG, + FSAT continues
  {
    id: 8, term: 4, week: 7,
    startDate: '2026-08-10', endDate: '2026-08-23',
    dates: 'Aug 10–23', block: 19,
    name: 'Building an E-Commerce Business',
    code: 'BECB',
    faculty: 'Prof. Lil Mohan',
    seats: 120, specs: ['ENT', 'ECOM'], type: 'elective', conflictGroup: 'T4W7',
    timings: [
      { slot: '13:30–16:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'A' },
      { slot: '17:00–20:00', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], part: 'B' },
    ],
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
    name: 'Machine Learning',
    code: 'MHLG',
    faculty: 'Prof. Meenakshi Balakrishna',
    seats: 60, specs: ['MKT', 'OPS'], type: 'elective', conflictGroup: 'T4W7',
    timings: [{ slot: '13:30–16:30', room: 'S02', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }],
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

  // Block 19 Week 2 — Aug 17
  {
    id: 10, term: 4, week: 8,
    startDate: '2026-08-17', endDate: '2026-08-21',
    dates: 'Aug 17–21', block: null,
    name: 'Financial Statement Analysis (Run 2)',
    code: 'FSAT',
    faculty: 'Prof. Prabhu Venkatachalam',
    seats: 60, specs: ['FIN'], type: 'elective', conflictGroup: 'T4FSA',
    timings: [{ slot: '09:00–12:00', room: 'S02', days: ['Mon', 'Wed', 'Fri'] }],
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

  // Exam Week — Aug 24
  {
    id: 11, term: 4, week: 9,
    startDate: '2026-08-24', endDate: '2026-08-28',
    dates: 'Aug 24–28', block: null,
    name: 'Exam Week',
    faculty: '', seats: null, specs: [], type: 'exam', conflictGroup: null, review: null,
  },

  // Block 20 Week 1 — Aug 31  (mandatory)
  {
    id: 12, term: 4, week: 10,
    startDate: '2026-08-31', endDate: '2026-09-13',
    dates: 'Aug 31–Sep 13', block: 20,
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
    name: 'Persuasive Writing',
    code: 'PSWT',
    faculty: 'TBD',
    seats: null, specs: [], type: 'waw', conflictGroup: null,
    timings: [
      { slot: '09:00–10:30', room: 'S03', days: ['Mon', 'Tue', 'Wed', 'Thu'], part: 'A' },
      { slot: '13:30–15:00', room: 'S03', days: ['Mon', 'Tue', 'Wed', 'Thu'], part: 'B' },
    ],
    review: null,
  },

  // Block 20 Week 2 — Sep 7  (free week)
  {
    id: 13, term: 4, week: 11,
    startDate: '2026-09-07', endDate: '2026-09-11',
    dates: 'Sep 7–11', block: null,
    name: 'Free Week',
    faculty: '', seats: null, specs: [], type: 'free', conflictGroup: null, review: null,
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
      { slot: '09:00–12:00', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], part: 'A' },
      { slot: '13:30–16:30', room: 'S04', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], part: 'B' },
    ],
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
  // WaW — Block 21
  {
    id: 103, term: 4, week: 12,
    startDate: '2026-09-14', endDate: '2026-09-27',
    dates: 'Sep 14–27', block: 21,
    name: 'Design Thinking',
    code: 'DSTK',
    faculty: 'TBD',
    seats: null, specs: [], type: 'waw', conflictGroup: null,
    timings: [
      { slot: '13:30–16:30', room: 'S03', days: ['Fri', 'Sat'], part: 'A' },
      { slot: '17:00–20:00', room: 'S03', days: ['Fri', 'Sat'], part: 'B' },
    ],
    review: null,
  },

  {
    id: 15, term: 4, week: 12,
    startDate: '2026-09-14', endDate: '2026-09-27',
    dates: 'Sep 14–27', block: 21,
    name: 'Managing High Performance Teams',
    code: 'MHPT',
    faculty: 'Prof. Pooja Mishra',
    seats: 60, specs: ['ENT', 'LSTR'], type: 'elective', conflictGroup: null,
    timings: [{ slot: '09:00–12:00', room: 'S03', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }],
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

  // Block 22 Week 1 — Sep 28
  {
    id: 16, term: 5, week: 14,
    startDate: '2026-09-28', endDate: '2026-10-02',
    dates: 'Sep 28–Oct 2', block: 22,
    name: 'Operations Strategy',
    faculty: 'Dr. Santiago Kraiselburd',
    seats: null, specs: ['ENT', 'ECOM', 'LSTR', 'OPS'], type: 'elective', conflictGroup: null,
    review: {
      learningDepth: 5, workload: 'Moderate-High', careerRelevance: 5,
      whatYouLearn: ['Industry 4.0 (Agri + Biotech)', 'Diagnosis', 'Agility, Planning & Execution'],
      highlights: [
        'Strong case-based learning',
        'CP, project and exam',
        'Highly interactive, discussion-led classes',
      ],
      lowlights: [],
      summary: 'Very interactive course — loved the professor, and a must-take for the specialization.',
    },
  },
  // WaW — Block 22
  {
    id: 104, term: 5, week: 14,
    startDate: '2026-09-28', endDate: '2026-10-02',
    dates: 'Sep 28–Oct 2', block: 22,
    name: 'Responsible AI & Governance',
    faculty: 'TBD',
    seats: null, specs: [], type: 'waw', conflictGroup: null, review: null,
  },

  // Block 22 Week 2 — Oct 5
  {
    id: 17, term: 5, week: 15,
    startDate: '2026-10-05', endDate: '2026-10-09',
    dates: 'Oct 5–9', block: null,
    name: 'Valuation',
    faculty: 'Sughosh M',
    seats: null, specs: ['FIN'], type: 'elective', conflictGroup: null,
    review: null,
  },

  // Block 23 Week 1 — Oct 12
  {
    id: 18, term: 5, week: 16,
    startDate: '2026-10-12', endDate: '2026-10-16',
    dates: 'Oct 12–16', block: 23,
    name: 'Technology in Operations',
    faculty: 'Prof. Saravanan Kesavan & Prof. Probal Mojumder',
    seats: null, specs: ['ECOM', 'OPS'], type: 'elective', conflictGroup: null,
    review: {
      learningDepth: 4, workload: 'Moderate', careerRelevance: 4,
      whatYouLearn: ['Demand Forecasting & Logistics', 'Network Effects', 'Emerging Tech (3D printing, platforms, etc.)'],
      highlights: [
        'Covers modern tech trends in operations',
        'CP, group assignments and no exam',
        'Mandatory day field visit included',
      ],
      lowlights: [
        'Field trip can be exhausting',
      ],
      summary: 'Useful course with hardly any workload and practical exposure.',
    },
  },

  // Block 23 Week 2 — Oct 19
  {
    id: 19, term: 5, week: 17,
    startDate: '2026-10-19', endDate: '2026-10-23',
    dates: 'Oct 19–23', block: null,
    name: 'Corporate Law',
    faculty: 'Kishu Daswani',
    seats: null, specs: ['ENT', 'LSTR'], type: 'elective', conflictGroup: 'T5W17',
    review: null,
  },
  {
    id: 20, term: 5, week: 17,
    startDate: '2026-10-19', endDate: '2026-10-23',
    dates: 'Oct 19–23', block: null,
    name: 'Corporate Innovation & Venture Building',
    faculty: 'Srikant Sastri',
    seats: null, specs: ['ENT'], type: 'elective', conflictGroup: 'T5W17',
    review: {
      learningDepth: 4, workload: 'Heavy', careerRelevance: 4,
      whatYouLearn: ['MVP Building', 'User feedback and market research', 'Different pitches to investors/customers'],
      highlights: [
        'Forces you to execute on your ideas over 3 months',
        'Guest lectures: Senior people from great companies or founders themselves. Interactive.',
        'Got us to actually start conversations with potential customers, and then redefine our idea',
      ],
      lowlights: [
        'Will have to strategically form your study group (75% grades is group work)',
        'The staggered format can make it harder to manage and disrupt the flow',
      ],
      summary: 'Should take it if you want to experiment with an idea in a structured way.',
    },
  },

  // Block 24 Week 1 — Oct 26
  {
    id: 21, term: 5, week: 18,
    startDate: '2026-10-26', endDate: '2026-10-30',
    dates: 'Oct 26–30', block: 24,
    name: 'Advanced Marketing Strategy',
    faculty: 'Prof. Wilfred Amaldoss',
    seats: null, specs: ['ECOM', 'MKT'], type: 'elective', conflictGroup: null,
    review: {
      learningDepth: 3, workload: 'Moderate', careerRelevance: 3,
      whatYouLearn: ['Demand Elasticity Economic Value', 'Multi-sided markets and managing product portfolios'],
      highlights: [
        'Excellent cases — 1 intl + 1 Indian per class',
        'Practical exposure to conjoint analysis through assignments',
        'Extremely high quality — great concepts + guest lectures',
      ],
      lowlights: [],
      summary: 'One of the most relevant marketing courses at BITSoM. No filler topics, excellent class notes.',
    },
  },
  // WaW — Block 24
  {
    id: 105, term: 5, week: 18,
    startDate: '2026-10-26', endDate: '2026-10-30',
    dates: 'Oct 26–30', block: 24,
    name: 'Expression through Theatre',
    faculty: 'TBD',
    seats: null, specs: [], type: 'waw', conflictGroup: null, review: null,
  },

  // Block 24 Week 2 — Nov 2
  {
    id: 22, term: 5, week: 19,
    startDate: '2026-11-02', endDate: '2026-11-06',
    dates: 'Nov 2–6', block: null,
    name: 'First Principles of Consulting',
    faculty: 'TBD',
    seats: null, specs: ['LSTR'], type: 'elective', conflictGroup: null,
    review: {
      learningDepth: 1, workload: 'High', careerRelevance: 2,
      whatYouLearn: ['Structured Problem Solving', 'Insights into the Telecom Industry'],
      highlights: [
        'The prof is knowledgeable',
      ],
      lowlights: [
        'This course was just a longer version of SPS/CAT',
        'Ironically, the course lacked structure. Daily assignments & rants',
        'Would not recommend — Professor kept ranting',
      ],
      summary: 'Not recommended. Course was heavy in terms of workload.',
    },
  },

  // Exam Week — Nov 9
  {
    id: 23, term: 5, week: 20,
    startDate: '2026-11-09', endDate: '2026-11-13',
    dates: 'Nov 9–13', block: null,
    name: 'Exam Week',
    faculty: '', seats: null, specs: [], type: 'exam', conflictGroup: null, review: null,
  },

  // Free Week — Nov 16
  {
    id: 24, term: 5, week: 21,
    startDate: '2026-11-16', endDate: '2026-11-20',
    dates: 'Nov 16–20', block: null,
    name: 'Free Week',
    faculty: '', seats: null, specs: [], type: 'free', conflictGroup: null, review: null,
  },

  // Block 25 Week 1 — Nov 23
  {
    id: 25, term: 5, week: 22,
    startDate: '2026-11-23', endDate: '2026-11-27',
    dates: 'Nov 23–27', block: 25,
    name: 'Entrepreneurial Finance & Fundraising',
    faculty: 'Amit Bubna',
    seats: null, specs: ['ENT', 'FIN'], type: 'elective', conflictGroup: 'T5W22',
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
        'Introduced VC and PE, but circled back to options somehow each time',
      ],
      summary: 'Would suggest to skip this course since it doesn\'t follow the name.',
    },
  },
  {
    id: 26, term: 5, week: 22,
    startDate: '2026-11-23', endDate: '2026-11-27',
    dates: 'Nov 23–27', block: 25,
    name: 'Strategic Brand Management',
    faculty: 'Shailendra (Shelley) Jain',
    seats: null, specs: ['ECOM', 'MKT'], type: 'elective', conflictGroup: 'T5W22',
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
        'Group project-phased (60%), Individual assignment (20%), CP (20%) but daily presentations',
      ],
      summary: 'Fun prof, but limited takeaways.',
    },
  },
  // WaW — Block 25
  {
    id: 106, term: 5, week: 22,
    startDate: '2026-11-23', endDate: '2026-11-27',
    dates: 'Nov 23–27', block: 25,
    name: 'ESG',
    faculty: 'TBD',
    seats: null, specs: [], type: 'waw', conflictGroup: null, review: null,
  },

  // Block 25 Week 2 — Nov 30
  {
    id: 27, term: 5, week: 23,
    startDate: '2026-11-30', endDate: '2026-12-04',
    dates: 'Nov 30–Dec 4', block: null,
    name: 'Corp Innovation & Venture Building (Staggered)',
    faculty: 'Srikant Sastri',
    seats: null, specs: ['ENT'], type: 'elective', conflictGroup: null,
    review: {
      learningDepth: 4, workload: 'Heavy', careerRelevance: 4,
      whatYouLearn: ['MVP Building', 'User feedback and market research', 'Different pitches to investors/customers'],
      highlights: [
        'Forces you to execute on your ideas over 3 months',
        'Guest lectures: Senior people from great companies or founders themselves',
      ],
      lowlights: [
        '75% grades is group work — strategic group formation needed',
        'Staggered format can disrupt the flow',
      ],
      summary: 'Should take it if you want to experiment with an idea in a structured way.',
    },
  },

  // Block 26 Week 1 — Dec 7
  {
    id: 28, term: 5, week: 24,
    startDate: '2026-12-07', endDate: '2026-12-11',
    dates: 'Dec 7–11', block: 26,
    name: 'International Marketing',
    faculty: 'Venkatesh (Venky) Shankar',
    seats: null, specs: ['MKT'], type: 'elective', conflictGroup: 'T5W24',
    review: {
      learningDepth: 3, workload: 'Moderate', careerRelevance: 2,
      whatYouLearn: ['Market entry mechanisms', 'Market Expansion frameworks', 'International Pricing mechanism', 'International Sales & Distribution'],
      highlights: [
        'Marketing frameworks, in-class exercises',
        'One Group Project (50%), Mid term assignment (30%), CP (20%)',
        'Compulsory for Marketing — frameworks helpful for international expansion projects',
      ],
      lowlights: [
        'Limited quantitative depth',
        'Peer review is very important',
        'More like good talking points/awareness than deep learning',
      ],
      summary: 'Compulsory for Marketing. Good frameworks for a project looking at international expansion.',
    },
  },
  {
    id: 29, term: 5, week: 24,
    startDate: '2026-12-07', endDate: '2026-12-11',
    dates: 'Dec 7–11', block: 26,
    name: 'Mergers & Acquisitions',
    faculty: 'Prof. Sughosh Moharikar',
    seats: null, specs: ['FIN'], type: 'elective', conflictGroup: 'T5W24',
    review: {
      learningDepth: 5, workload: 'Moderate', careerRelevance: 5,
      whatYouLearn: ['Mergers vs Acquisitions', 'Cash vs Share', 'LBO, Demerger', 'Hostile Takeovers & Defences'],
      highlights: [
        'Prof has direct deal experience, will discuss M&A transactions where he was involved',
        'Class discussions are interesting, course does not involve a lot of excel work',
        'CP, Quiz, Case Write-ups and End Term Exam',
      ],
      lowlights: [
        'Strictly avoid using devices in class',
      ],
      summary: 'Would recommend — rare relatively chill FIN course at BITSoM. Prof is very engaging.',
    },
  },

  // Block 26 Week 2 — Dec 14
  {
    id: 30, term: 5, week: 25,
    startDate: '2026-12-14', endDate: '2026-12-18',
    dates: 'Dec 14–18', block: null,
    name: 'Service Operations',
    faculty: 'Prof. Vishal Ahuja',
    seats: null, specs: ['ECOM', 'OPS'], type: 'elective', conflictGroup: null,
    review: {
      learningDepth: 5, workload: 'High', careerRelevance: 3,
      whatYouLearn: ['Service Models', 'C-ID, Service Innovations', 'Service Quality Mgmt: DEA, Six Sigma'],
      highlights: [
        'THE BEST Operations prof in 2nd year, quality class discussions',
        'All projects are 2-week CLPs',
        '3 of 4 quizzes, Group case reports (7), final project, final exam, CP',
      ],
      lowlights: [
        'Very heavy course load, double block not recommended',
        'Ops refresh needed (though prof helps)',
      ],
      summary: 'Best course to learn about services and how they are operationalized. Recommended irrespective of target specialization.',
    },
  },

  // Exam Week — Dec 21
  {
    id: 31, term: 5, week: 26,
    startDate: '2026-12-21', endDate: '2026-12-25',
    dates: 'Dec 21–25', block: null,
    name: 'Exam Week',
    faculty: '', seats: null, specs: [], type: 'exam', conflictGroup: null, review: null,
  },

  // Free Week — Dec 28
  {
    id: 32, term: 5, week: 27,
    startDate: '2026-12-28', endDate: '2027-01-01',
    dates: 'Dec 28–Jan 1', block: null,
    name: 'Free Week',
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
    dates: 'Jan 11–15', block: null,
    name: 'Advanced Corporate Finance',
    faculty: 'N Prabhala',
    seats: null, specs: ['FIN'], type: 'elective', conflictGroup: 'T6W29',
    review: null,
  },
  {
    id: 35, term: 6, week: 29,
    startDate: '2027-01-11', endDate: '2027-01-15',
    dates: 'Jan 11–15', block: null,
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
    seats: null, specs: ['ENT', 'ECOM', 'MKT'], type: 'elective', conflictGroup: null,
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
    dates: 'Jan 25–29', block: null,
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
    dates: 'Jan 25–29', block: null,
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
    dates: 'Feb 8–12', block: null,
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
    dates: 'Mar 1–5', block: null,
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
    dates: 'Mar 29–Apr 2', block: null,
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
