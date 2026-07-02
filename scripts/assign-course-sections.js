// Run with: node scripts/assign-course-sections.js         (dry run — prints matches, writes nothing)
//           node scripts/assign-course-sections.js --apply  (writes to Supabase)
//
// Backfills real section (A/B) assignments from registrar seating charts into the
// new `course_sections` table, and adds missing `course_selections` rows for the
// elective (course 5 — Sales & Distribution). Course 101 (code AITM,
// "Winning at Workplace" WaW) is always shown to every student, so it only
// needs a section assignment, never a selection row.
//
// Roster names below were hand-transcribed from scanned/image-only seating chart
// PDFs (no embedded text layer — `pdftotext` confirms this), so some entries are
// best-effort OCR-by-eye. ALWAYS review the dry-run output before running --apply.

const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Load .env.local
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach(line => {
      const [k, ...v] = line.split('=');
      if (k && v.length) process.env[k.trim()] = v.join('=').trim();
    });
}

const SUPABASE_URL = 'https://rtchhbkrzdmfryxxuyih.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');

const COURSE_AIB = 101; // AITM / "Winning at Workplace" (WaW, Block 17) — holds the "AI in Business" seating-chart sections per user decision
const COURSE_SADT = 5;  // Sales & Distribution (elective)

// ── Rosters (hand-transcribed from Subject Sections /*.pdf) ────────────────

