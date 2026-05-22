export type Term1CourseEntry = {
  name: string;
  faculty: string;
  isWaw: boolean;
};

export type Term1WeekData = {
  week: number;
  dates: string;
  startDate: string;
  endDate: string;
  blockLabel: string;
  isExam: boolean;
  courses: Term1CourseEntry[];
};

// Term 1 AY 2026-27 — week-by-week schedule
// Source: Term 1 AY 2026-27 (Tentative Course Structure).xlsx
// Used as a read-only reference overlay in TimetableView (no user selections)
export const TERM1_WEEKS: Term1WeekData[] = [
  {
    week: 1, dates: 'Jun 29 – Jul 5', startDate: '2026-06-29', endDate: '2026-07-05',
    blockLabel: 'Block 1', isExam: false,
    courses: [
      { name: 'Financial Accounting', faculty: 'Sreekrishnan V', isWaw: false },
      { name: 'Operations Management', faculty: 'Fabrizio Salvador', isWaw: false },
      { name: 'Marketing Management', faculty: 'Shehzala & Piyush Kumar', isWaw: false },
      { name: 'Data Visualization', faculty: 'Smitha Rao', isWaw: true },
    ],
  },
  {
    week: 2, dates: 'Jul 6 – Jul 12', startDate: '2026-07-06', endDate: '2026-07-12',
    blockLabel: 'Block 1', isExam: false,
    courses: [
      { name: 'Financial Accounting', faculty: 'Sreekrishnan V', isWaw: false },
      { name: 'Operations Management', faculty: 'Fabrizio Salvador', isWaw: false },
      { name: 'Marketing Management', faculty: 'Shehzala & Piyush Kumar', isWaw: false },
      { name: 'Data Visualization', faculty: 'Smitha Rao', isWaw: true },
    ],
  },
  {
    week: 3, dates: 'Jul 13 – Jul 19', startDate: '2026-07-13', endDate: '2026-07-19',
    blockLabel: 'Block 2', isExam: false,
    courses: [
      { name: 'Financial Accounting', faculty: 'Sreekrishnan V', isWaw: false },
      { name: 'Operations Management', faculty: 'Daniel Corsten', isWaw: false },
      { name: 'Marketing Management', faculty: 'Shehzala & Piyush Kumar', isWaw: false },
    ],
  },
  {
    week: 4, dates: 'Jul 20 – Jul 26', startDate: '2026-07-20', endDate: '2026-07-26',
    blockLabel: 'Block 2', isExam: false,
    courses: [
      { name: 'Financial Accounting', faculty: 'Sreekrishnan V', isWaw: false },
      { name: 'Operations Management', faculty: 'Daniel Corsten', isWaw: false },
      { name: 'Marketing Management', faculty: 'Shehzala & Piyush Kumar', isWaw: false },
    ],
  },
  {
    week: 5, dates: 'Jul 27 – Aug 2', startDate: '2026-07-27', endDate: '2026-08-02',
    blockLabel: 'Exam Week', isExam: true,
    courses: [],
  },
  {
    week: 6, dates: 'Aug 3 – Aug 9', startDate: '2026-08-03', endDate: '2026-08-09',
    blockLabel: 'Block 3', isExam: false,
    courses: [
      { name: 'Financial Accounting', faculty: 'Sreekrishnan V', isWaw: false },
      { name: 'Business Statistics', faculty: 'Parasuram Balasubramanian', isWaw: false },
      { name: 'Finance I', faculty: 'Sudip Gupta & NK Chidambaram', isWaw: false },
      { name: 'Business Presentation Skills', faculty: '', isWaw: true },
    ],
  },
  {
    week: 7, dates: 'Aug 10 – Aug 16', startDate: '2026-08-10', endDate: '2026-08-16',
    blockLabel: 'Block 3', isExam: false,
    courses: [
      { name: 'Financial Accounting', faculty: 'Sreekrishnan V', isWaw: false },
      { name: 'Business Statistics', faculty: 'Parasuram Balasubramanian', isWaw: false },
      { name: 'Finance I', faculty: 'Sudip Gupta & NK Chidambaram', isWaw: false },
      { name: 'Business Presentation Skills', faculty: '', isWaw: true },
    ],
  },
  {
    week: 8, dates: 'Aug 17 – Aug 23', startDate: '2026-08-17', endDate: '2026-08-23',
    blockLabel: 'Block 4', isExam: false,
    courses: [
      { name: 'Financial Accounting', faculty: 'Sreekrishnan V', isWaw: false },
      { name: 'Business Statistics', faculty: 'Parasuram Balasubramanian', isWaw: false },
      { name: 'Finance I', faculty: 'Sudip Gupta & NK Chidambaram', isWaw: false },
      { name: 'Critical Thinking', faculty: 'Ratan Postwalla', isWaw: true },
    ],
  },
  {
    week: 9, dates: 'Aug 24 – Aug 30', startDate: '2026-08-24', endDate: '2026-08-30',
    blockLabel: 'Block 4', isExam: false,
    courses: [
      { name: 'Financial Accounting', faculty: 'Sreekrishnan V', isWaw: false },
      { name: 'Business Statistics', faculty: 'Parasuram Balasubramanian', isWaw: false },
      { name: 'Finance I', faculty: 'Sudip Gupta & NK Chidambaram', isWaw: false },
      { name: 'Critical Thinking', faculty: 'Ratan Postwalla', isWaw: true },
    ],
  },
  {
    week: 10, dates: 'Aug 31 – Sep 6', startDate: '2026-08-31', endDate: '2026-09-06',
    blockLabel: 'Block 4', isExam: false,
    courses: [],
  },
  {
    week: 11, dates: 'Sep 7 – Sep 13', startDate: '2026-09-07', endDate: '2026-09-13',
    blockLabel: 'Block 5', isExam: false,
    courses: [
      { name: 'Business Statistics', faculty: 'Parasuram Balasubramanian', isWaw: false },
      { name: 'Microeconomics', faculty: 'Pallavi Vyas & Ashish Sachdeva', isWaw: false },
      { name: 'Design Thinking', faculty: 'Parameswaran V & Shalini R & Rahul N', isWaw: true },
    ],
  },
  {
    week: 12, dates: 'Sep 14 – Sep 20', startDate: '2026-09-14', endDate: '2026-09-20',
    blockLabel: 'Block 5', isExam: false,
    courses: [
      { name: 'Business Statistics', faculty: 'Parasuram Balasubramanian', isWaw: false },
      { name: 'Microeconomics', faculty: 'Pallavi Vyas & Ashish Sachdeva', isWaw: false },
      { name: 'Design Thinking', faculty: 'Parameswaran V & Shalini R & Rahul N', isWaw: true },
    ],
  },
  {
    week: 13, dates: 'Sep 21 – Sep 27', startDate: '2026-09-21', endDate: '2026-09-27',
    blockLabel: 'Block 6', isExam: false,
    courses: [
      { name: 'Microeconomics', faculty: 'Pallavi Vyas & Ashish Sachdeva', isWaw: false },
    ],
  },
  {
    week: 14, dates: 'Sep 28 – Oct 4', startDate: '2026-09-28', endDate: '2026-10-04',
    blockLabel: 'Block 6', isExam: false,
    courses: [
      { name: 'Microeconomics', faculty: 'Pallavi Vyas & Ashish Sachdeva', isWaw: false },
    ],
  },
];
