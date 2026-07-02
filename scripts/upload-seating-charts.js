// Run with: node scripts/upload-seating-charts.js
// Uploads the registrar seating-chart PDFs to a public Supabase Storage bucket.
// Source: "Subject Sections /Already Done /" (confirmed final arrangements).

const { createClient } = require('@supabase/supabase-js');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

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

const BUCKET = 'seating-charts';
const CHARTS_DIR = join(__dirname, '..', '..', 'Subject Sections ', 'Already Done ');
const PDF = 'application/pdf';

const FILES = [
  { source: 'AITM_SecA.pdf', dest: 'aitm-section-a.pdf' },
  { source: 'AITM_SecB.pdf', dest: 'aitm-section-b.pdf' },
  { source: 'SADM_SecA.pdf', dest: 'sadt-section-a.pdf' },
  { source: 'SADM_SecB.pdf', dest: 'sadt-section-b.pdf' },
];

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error(`Could not list buckets: ${error.message}`);
  if (buckets.some(b => b.name === BUCKET)) {
    console.log(`ℹ️  Bucket "${BUCKET}" already exists`);
    return;
  }
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (createErr) throw new Error(`Failed to create bucket: ${createErr.message}`);
  console.log(`✅ Created public bucket "${BUCKET}"`);
}

async function uploadFile({ source, dest }) {
  const filePath = join(CHARTS_DIR, source);
  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }
  const buffer = readFileSync(filePath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(dest, buffer, { contentType: PDF, upsert: true });
  if (error) {
    console.error(`❌ ${dest}: ${error.message}`);
  } else {
    console.log(`✅ ${dest}  ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${dest}`);
  }
}

async function main() {
  console.log('\nUploading seating charts to Supabase Storage…\n');
  await ensureBucket();
  console.log('');
  for (const file of FILES) await uploadFile(file);
  console.log('\n🎉 Done.\n');
}

main().catch(err => { console.error(err); process.exit(1); });