const ROSTERS = [
  {
    courseId: COURSE_AIB, section: 'A',
    names: [
      'Aagam Shah', 'Anish Banerjee', 'Mukund Sharma', 'Lakshmi Sarma S', 'Devanshi Khurana',
      'Jess Walter Rumao', 'Shikhar Chaturvedi', 'Piyush Kaushik', 'Aditya Menon', 'B Shruti Chandra',
      'Mahak Rajesh Kalani', 'Ritika Sharma', 'Rahul Vishal Mishra', 'Khushi Garg', 'Dhruv Jitendra Krishnani',
      'Padma Sai Sisira Laasya Pallerla', 'Aayush Chugh', 'Pritima Prithvi Singh', 'Naveen Puchakayala',
      'Rithwik Awasthi', 'Prithvi Nagrath', 'Rohan Aby P', 'Shivani R Neelakandan', 'Aakarsh Ranjan',
      'Mudita Agarwal', 'Kanchan', 'Aaditya Laxman Mali', 'Lovy Garg', 'Sarthak Raghuvanshi',
      'Akarsh Katiyar', 'Rithi Varsha V', 'Adithya Bontha', 'Ishu Singhal', 'Devyanshi Bhardwaj',
      'K P Aakash', 'M Sai Srikar', 'Kopal Tyagi', 'Arkaprava Ray',
      'Diksha', 'Karen Pinto', 'Saurabh Jayram Shetty', 'Kirti Ajit Bhandari', 'Mahati R',
      'Riya Elizabeth George', 'Dev Dalmia', 'Nisthula Suresh', 'Shashank Jayant Pimpale',
      'Sanket Surendra Rathi', 'Nichiketa Anand', 'Nilanjana Mazumdar', 'Nikita Jayant Gandhi', 'Anshul Sharma',
      'Agrima Jaiswal', 'Akhilesh Nalla', 'Arunima Ghosh', 'Koyena Das', 'Harshvardhan Singh Shekhawat',
      'Khushi Baheti', 'Sainithin Ambati Venkata', 'Khushi Amitkumar Singh', 'Shreshta Ramanand Bhat',
      'Prabhudatta Panda', 'Manan Mitul Mehta', 'Kasula Sumanasa Sharma', 'Priya Singh', 'Mansi Jain',
      'Anushka Bhasin', 'Diya Maini', 'Anoushka Lakshman Krishnan', 'Prachi Garg', 'Shivani Maheshwari',
      'Aromal A', 'Manasvi Shirish Shah', 'Ruturaj Dhairyadhar Bhosale', 'Saurabh Goyal', 'Abhibyakti Singh',
      'Mayank Agrawal', 'Priyanshu Reddy Adama', 'Muskan Setia', 'Anshul Padmachand Pokharna',
    ],
  },
  {
    courseId: COURSE_AIB, section: 'B',
    names: [
      'Arshiya Sehgal', 'Vanshika Gupta', 'Prajakta Dhananjay Bapat', 'Nidhi Rajendra', 'Tushar Gupta',
      'Pratham Gupta', 'Yada Nagesh', 'Vasudev Jayachandran Nair', 'Mihira Navva', 'Vidisha Rayaprolu', 'B Srihitha',
      'Vedant Rathi', 'Tarun Raj Singh Shekhawat', 'Sofia Soni', 'Harshit Nagpal', 'Veer Mundhara',
      'Sandeepan Das', 'Sanya Bindlish', 'Samanvay Mereddy', 'Sanskriti Rathore', 'Arpan Mukherjee',
      'Bhumika Kukreja', 'Debarshi Dutta', 'Tweesha Agrawal', 'Sivasankaran Br',
      'Hemasri Vemulapalli', 'Deeksha Chugh', 'Prathamesh Sadanand Satam', 'Stuti Vikas Sinha', 'Shravanth V G',
      'Nischal Ramesh', 'Vedika Vyas', 'Upasana Rao K', 'Vinamra Pattapu', 'Archana Sajendra',
      'Pavan Kumar Reddy Gangarapu', 'Paurush Tiwari', 'Shourya Bardia', 'Deep Atul Parikh',
      'Shreya Maheshwari', 'Samarth Masih', 'Pratik Singh', 'Dharalee Kesharia', 'Muskan Abrol',
      'Tanya Chitloor', 'Vibhuti Chichra', 'Anurag Saihari Rachamalla', 'Urmila Maganaram Choudhary',
      'Naitik Shailesh Trivedi', 'Anukruti Keshav Valase', 'Naga Venkata Sridhara Sai Jishnu',
      'Yash Kiran Kolhe', 'Pranjal Dubey',
      'Yash Agarwal', 'Siddhi Kabra', 'Sharma Apoorv', 'Varad Nitin Dharap', 'Yash Grover',
      'Akshat Agarwal', 'Muskan Patodia', 'Sanchit Mathur', 'Dhriti Dhruva Mall', 'Malavika Venu Menon',
      'Trisha Thatipamula', 'Vipin Syam', 'Supraja Manivannan', 'Harsh Singh',
      'Shantanu Singh Parihar', 'Preksha Mangla', 'Reeva Shirish Bahalkar', 'Akshitha Reddy Annapureddy',
      'S Vigneshwaran Naidu', 'Lavanya Nandwani', 'Aliya Rajpal', 'Dushyant Bhardwaj', 'Uma Madhuri Bandaru',
      'Vaishnavi Dhake', 'Swathi Shivadasan', 'Shubha Patil', 'Aditi Abrol', 'Krisha Rohit Gohil',
    ],
  },
  {
    courseId: COURSE_SADT, section: 'A',
    names: [
      'Aagam Shah', 'Prachi Garg', 'Muskan Setia',
      'Avinash Naik', 'Pratham Gupta', 'Aayush Chugh', 'Trisha Thatipamula', 'Anushka Bhasin',
      'Lovy Garg', 'Sofia Soni', 'Vedant Rathi', 'Anamika Ghosh', 'Vanshika Gupta',
      'Mansi Jain', 'Harshvardhan Singh Shekhawat', 'Shikhar Chaturvedi',
      'Yash Grover', 'Ritika Sharma', 'Anish Banerjee',
      'Swathi Shivadasan', 'Padma Sai Sisira Laasya Pallerla', 'Nisthula Suresh', 'Khushi Amitkumar Singh',
      'Pritima Prithvi Singh', 'Shivani R Neelakandan', 'Diksha', 'Manan Mitul Mehta', 'Rahul Vishal Mishra',
      'Ishu Singhal', 'Mahati R',
      'Devanshi Khurana', 'Lakshmi Sarma S', 'Kanchan',
      'Prabhudatta Panda', 'Mukund Sharma', 'Abhibyakti Singh',
      'Shivani Maheshwari', 'Veer Mundhara', 'Upasana Rao K', 'M Sai Srikar', 'Supraja Manivannan',
      'Dev Dalmia', 'Aditya Menon', 'Nilanjana Mazumdar',
      'Shreya Maheshwari', 'Aaditya Laxman Mali', 'Adithya Bontha',
      'Nikita Jayant Gandhi', 'Vibhuti Chichra', 'Khushi Baheti', 'Anshul Sharma',
      'Kasula Sumanasa Sharma', 'Diya Maini', 'Karen Pinto', 'Saurabh Jayram Shetty',
      'Ruturaj Dhairyadhar Bhosale',
      'Jess Walter Rumao', 'B Shruti Chandra', 'Sarthak Raghuvanshi', 'Preksha Mangla',
    ],
  },
  {
    courseId: COURSE_SADT, section: 'B',
    names: [
      'Bhumika Kukreja', 'Shravanth V G', 'Dharalee Kesharia',
      'Archana Sajendra', 'Krisha Rohit Gohil', 'Sanchit Mathur', 'Shantanu Singh Parihar', 'Prathamesh Sadanand Satam',
      'Samanvay Mereddy', 'Deeksha Chugh', 'Tushar Gupta', 'Aditi Abrol', 'Sanya Bindlish',
      'Vedika Vyas', 'Tarun Raj Singh Shekhawat', 'Varad Nitin Dharap',
      'Debarshi Dutta', 'Pavan Kumar Reddy Gangarapu', 'Paurush Tiwari',
      'Lavanya Nandwani', 'Mihira Navva', 'S Vigneshwaran Naidu', 'Sandeepan Das', 'Arpan Mukherjee', 'Pratik Singh',
      'Dushyant Bhardwaj', 'Hemasri Vemulapalli', 'Harsh Singh', 'Prajakta Dhananjay Bapat', 'Naitik Shailesh Trivedi',
      'Urmila Maganaram Choudhary', 'Uma Madhuri Bandaru', 'Malavika Venu Menon',
      'Siddhi Kabra', 'B Srihitha', 'Yash Kiran Kolhe',
      'Sharma Apoorv', 'Vaishnavi Dhake', 'Muskan Abrol', 'Shourya Bardia', 'Vipin Syam',
      'Akshitha Reddy Annapureddy', 'Pranjal Dubey', 'Dhriti Dhruva Mall', 'Anukruti Keshav Valase', 'Tanya Chitloor',
      'Muskan Patodia', 'Deep Atul Parikh', 'Arshiya Sehgal', 'Akshat Agarwal',
      'Vidisha Rayaprolu', 'Sanskriti Rathore', 'Reeva Shirish Bahalkar', 'Aliya Rajpal', 'Harshit Nagpal',
      'Naga Venkata Sridhara Sai Jishnu', 'Nidhi Rajendra', 'Vinamra Pattapu', 'Nischal Ramesh',
    ],
  },
];

