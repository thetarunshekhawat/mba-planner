// Run with: node scripts/upload-outlines.js
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local

const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Load .env.local manually
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
  console.error('\n❌ Missing SUPABASE_SERVICE_ROLE_KEY');
  console.error('   1. Go to: https://supabase.com/dashboard/project/rtchhbkrzdmfryxxuyih/settings/api');
  console.error('   2. Copy the "service_role" secret key');
  console.error('   3. Add this line to mba-planner/.env.local:');
  console.error('      SUPABASE_SERVICE_ROLE_KEY=<paste your key here>\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = 'course-outlines';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF = 'application/pdf';

// Storage keys are flat `<lowercase-code>.<ext>` with no term prefix, which is safe only
// because no course code is reused across terms. Check that before adding a new term —
// `upsert: true` would silently overwrite the older term's file.
const TERMS = {
  4: {
    dir: join(__dirname, '..', '..', 'Term 4 course outlines'),
    files: [
      { source: 'Account Based Marketing.docx',                          dest: 'abmk.docx', mime: DOCX },
      { source: 'Supply Chain Analytics .docx',                          dest: 'scat.docx', mime: DOCX },
      { source: 'Global_Finance.pdf',                                    dest: 'ifin.pdf',  mime: PDF  },
      { source: 'Sustainable Operations Course.docx',                    dest: 'stop.docx', mime: DOCX },
      { source: 'Sales and Distribution Management 2026-27.docx',        dest: 'sadt.docx', mime: DOCX },
      { source: 'Future of work.pdf',                                    dest: 'fwkj.pdf',  mime: PDF  },
      { source: 'Financial Statement Analysis.docx',                     dest: 'fsat.docx', mime: DOCX },
      { source: 'Building Ecommerce Business 2025-27Course Outline.pdf', dest: 'becb.pdf',  mime: PDF  },
      { source: 'Machine_learning.docx',                                 dest: 'mhlg.docx', mime: DOCX },
      { source: 'AI-in-Business-From-Models-to-Agents.docx',             dest: 'abma.docx', mime: DOCX },
      { source: 'Product Management Course Outline.pdf',                 dest: 'pdmt.pdf',  mime: PDF  },
      { source: 'Managing High Performance Teams.docx',                  dest: 'mhpt.docx', mime: DOCX },
    ],
  },
  5: {
    dir: join(__dirname, '..', '..', 'Term 5 course outlines'),
    files: [
      { source: 'opst.pdf',  dest: 'opst.pdf',  mime: PDF  },
      { source: 'valu.docx', dest: 'valu.docx', mime: DOCX },
      { source: 'tops.pdf',  dest: 'tops.pdf',  mime: PDF  },
      { source: 'claw.pdf',  dest: 'claw.pdf',  mime: PDF  },
      { source: 'civb.pdf',  dest: 'civb.pdf',  mime: PDF  },
      { source: 'amst.pdf',  dest: 'amst.pdf',  mime: PDF  },
      { source: 'fdem.docx', dest: 'fdem.docx', mime: DOCX },
      { source: 'enff.pdf',  dest: 'enff.pdf',  mime: PDF  },
      { source: 'sbrm.pdf',  dest: 'sbrm.pdf',  mime: PDF  },
      { source: 'inmk.pdf',  dest: 'inmk.pdf',  mime: PDF  },
      { source: 'mgaq.pdf',  dest: 'mgaq.pdf',  mime: PDF  },
      { source: 'svop.pdf',  dest: 'svop.pdf',  mime: PDF  },
    ],
  },
};

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Could not list buckets: ${error.message}`);
  if (buckets.some(b => b.name === BUCKET)) {
    console.log(`ℹ️  Bucket "${BUCKET}" already exists`);
    return;
  }
  // Private by design — migration 014 locked these down; files are served through
  // /api/files, which mints a short-lived signed URL for authenticated users only.
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: false });
  if (createErr) throw new Error(`Failed to create bucket: ${createErr.message}`);
  console.log(`✅ Created private bucket "${BUCKET}"`);
}

async function uploadFile(dir, { source, dest, mime }) {
  const filePath = join(dir, source);
  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }
  const buffer = readFileSync(filePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(dest, buffer, { contentType: mime, upsert: true });
  if (error) {
    console.error(`❌ ${dest}: ${error.message}`);
  } else {
    console.log(`✅ ${dest}`);
  }
}

async function main() {
  // node scripts/upload-outlines.js            → every term
  // node scripts/upload-outlines.js --term 5   → just Term 5
  const termArg = process.argv.indexOf('--term');
  const wanted = termArg !== -1 ? [process.argv[termArg + 1]] : Object.keys(TERMS);

  for (const term of wanted) {
    if (!TERMS[term]) throw new Error(`Unknown term "${term}". Known: ${Object.keys(TERMS).join(', ')}`);
  }

  console.log('\nUploading course outlines to Supabase Storage…\n');
  await ensureBucket();

  for (const term of wanted) {
    const { dir, files } = TERMS[term];
    console.log(`\n── Term ${term} (${files.length} files) ──`);
    for (const file of files) {
      await uploadFile(dir, file);
    }
  }
  console.log(`\n🎉 Done. Files are private; the app serves them via /api/files.\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
