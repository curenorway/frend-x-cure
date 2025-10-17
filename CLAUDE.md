# CLAUDE.md - For Future Claude Sessions

This file helps Claude quickly understand the project when continuing work in new sessions.

## Project Overview

**What:** Migration tool for Frend's website from Storyblok CMS → Webflow CMS
**Status:** Phase 2 - Proof of concept complete, ready for Webflow integration
**Client:** Frend (via Cure agency)
**Developer:** Harald (harald@cure.no)

## Quick Context

- **909 stories** (content items) to migrate from Storyblok
- **101 Storyblok components** → consolidating to **10 Webflow collections**
- **2,957 assets** (7.33 GB) - need optimization
- Team Members transformer complete and tested ✅ (87 items transformed)

## Current State

### ✅ What's Working
- Discovery tool (`npm run discover`) - analyzes Storyblok space
- Team Members transformer - successfully transformed all 87 team members
- Rich text converter (Storyblok JSON → HTML)
- Comprehensive documentation (6 files)
- CLI-based tool with test commands

### 🚧 In Progress
- Need Webflow API credentials (not provided yet)
- Need to fetch full story content (currently only metadata)
- Need to build Webflow upload functionality

### ⏳ Todo Next
1. Get Webflow credentials
2. Update discovery to fetch full content (not just metadata)
3. Build Webflow API client (`src/clients/webflow.js`)
4. Test upload 5 team members to Webflow
5. Build more transformers (Articles, Videos, Projects)

## Critical Files to Read

1. **PROJECT_CONTEXT.md** - Complete session history, every decision made
2. **ARCHITECTURE.md** - Technical details, APIs, data flow
3. **WEBFLOW_CMS_DESIGN.md** - Webflow collections design (field mappings)
4. **SESSION_SUMMARY.md** - Executive summary of last session

## Code Structure

```
src/
├── discover.js              # ✅ Discovery tool (complete)
├── test-transform.js        # ✅ Test runner (complete)
├── transformers/
│   ├── base.js              # ✅ Base transformer class
│   └── team-members.js      # ✅ Team Members (complete, tested)
├── converters/
│   └── richtext.js          # ✅ Rich text converter (complete)
└── clients/                 # ⏳ Need to build
    ├── storyblok.js         # ⏳ API wrapper
    └── webflow.js           # ⏳ API wrapper + upload
```

## Key Design Decisions

### 1. Nested Components → Flattening
**Problem:** Storyblok uses nested "bloks", Webflow doesn't support nested collections
**Solution:** Flatten to rich text with HTML formatting

### 2. Component Consolidation
**Before:** 101 Storyblok components
**After:** 10-12 Webflow collections
**Example:** 8 hero variants → 1 flexible hero