function normalizeName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Handle email-prefix names like "aayush.chugh2027" → "aayush chugh"
function parseProfileName(name) {
  const n = normalizeName(name);
  if (/\d{4}/.test(n)) {
    return n
      .replace(/\d+$/, '')
      .replace(/\./g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }
  return n;
}

// Hard-coded overrides for roster names that can't be matched algorithmically.
// Maps normalized-roster-name → normalized-profile-name. Found by diffing the
// first dry run's unmatched list against the real profiles table.
const OVERRIDES = {
  'padma sai sisira laasya pallerla': 'laasya pallerla',
  'rithi varsha v': 'rithivarsha v',
  'vasudev jayachandran nair': 'vasudev jayachandran',
  'archana sajendra': 'archana salendra',
  'naga venkata sridhara sai jishnu': 'saijishnu neeli',
  'shantanu singh parihar': 'shantanu singh',
};

function findMatch(rawRosterName, profileMap) {
  const rosterNorm = normalizeName(rawRosterName);

  const overrideKey = rosterNorm;
  if (OVERRIDES[overrideKey] && profileMap.has(OVERRIDES[overrideKey])) {
    return profileMap.get(OVERRIDES[overrideKey]);
  }

  if (profileMap.has(rosterNorm)) return profileMap.get(rosterNorm);

  const rosterWords = rosterNorm.split(' ').filter(Boolean);
  const rosterFirst = rosterWords[0];
  const rosterLast = rosterWords[rosterWords.length - 1];
  const sigTokens = rosterWords.filter(t => t.length >= 3);

  for (const [profileName, profileData] of profileMap) {
    const profileWords = profileName.split(' ').filter(Boolean);
    const profileSet = new Set(profileWords);
    const profileFirst = profileWords[0];
    const profileLast = profileWords[profileWords.length - 1];

    if (sigTokens.length > 0 && sigTokens.every(t => profileSet.has(t))) return profileData;
    if (rosterFirst === profileFirst && rosterLast === profileLast) return profileData;
    if (
      rosterFirst.length >= 3 && rosterLast.length >= 3 &&
      profileSet.has(rosterFirst) && profileSet.has(rosterLast)
    ) return profileData;
    if (profileWords.length === 1 && rosterFirst === profileFirst) return profileData;
    if (profileWords.length === 1 && rosterFirst.length >= 4 && profileWords[0] === rosterFirst) return profileData;
  }

  return null;
}

async function main() {
  console.log(APPLY ? '⚠️  APPLY MODE — this will write to Supabase\n' : '🔍 DRY RUN — no writes will be made (pass --apply to write)\n');

  const { data: profiles, error: profilesErr } = await supabase.from('profiles').select('id, name');
  if (profilesErr) {
    console.error('❌ Failed to fetch profiles:', profilesErr.message);
    process.exit(1);
  }
  console.log(`👥 Found ${profiles.length} profiles in database\n`);

  const profileMap = new Map(); // normalized parsed name → { id, name }
  for (const p of profiles) {
    profileMap.set(parseProfileName(p.name), { id: p.id, name: p.name });
  }

  const { data: existingSelections, error: selErr } = await supabase
    .from('course_selections')
    .select('user_id')
    .eq('course_id', COURSE_SADT);
  if (selErr) {
    console.error('❌ Failed to fetch existing course_selections:', selErr.message);
    process.exit(1);
  }
  const alreadySelectedSadt = new Set(existingSelections.map(r => r.user_id));

  const courseSectionRows = [];
  const courseSelectionRows = [];
  const matchedByProfile = new Map(); // profile.id → [{courseId, section}]
  let totalUnmatched = 0;

  for (const roster of ROSTERS) {
    console.log(`\n── Course ${roster.courseId} · Section ${roster.section} (${roster.names.length} names) ──`);
    const matched = [];
    const unmatched = [];

    for (const rawName of roster.names) {
      const profile = findMatch(rawName, profileMap);
      if (profile) {
        matched.push({ rawName, profile });
        courseSectionRows.push({ user_id: profile.id, course_id: roster.courseId, section: roster.section });
        if (roster.courseId === COURSE_SADT && !alreadySelectedSadt.has(profile.id)) {
          courseSelectionRows.push({ user_id: profile.id, course_id: COURSE_SADT });
        }
        const list = matchedByProfile.get(profile.id) ?? [];
        list.push({ courseId: roster.courseId, section: roster.section });
        matchedByProfile.set(profile.id, list);
      } else {
        unmatched.push(rawName);
      }
    }

    matched.forEach(({ rawName, profile }) => console.log(`  ✅ ${rawName}  →  ${profile.name} (${profile.id})`));
    if (unmatched.length > 0) {
      totalUnmatched += unmatched.length;
      console.log(`  ❌ Unmatched (${unmatched.length}):`);
      unmatched.forEach(n => console.log(`     - ${n}`));
    }
    console.log(`  Matched ${matched.length} / ${roster.names.length}`);
  }

  // Flag profiles matched in an unexpected number of rosters (should be 1 per
  // course they're in — at most 2 total if they're in both ABMA and SADT).
  console.log('\n── Sanity check: profiles matched across rosters ──');
  let anomalies = 0;
  for (const [profileId, list] of matchedByProfile) {
    const byCourse = {};
    list.forEach(l => { byCourse[l.courseId] = (byCourse[l.courseId] ?? 0) + 1; });
    const dupCourse = Object.entries(byCourse).find(([, count]) => count > 1);
    if (dupCourse) {
      anomalies++;
      const name = profiles.find(p => p.id === profileId)?.name;
      console.log(`  ⚠️  ${name} matched in course ${dupCourse[0]} more than once — appears in both Section A and B rosters?`);
    }
  }
  if (anomalies === 0) console.log('  none found');

  console.log(`\n── Planned writes ──`);
  console.log(`  course_sections upserts: ${courseSectionRows.length}`);
  console.log(`  course_selections inserts (course ${COURSE_SADT} only, missing rows): ${courseSelectionRows.length}`);
  console.log(`\nTotal unmatched across all rosters: ${totalUnmatched}`);

  if (!APPLY) {
    console.log('\n🔍 Dry run complete — no writes made. Review the lists above.');
    console.log('   Fix unmatched names (add to OVERRIDES or fix the roster spelling), then re-run.');
    console.log('   Once clean, run: node scripts/assign-course-sections.js --apply');
    return;
  }

  if (totalUnmatched > 0 && !FORCE) {
    console.error(`\n❌ Refusing to apply: ${totalUnmatched} unmatched name(s). Fix matching, or pass --force if you've confirmed they simply have no profile yet.`);
    process.exit(1);
  }
  if (totalUnmatched > 0 && FORCE) {
    console.log(`\n⚠️  Proceeding with ${totalUnmatched} unmatched name(s) left out (--force) — reviewed and confirmed as students with no profile yet.`);
  }

  console.log('\n⬆️  Writing course_sections...');
  const { error: csErr } = await supabase
    .from('course_sections')
    .upsert(courseSectionRows, { onConflict: 'user_id,course_id' });
  if (csErr) {
    console.error('❌ course_sections upsert failed:', csErr.message);
    process.exit(1);
  }
  console.log(`  ✅ Upserted ${courseSectionRows.length} course_sections rows`);

  if (courseSelectionRows.length > 0) {
    console.log('\n⬆️  Writing course_selections...');
    const { error: selInsertErr } = await supabase
      .from('course_selections')
      .upsert(courseSelectionRows, { onConflict: 'user_id,course_id' });
    if (selInsertErr) {
      console.error('❌ course_selections upsert failed:', selInsertErr.message);
      process.exit(1);
    }
    console.log(`  ✅ Upserted ${courseSelectionRows.length} course_selections rows`);
  }

  console.log('\n🎉 Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
