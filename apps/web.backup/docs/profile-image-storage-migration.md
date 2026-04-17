# Profile image object-storage migration notes

## Summary

Profile images are now uploaded to object storage (S3-compatible) and only the object key is saved in `User.image`.

- Previous state: `User.image` contained inline data URLs.
- Current state: `User.image` contains keys like `profile-images/<userId>/<timestamp>-<uuid>.png`.

## Prerequisites

Set these environment variables before enabling uploads:

- `PROFILE_IMAGE_STORAGE_BUCKET`
- `PROFILE_IMAGE_STORAGE_REGION` (use `auto` for R2-style providers)
- `PROFILE_IMAGE_STORAGE_ENDPOINT` (required for most S3-compatible providers)
- `PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID`
- `PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY`
- `PROFILE_IMAGE_PUBLIC_BASE_URL` (base URL used to build stable image URLs)
- `PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE` (`true` for providers requiring path-style addressing)

For local development, `docker compose up -d minio minio-create-bucket` provisions a MinIO bucket with matching defaults from `.env.example`:

- `PROFILE_IMAGE_STORAGE_BUCKET=profile-images`
- `PROFILE_IMAGE_STORAGE_REGION=us-east-1`
- `PROFILE_IMAGE_STORAGE_ENDPOINT=http://127.0.0.1:9000`
- `PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID=minioadmin`
- `PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY=minioadmin`
- `PROFILE_IMAGE_PUBLIC_BASE_URL=http://127.0.0.1:9000/profile-images`
- `PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE=true`

## Migration strategy

1. Deploy code with object storage upload pipeline enabled.
2. Keep legacy data URLs readable; rendering supports both absolute URLs and stored keys.
3. Run a background migration script (recommended) that:
   - Selects users where `User.image` starts with `data:`.
   - Decodes and validates image bytes.
   - Uploads bytes to object storage with the new key format.
   - Updates `User.image` to the object key.
4. Verify by spot-checking users in production.

## Rollback strategy

If rollback is required:

1. Re-deploy previous app version that writes inline image data URLs.
2. Keep object storage objects untouched during rollback to avoid data loss.
3. Optionally run a reconciliation job after rollback to:
   - Restore `User.image` from a backup snapshot, or
   - Keep object keys and continue rendering as URLs if older version supports it.

## Operational considerations

- Replace semantics: uploading a new image stores new object first, updates DB, then deletes old object key.
- Delete semantics: removing profile image clears `User.image` and deletes object.
- Orphan prevention: if DB update fails after upload, the newly uploaded object is deleted immediately.
