#!/usr/bin/env node
/**
 * Create the public `clinic-media` Supabase Storage bucket if it doesn't
 * already exist. Used for clinic logos, hero images, and dentist photos.
 *
 *   node --env-file=.env.local scripts/ensure-storage-bucket.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase env vars not set");
const supa = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = "clinic-media";

const { data: buckets } = await supa.storage.listBuckets();
const exists = (buckets ?? []).some((b) => b.name === BUCKET);

if (exists) {
  console.log(`✓ Bucket "${BUCKET}" already exists`);
  // Update it to be public + set MIME types
  const { error } = await supa.storage.updateBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10 MB per asset
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });
  if (error) {
    console.error("❌ updateBucket failed:", error.message);
    process.exit(1);
  }
  console.log(`✓ Bucket updated (public, 10MB limit, image MIME only)`);
} else {
  const { error } = await supa.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });
  if (error) {
    console.error("❌ createBucket failed:", error.message);
    process.exit(1);
  }
  console.log(`✓ Created bucket "${BUCKET}" (public)`);
}
