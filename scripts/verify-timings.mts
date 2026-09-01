import { ALL_COURSES } from '../data/courses';
import { generateScheduleICS } from '../lib/calendar';

// Expected class dates per course code, transcribed independently from
// "Term 5 (Tentative Time Table).xlsx" (and the Term 4 sheet for FSAT).
const EXPECTED: Record<string, string[]> = {
  OPST: ['0928', '0929', '0930', '1001', '1003', '1006', '1007', '1008', '1009', '1010'],
  VALU: ['0928', '0929', '0930', '1001', '1003', '1006', '1007', '1008', '1009', '1010'],
  RAIG: ['0928', '0929', '0930', '1001', '1006', '1007', '1008', '1009'],
  TOPS: ['1012', '1013', '1014', '1015', '1016', '1017', '1019', '1021', '1022', '1023'],
  CLAW: ['1012', '1013', '1014', '1015', '1016', '1017', '1019', '1021', '1022', '1023'],
  AMST: ['1026', '1027', '1028', '1029', '1030', '1102', '1103', '1104', '1105', '1106'],
  DGTK: ['1026', '1027', '1028', '1029', '1102', '1103', '1104', '1105'],
  FDEM: ['1026', '1027', '1028', '1029', '1030', '1102', '1103', '1104', '1105', '1106'],
  ENFF: ['1123', '1124', '1125', '1126', '1127', '1130', '1201', '1202', '1203', '1204'],
  SBRM: ['1123', '1124', '1125', '1126', '1127', '1130', '1201', '1202', '1203', '1204'],
  ESGV: ['1126', '1127', '1128', '1130', '1201', '1202', '1203', '1204'],
  INMK: ['1208', '1209', '1210', '1211', '1212', '1214', '1215', '1216', '1217', '1218'],
  MGAQ: ['1207', '1208', '1209', '1210', '1211', '1214', '1215', '1216', '1217', '1218'],
  SVOP: ['1207', '1208', '1209', '1210', '1211', '1214', '1215', '1216', '1217', '1218'],
  // CIVB has two rows (blocks 23 and 25); checked as a union below.
  CIVB: ['1012', '1013', '1014', '1123', '1124', '1125'],
  // Term 4 regression guard: FSAT spans blocks 18 and 19.
  FSAT: ['0730', '0731', '0803', '0804', '0806', '0812', '0814', '0817', '0818', '0820'],
  // Blocks 20-21, transcribed from the revised block timetables
  // ("Term 4, Block 20 new.pdf" / "Term 4, Block 21 new.pdf").
  ABMA: ['0831', '0901', '0902', '0903', '0904', '0907', '0908', '0909', '0910', '0911'],
  PWMC: ['0831', '0901', '0902', '0903', '0907', '0908', '0909', '0910'],
  // Block 21 week 1 opens on Tue Sep 15 — Mon Sep 14 is Ganesh Chaturthi.
  PMMC: ['0915', '0916', '0917', '0918', '0919', '0921', '0922', '0923', '0924', '0925'],
  MHPT: ['0915', '0916', '0917', '0918', '0919', '0921', '0922', '0923', '0924', '0925'],
};

let failures = 0;
for (const [code, expected] of Object.entries(EXPECTED)) {
  const rows = ALL_COURSES.filter((c) => c.code === code);
  const ics = generateScheduleICS(rows);
  const got = [...new Set([...ics.matchAll(/DTSTART:\d{4}(\d{4})/g)].map((m) => m[1]))].sort();
  const want = [...new Set(expected)].sort();
  const missing = want.filter((d) => !got.includes(d));
  const extra = got.filter((d) => !want.includes(d));
  const ok = missing.length === 0 && extra.length === 0;
  if (!ok) failures++;
  console.log(
    `${ok ? 'OK  ' : 'FAIL'} ${code.padEnd(5)} ${String(got.length).padStart(2)} days` +
      (ok ? '' : `  missing=[${missing}] extra=[${extra}]`),
  );
}
console.log(failures === 0 ? '\nAll session dates match the timetable.' : `\n${failures} course(s) mismatched.`);
