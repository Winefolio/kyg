# Media Storage Investigation Summary

## Problem
Media records might not be found by publicId when accessed via `/api/media/:publicId/stream`

## Key Findings

### 1. Media Table Schema (shared/schema.ts)
- **publicId**: varchar(12), unique, indexed
- Generated using `generateUniqueMediaPublicId()` which creates 10-character alphanumeric strings
- Schema validation allows 8-12 character publicIds

### 2. PublicId Generation (server/storage.ts)
```typescript
async generateUniqueMediaPublicId(): Promise<string> {
  const characters = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
  // Generates 10-character string
  // Excludes 'O' and '0' to avoid confusion
}
```

### 3. Media Upload Flow
1. File uploaded to `/api/upload` (NOT `/api/upload/media`)
2. File stored in Supabase Storage
3. PublicId generated: 10 uppercase alphanumeric characters
4. Media record created in database with:
   - publicId
   - storageUrl (Supabase URL)
   - entityId (can be NULL for temporary uploads)
   - metadata (includes originalEntityId for temp uploads)

### 4. Media Access Flow
1. Client requests `/api/media/{publicId}/stream`
2. Server looks up media by publicId: `getMediaByPublicId(publicId)`
3. If found, redirects to Supabase storage URL
4. If not found, returns 404 "Media not found"

## Potential Issues

### 1. Case Sensitivity
- PublicIds are generated in UPPERCASE
- Database queries might be case-sensitive
- Client might be sending lowercase publicId

### 2. Timing Issues
- Media record creation might fail after file upload succeeds
- Client might try to access media before database record is created

### 3. Entity Linking
- Media uploaded with temporary entityId stores NULL in entityId field
- `updateMediaByPublicId()` only updates records where entityId is NULL
- If media was already linked, update won't happen

### 4. Database Sync
- Media table might not exist (though db:push shows no issues)
- Database connection issues during media record creation

### 5. Upload Response
- Upload endpoint returns publicId immediately after creation
- But client might be using a different publicId format

## Debugging Steps

1. **Add Logging to getMediaByPublicId**:
   - Log the exact publicId being searched
   - Log if any records are found
   - Log database query errors

2. **Check Upload Response**:
   - Verify the publicId returned matches what's stored
   - Check if media record creation succeeded

3. **Verify Case Handling**:
   - Ensure publicId comparisons are case-insensitive
   - Or ensure client always sends uppercase

4. **Add Transaction Support**:
   - Wrap file upload + database record in transaction
   - Rollback file upload if database insert fails

5. **Check Media Table Data**:
   - Query media table directly to see if records exist
   - Check if publicIds match expected format

## Recommended Fixes

### 1. Add Comprehensive Logging
```typescript
async getMediaByPublicId(publicId: string): Promise<Media | undefined> {
  console.log(`[MEDIA_LOOKUP] Searching for publicId: "${publicId}"`);
  const result = await db.query.media.findFirst({
    where: eq(media.publicId, publicId),
  });
  console.log(`[MEDIA_LOOKUP] Found: ${result ? 'YES' : 'NO'}`);
  return result;
}
```

### 2. Case-Insensitive Search
```typescript
async getMediaByPublicId(publicId: string): Promise<Media | undefined> {
  return db.query.media.findFirst({
    where: eq(media.publicId, publicId.toUpperCase()),
  });
}
```

### 3. Better Error Handling in Upload
```typescript
// In routes.ts upload endpoint
try {
  const mediaRecord = await storage.createMedia({...});
  console.log(`[MEDIA_UPLOAD] Created media record: ${mediaRecord.publicId}`);
} catch (error) {
  // Delete uploaded file if database insert fails
  await deleteMediaFile(storageUrl);
  throw error;
}
```

### 4. Add Media Debugging Endpoint
```typescript
app.get("/api/debug/media/:publicId", async (req, res) => {
  const { publicId } = req.params;
  const records = await db.select().from(media).where(
    or(
      eq(media.publicId, publicId),
      eq(media.publicId, publicId.toUpperCase()),
      eq(media.publicId, publicId.toLowerCase())
    )
  );
  res.json({ searchedFor: publicId, found: records });
});
```