### 3. Asset Strategy
- Compress images (target: 50% reduction)
- Keep videos on Vimeo (don't upload to Webflow)
- Convert large PNGs to WebP

### 4. Rich Text Conversion
- Storyblok uses JSON schema (ProseMirror-like)
- Webflow expects HTML
- Built custom converter in `src/converters/richtext.js`

## Known Issues & Gotchas

### Issue 1: Metadata Only
**Problem:** Current `raw-stories.json` has only story metadata, not full content
**Why:** Discovery uses `GET /spaces/{id}/stories` which returns summary
**Solution:** Either:
- Update discovery to fetch each story individually: `GET /spaces/{id}/stories/{story_id}`
- OR fetch full content in transformers when needed

**Impact:** Team Members showing empty role/email/images because content is missing

### Issue 2: Custom metaFields
**Problem:** All page types use "metaFields" (custom field) for SEO
**Status:** Not investigated yet - need to fetch full story to see what's inside
**Todo:** Fetch a few full stories, examine metaFields structure, map to Webflow SEO fields

### Issue 3: Rate Limiting
**Storyblok:** 6 requests/second (strict)
**Webflow:** Varies by plan
**Handled:** Discovery tool has built-in rate limiting, works fine

## Credentials & Config

**Location:** `.env` file (gitignored)

**Current:**
```bash
STORYBLOK_TOKEN=so12EyQ4dc0ZYC2TUbJq7wtt-102215007624169-6SUHpNSDMd-3hQgduwCW
STORYBLOK_SPACE_ID=139140
```

**Needed:**
```bash
WEBFLOW_API_TOKEN=<need from client>
WEBFLOW_SITE_ID=<need from client>
```

## API Reference

### Storyblok Management API
**Base:** `https://mapi.storyblok.com/v1`
**Auth:** Personal Access Token in `Authorization` header
**Rate Limit:** 6 req/sec

**Key Endpoints:**
- `GET /spaces/{id}/stories` - List stories (metadata only!)
- `GET /spaces/{id}/stories/{story_id}` - Get full story content
- `GET /spaces/{id}/components` - List components
- `GET /spaces/{id}/assets` - List assets

### Webflow API v2
**Base:** `https://api.webflow.com/v2`
**Auth:** Bearer token
**Docs:** https://developers.webflow.com/

**Key Endpoints:**
- `POST /collections/{id}/items` - Create item
- `POST /sites/{id}/assets` - Upload asset

## Content Type Mapping

| Storyblok | Count | Webflow Collection | Transformer Status |
|-----------|-------|--------------------|-------------------|
| Person | 87 | Team Members | ✅ Complete |
| Video | 270 | Videos | ⏳ Todo |
| project | 123 | Projects | ⏳ Todo |
| Article | 75 | Articles | ⏳ Todo |
| News | 34 | News | ⏳ Todo |
| Jobs | 50 | Careers | ⏳ Todo |
| Landing + HubspotPage | 127 | Landing Pages | ⏳ Todo |
| Arrangmement | 33 | Events | ⏳ Todo |
| EBook | 31 | Resources | ⏳ Todo |
| Service | 30 | Services | ⏳ Todo |

## Testing

```bash
# Test transformation
npm run test-transform team-members

# Re-run discovery
npm run discover

# Full migration (not built yet)
npm run migrate
```

**Output Location:** `output/transformed/team-members.json`

## Common Commands

```bash
# Install dependencies
npm install

# Run discovery
npm run discover

# Test transformer
npm run test-transform team-members

# Check transformed data
cat output/transformed/team-members.json | head -n 50
```

## When Client Says...

**"Our CMS is messy"**
→ Show them `reports/storyblok-discovery.json` - 101 components, only 14 used!

**"How long will it take?"**
→ 4-6 weeks estimate (see SESSION_SUMMARY.md)

**"What Webflow plan?"**
→ Business plan ($39/mo) - need 10k items, we have 909

**"Can we test first?"**
→ Yes! Start with Team Members (87 items), validate, then proceed

## If You Need To...

### Continue building transformers
1. Copy `src/transformers/team-members.js`
2. Extend `BaseTransformer`
3. Implement `transform()` method
4. Map fields per `WEBFLOW_CMS_DESIGN.md`

### Debug transformation
- Check `output/transformed/*.json`
- Look at `errors` and `warnings` arrays
- Verify against source in `reports/raw-stories.json`

### Add Webflow upload
1. Create `src/clients/webflow.js`
2. Use Webflow API v2
3. POST to `/collections/{id}/items`
4. Handle rate limiting (60 req/min on Business plan)

## Important Notes

1. **Don't touch Storyblok production** - read-only access only
2. **Test in Webflow staging** - create test site first
3. **Keep Storyblok active** - until migration is verified
4. **Document decisions** - update PROJECT_CONTEXT.md

## Session History

**October 17, 2025 - Initial Session**
- Built discovery tool
- Created transformation pipeline
- Designed Webflow CMS structure
- Completed Team Members transformer
- Comprehensive documentation

**Next Session - Todo:**
- Get Webflow credentials
- Fetch full story content
- Build Webflow upload
- Test with 5 team members

## Quick Wins for Next Session

1. **Update discovery to fetch full content** (30 min)
   - Add `fetchFullStory(id)` function
   - See actual role, email, images for team members

2. **Build Webflow client** (1 hour)
   - Basic API wrapper
   - Upload function
   - Rate limiting

3. **Test upload** (30 min)
   - Upload 5 team members
   - Verify in Webflow Designer
   - Celebrate! 🎉

## Tips for Working on This Project

- **Read PROJECT_CONTEXT.md first** - has everything
- **Test transformations before uploading** - save to JSON first
- **Start with simple content types** - Team Members, then Articles
- **Keep documentation updated** - future you will thank you

## Warning Signs

🚨 If you see empty fields in transformed data → Need full story content
🚨 If uploads fail → Check Webflow API token scopes
🚨 If rate limited → Add delays, respect limits
🚨 If slugs have special chars → Sanitize (already handled in BaseTransformer)

---

**Last Updated:** October 17, 2025
**Current Phase:** 2 (Proof of Concept)
**Next Milestone:** Upload 5 team members to Webflow

**For detailed context, read PROJECT_CONTEXT.md**
