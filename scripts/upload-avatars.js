// Run with: node scripts/upload-avatars.js
// Uploads cohort headshots to Supabase Storage and links them to profiles by name match.

const { createClient } = require('@supabase/supabase-js');
const { readFileSync, readdirSync, existsSync } = require('fs');
const { join, extname } = require('path');

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

const BUCKET = 'avatars';
const PHOTOS_DIR = join(__dirname, '..', '..', 'Headshot Photography_Co27_50kb');

function normalizeName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function mimeType(ext) {
  return ext === '.jpeg' || ext === '.jpg' ? 'image/jpeg' : 'image/png';
}

// Handle email-prefix names like "aayush.chugh2027" → "aayush chugh"
function parseProfileName(name) {
  const n = normalizeName(name);
  // Detect email-prefix format: contains digits (like 2027) and dots
  if (/\d{4}/.test(n)) {
    return n
      .replace(/\d+$/, '')   // remove trailing year digits
      .replace(/\./g, ' ')   // dots → spaces
      .trim()
      .replace(/\s+/g, ' ');
  }
  return n;
}

// Hard-coded overrides for names that can't be matched algorithmically
// Maps normalized-profile-name → normalized-photo-name
const OVERRIDES = {
  'aakash kp': 'k p aakash',
  'preksha mangla': 'preskha mangla',
  'rithivarsha v': 'rithi varsha v',
  'saijishnu neeli': 'naga venkata sridhara sai jishnu neeli',
  'shravanth vg': 'shravanth v g',
};

function findMatch(rawProfileName, photoMap) {
  // 1. Parse profile name (handles email-prefix format)
  const profileNorm = parseProfileName(rawProfileName);

  // 2. Check hard-coded overrides first
  const overrideKey = normalizeName(rawProfileName);
  if (OVERRIDES[overrideKey]) {
    const target = OVERRIDES[overrideKey];
    if (photoMap.has(target)) return photoMap.get(target);
  }

  // 3. Exact match
  if (photoMap.has(profileNorm)) return photoMap.get(profileNorm);

  const profileWords = profileNorm.split(' ').filter(Boolean);
  const profileFirst = profileWords[0];
  const profileLast = profileWords[profileWords.length - 1];
  // Significant tokens: length >= 3
  const sigTokens = profileWords.filter(t => t.length >= 3);

  for (const [photoName, photoData] of photoMap) {
    const photoWords = photoName.split(' ').filter(Boolean);
    const photoSet = new Set(photoWords);
    const photoFirst = photoWords[0];
    const photoLast = photoWords[photoWords.length - 1];

    // 4. All significant profile tokens appear in photo name
    if (sigTokens.length > 0 && sigTokens.every(t => photoSet.has(t))) {
      return photoData;
    }

    // 5. First+last of profile match first+last of photo
    if (profileFirst === photoFirst && profileLast === photoLast) {
      return photoData;
    }

    // 6. First and last profile words both appear anywhere in photo tokens
    if (
      profileFirst.length >= 3 &&
      profileLast.length >= 3 &&
      photoSet.has(profileFirst) &&
      photoSet.has(profileLast)
    ) {
      return photoData;
    }

    // 7. Single-word photo: match against first profile word
    if (photoWords.length === 1 && profileFirst === photoFirst) {
      return photoData;
    }

    // 8. Single-word photo: first profile word appears in photo (when photo is short)
    if (photoWords.length === 1 && profileFirst.length >= 4 && photoWords[0] === profileFirst) {
      return photoData;
    }
  }

  return null;
}

async function main() {
  // 1. Ensure bucket exists (public)
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png'],
  });
  if (bucketErr && !bucketErr.message.includes('already exists')) {
    console.error('❌ Failed to create bucket:', bucketErr.message);
    process.exit(1);
  }
  console.log(`✅ Bucket "${BUCKET}" ready`);

  // 2. Read all photo files and build name→photo map
  const files = readdirSync(PHOTOS_DIR).filter(f =>
    /\.(jpg|jpeg|png)$/i.test(f)
  );
  console.log(`📷 Found ${files.length} photos`);

  const photoMap = new Map(); // normalized name → { studentId, filename, ext }
  for (const file of files) {
    const match = file.match(/^(.+)_(\d+)\.(jpg|jpeg|png)$/i);
    if (!match) {
      console.warn(`  ⚠️  Skipping unexpected filename: ${file}`);
      continue;
    }
    const [, namePart, studentId, rawExt] = match;
    const ext = '.' + rawExt.toLowerCase();
    photoMap.set(normalizeName(namePart), { studentId, filename: file, ext });
  }

  // 3. Upload all photos to storage (upsert)
  console.log('\n⬆️  Uploading photos to storage...');
  const uploadedUrls = new Map(); // studentId → public URL
  let uploadCount = 0;
  for (const [, { studentId, filename, ext }] of photoMap) {
    const filePath = join(PHOTOS_DIR, filename);
    const fileBuffer = readFileSync(filePath);
    const storagePath = `${studentId}${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType(ext),
        upsert: true,
      });

    if (error) {
      console.warn(`  ⚠️  Upload failed for ${filename}: ${error.message}`);
    } else {
      uploadCount++;
    }

    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
    uploadedUrls.set(studentId, url);
  }
  console.log(`  ✅ Uploaded ${uploadCount} / ${photoMap.size} photos`);

  // 4. Fetch all profiles
  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, name');
  if (profilesErr) {
    console.error('❌ Failed to fetch profiles:', profilesErr.message);
    process.exit(1);
  }
  console.log(`\n👥 Found ${profiles.length} profiles in database`);

  // 5. Match profiles to photos and update avatar_url
  console.log('\n🔗 Matching profiles to photos...');
  const matched = [];
  const unmatched = [];

  for (const profile of profiles) {
    const photo = findMatch(profile.name, photoMap);

    if (photo) {
      const url = uploadedUrls.get(photo.studentId);
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', profile.id);
      if (error) {
        console.warn(`  ⚠️  DB update failed for "${profile.name}": ${error.message}`);
      }
      matched.push(profile.name);
    } else {
      unmatched.push(profile.name);
    }
  }

  console.log(`\n✅ Matched and updated: ${matched.length} / ${profiles.length} profiles`);

  if (unmatched.length > 0) {
    console.log(`\n❌ No photo found for ${unmatched.length} profile(s) — send these photos to fix:`);
    unmatched.sort().forEach(n => console.log(`   - ${n}`));
  } else {
    console.log('🎉 All profiles matched!');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
