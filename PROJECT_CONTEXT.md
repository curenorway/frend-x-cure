# Project Context & Session History

This document captures the complete context, decisions, and history of the Storyblok to Webflow migration project.

## Session 1: October 17, 2025 - Initial Discovery & Planning

### Initial Request

**From:** Harald (Cure Agency)

**Context:**
- Cure is a digital design agency
- Partner agency asked for help with migration
- Client (Frend) is moving from Storyblok CMS to Webflow CMS
- Client mentioned their Storyblok is "a bit messy"

**Initial Questions:**
- What do we know about Storyblok API?
- What information do we need to investigate?
- How can we ensure smooth transition?
- Should we build a dedicated app for migration?
- Can we use AI to assist?

### Credentials Provided

```
Storyblok Personal Access Token: so12EyQ4dc0ZYC2TUbJq7wtt-102215007624169-6SUHpNSDMd-3hQgduwCW
Storyblok Space ID: 139140
```

**Note:** Token is a Personal Access Token for Management API access.

### Discovery Phase

#### Step 1: Built Discovery Tool

Created `src/discover.js` to analyze Storyblok space:
- Fetches all components (content types)
- Fetches all stories (content items)
- Fetches all assets
- Generates comprehensive analysis reports

**Initial Challenge:** First attempt used Content Delivery API which returned "Unauthorized" for stories.

**Solution:** Switched to Management API (`https://mapi.storyblok.com/v1`) which works with Personal Access Tokens.

#### Step 2: Ran Full Discovery

**Results:**
- **909 stories** (content items)
  - 697 published
  - 212 drafts
- **101 components** defined in Storyblok
- **2,957 assets** (7.33 GB total)

**Rate Limiting Issue:** Hit Storyblok's 6 requests/second limit while fetching assets. Discovery tool handles this gracefully.

### Content Analysis

#### Content Types Distribution

| Type | Count | Notes |
|------|-------|-------|
| Video | 270 | 30% of all content |
| project | 123 | Portfolio/case studies |
| Person | 87 | Team members |
| Article | 75 | Blog posts |
| HubspotPage | 70 | Landing pages with forms |
| Landing | 57 | Generic landing pages |
| Jobs | 50 | Career postings |
| News | 34 | Company news |
| Arrangmement | 33 | Events (Norwegian for "Events") |
| EBook | 31 | Downloadable resources |
| Service | 30 | Service offerings |
| videoSlider | 21 | Video collections/playlists |
| Webinar | 2 | Webinar content |
| Other | 26 | Misc page types |

#### Key Insights

1. **Component Bloat Confirmed**
   - 101 components defined
   - Only ~14 actively used
   - Multiple duplicates:
     - 8 different hero components (hero, heroEvent, heroFrontpage, heroHowWeWork, etc.)
     - 4 CTA variants (callToAction, bigLink, newCta, longCTA)
     - Multiple image components (bigImage, bodyImage, paragraphImage)

2. **Content Organization**
   - Well-organized in folders:
     - videoer (268 items)
     - prosjekter (125 items)
     - employees (88 items)
     - innholdssider (84 items)
     - artikler (75 items)
     - karriere (66 items)
   - Uses tags extensively (21 unique tags)
   - No multi-language content (no translations detected)

3. **Asset Situation**
   - 2,957 assets is manageable but needs optimization
   - File types:
     - JPG: 1,202
     - PNG: 1,276
     - MP4: 31 (videos)
     - SVG: 48
     - Other: 400
   - Largest files:
     - 132 MB MP4 video
     - 78 MB GIF
     - 43 MB JPG
   - **Action needed:** Compress before upload to Webflow

4. **Tags in Use**
   Most common content tags:
   - Digital Workplace (278 items)
   - Microsoft 365 (200 items)
   - eCommerce (138 items)
   - Generativ AI (95 items)
   - SharePoint & Teams (84 items)
   - No-code (69 items)
   - Arbeidsstyringsplattformer (47 items)
   - IT-service & support (42 items)
   - Google Workspace (30 items)
   - CRM (28 items)

### Migration Challenges Identified

#### 1. Nested Components (HIGH SEVERITY)
**Problem:** Storyblok uses "bloks" fields that allow nested components. Example:
```
Page
  └─ body (bloks field)
      ├─ accordion
      │   └─ items (bloks field)
      │       ├─ accordionItem
      │       └─ accordionItem
      ├─ grid
      │   └─ columns (bloks field)
      │       └─ ...
```

Webflow doesn't support nested collections/references.

**Solution Options:**
1. **Flatten to Rich Text** (Recommended) - Convert to HTML in rich text field
2. **JSON Field** - Store structure as JSON, parse with JavaScript
3. **Component Collections** - Create separate collection for reusable components

**Decision:** Use Option 1 (Flattening) for most content, Option 2 (JSON) for highly complex pages.

#### 2. Rich Text Format Conversion (MEDIUM SEVERITY)
**Problem:** Storyblok uses custom rich text schema (JSON-based), Webflow uses HTML.

**Example Storyblok Rich Text:**
```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Hello " },
        { "type": "text", "text": "world", "marks": [{ "type": "bold" }] }
      ]
    }
  ]
}
```

**Webflow Expects:**
```html
<p>Hello <strong>world</strong></p>
```

**Solution:** Build converter that maps Storyblok nodes to HTML tags.

**Implementation:** Create `src/converters/richtext.js`

#### 3. Custom metaFields (HIGH SEVERITY)
**Problem:** All page types use "metaFields" (custom field type) for SEO metadata. This is a Storyblok plugin field.

**Affected:** 12 content types (all root components)

**Solution:**
1. Fetch a few stories to see what's actually in metaFields
2. Map to standard Webflow SEO fields (Title, Description, Image)

**Status:** NEEDS INVESTIGATION - we haven't looked at the actual field content yet

#### 4. Large Asset Volume (MEDIUM SEVERITY)
**Problem:** 2,957 assets (7.33 GB) will be expensive and slow to upload to Webflow.

**Solution:**
1. Compress all images (target 50% reduction)
2. Convert PNGs to WebP where appropriate
3. Keep large videos on Vimeo (already hosted there)
4. Upload only optimized versions

**Implementation:** Create `src/converters/assets.js`

### Webflow CMS Design

Created comprehensive CMS structure design in `WEBFLOW_CMS_DESIGN.md`.

#### Key Design Decisions

**1. Collection Consolidation**
- **Before:** 101 Storyblok components
- **After:** 10-12 Webflow collections
- **Reasoning:** Reduce duplication, simplify content management

**2. Collection Mapping**

| Storyblok | Webflow Collection | Merge Reason |
|-----------|-------------------|--------------|
| Video + Webinar | Videos | Both are video content |
| HubspotPage + Landing | Landing Pages | Both are landing pages |
| 8 hero variants | 1 hero component | Use conditional fields |

**3. Reference Fields**
Webflow supports multi-reference, which we'll use for:
- Tags (multi-reference to Tags collection)
- Categories (multi-reference to Categories collection)
- Related Content (multi-reference to same or other collections)

**4. Webflow Plan Recommendation**
**Business Plan** ($39/month):
- 10,000 CMS items (we need 909 + growth room)
- 25,000 API requests/min
- 200 collections (we need 10-13)

#### Proposed Collections

1. **Videos** (270 items)
2. **Projects** (123 items)
3. **Team Members** (87 items)
4. **Articles** (75 items)
5. **Landing Pages** (127 items - merged HubspotPage + Landing)
6. **Careers** (50 items)
7. **News** (34 items)
8. **Events** (33 items)
9. **Resources** (31 items - eBooks, whitepapers)
10. **Services** (30 items)
11. **Tags** (21+ items - taxonomy)
12. **Categories** (5-10 items - broader groupings)
13. **Video Series** (22 items - for grouping videos)

See `WEBFLOW_CMS_DESIGN.md` for complete field definitions.

### Migration Strategy

#### Phase Approach

**Phase 1: Discovery & Planning** ✅ COMPLETE
- Analyze Storyblok content
- Design Webflow CMS structure
- Identify challenges
- Create migration strategy

**Phase 2: Tool Development** 🚧 IN PROGRESS
- Build transformation pipeline
- Build rich text converter
- Build asset optimizer
- Test with sample content

**Phase 3: Proof of Concept**
- Migrate Team Members (simplest - no nested components)
- Migrate Articles (medium - rich text conversion)
- Migrate Projects (complex - multiple relationships)
- Validate results in Webflow

**Phase 4: Full Migration**
- Optimize all assets
- Transform all content types
- Upload to Webflow
- Comprehensive QA

**Phase 5: Go Live**
- Final validation
- DNS switch
- Monitor
- Decommission Storyblok

### Technical Decisions

#### API Choice
**Storyblok:** Use Management API (`https://mapi.storyblok.com/v1`)
- Reason: Personal Access Tokens don't work with Content Delivery API
- Provides full access to content, components, assets

**Webflow:** Use v2 REST API (`https://api.webflow.com/v2`)
- Reason: v2 is current, v1 is deprecated
- Better rate limits and features

#### Language & Stack
**Language:** JavaScript (Node.js)
- Reason: Both APIs have JS SDKs, Harald likely familiar with JS

**Key Dependencies:**
- `axios` - HTTP client for API calls
- `dotenv` - Environment variable management
- Future: `sharp` for image optimization

#### Project Structure
```
src/
  ├── discover.js          # Discovery tool (✅ complete)
  ├── migrate.js           # Migration orchestrator (next)
  ├── transformers/        # Content type transformers
  ├── converters/          # Format converters (richtext, assets)
  ├── clients/             # API wrappers
  └── utils/               # Shared utilities
```

**Reasoning:**
- Modular: Each content type has its own transformer
- Testable: Each module can be tested independently
- Maintainable: Clear separation of concerns

#### Error Handling Strategy
- Fail gracefully on individual items
- Log all errors to file
- Continue processing remaining items
- Generate error report at end
- Provide rollback capability

### Open Questions & Decisions Needed

#### For Client/Stakeholders

1. **Landing Page Merge**
   - Merge HubspotPage + Landing into one collection?
   - Or keep separate? (recommended: merge)

2. **Draft Content**
   - Migrate all 212 drafts or only published content?
   - Recommendation: Start with published, add drafts later

3. **Webflow Plan**
   - Which plan will they purchase?
   - Recommendation: Business ($39/mo) for 10k items

4. **Timeline**
   - When do they want to go live?
   - Can they freeze content changes during migration?

5. **Video Hosting**
   - Keep videos on Vimeo (recommended)?
   - Or upload to Webflow (expensive, slower)?

6. **Asset Cleanup**
   - Delete unused/old assets before migration?
   - Or migrate everything?

#### Technical Decisions Still Needed

1. **metaFields Investigation**
   - What's actually in those custom fields?
   - Need to fetch and examine actual content
   - Then map to Webflow SEO fields

2. **Rich Text Complexity**
   - How complex are their rich text fields?
   - Do they use custom blocks within rich text?
   - Need to examine samples

3. **Image Optimization Settings**
   - Target quality: 80%? 85%?
   - Max dimensions: 2400px? 3000px?
   - WebP conversion threshold

4. **Webflow API Access**
   - Need Webflow site ID
   - Need API token
   - Need to create collections manually first or via API?

### Files Created This Session

1. **package.json** - Project configuration
2. **.env** - Environment variables (gitignored)
3. **.gitignore** - Git ignore rules
4. **src/discover.js** - Discovery tool (complete, tested)
5. **reports/storyblok-discovery.json** - Full analysis report
6. **reports/raw-components.json** - All 101 components
7. **reports/raw-stories.json** - All 909 stories
8. **reports/raw-assets.json** - All 2,957 assets
9. **WEBFLOW_CMS_DESIGN.md** - Complete Webflow CMS design
10. **README.md** - Main project documentation
11. **PROJECT_CONTEXT.md** - This file!

### Next Session Priorities

#### Must Do (Critical Path)

1. **Investigate metaFields**
   - Read actual story content (not just metadata)
   - See what's in those custom fields
   - Design mapping to Webflow

2. **Build Rich Text Converter**
   - Examine sample rich text content
   - Build Storyblok → HTML converter
   - Test with various formatting scenarios

3. **Build Team Members Transformer**
   - Simplest content type (good starting point)
   - No nested components
   - Limited rich text
   - Proof of concept for transformation pipeline

#### Should Do (Important)

4. **Build Asset Optimizer**
   - Image compression utility
   - WebP conversion
   - Test with sample images

5. **Build Storyblok API Client**
   - Wrapper around API calls
   - Built-in rate limiting
   - Error handling

6. **Get Webflow Credentials**
   - API token from client
   - Site ID
   - Create test collections manually

#### Nice to Have

7. **Build Webflow API Client**
   - Upload transformed content
   - Asset upload

8. **Build More Transformers**
   - Articles
   - Projects
   - Videos

### Code Snippets & Examples

#### Fetching a Single Story with Full Content

```javascript
const response = await axios.get(
  `https://mapi.storyblok.com/v1/spaces/139140/stories/{story_id}`,
  {
    headers: { Authorization: STORYBLOK_TOKEN }
  }
);
const story = response.data.story;
console.log(story.content); // Full content including metaFields
```

#### Storyblok Rate Limiting

```javascript
// Storyblok: 6 requests/second
// Wait 200ms between requests to be safe
await new Promise(resolve => setTimeout(resolve, 200));
```

### Lessons Learned

1. **Management API vs Content Delivery API**
   - Personal Access Tokens only work with Management API
   - Management API returns different data structure (content_type field vs content.component)

2. **Rate Limiting**
   - Storyblok is strict about 6 req/sec
   - Better to add delays proactively than retry on errors

3. **Asset Count Discrepancy**
   - First run found ~700 assets (hit rate limit)
   - Second run found 2,957 assets (waited for rate limit to clear)
   - Always check for pagination and rate limits

4. **Content Organization**
   - Frend has good folder structure
   - Uses tags extensively
   - Content is well-categorized despite "messy" components

### Important URLs & Resources

**Storyblok API Docs:**
- Management API: https://www.storyblok.com/docs/api/management
- Content Delivery API: https://www.storyblok.com/docs/api/content-delivery

**Webflow API Docs:**
- v2 API: https://developers.webflow.com/
- CMS API: https://developers.webflow.com/data/reference/collections

**Frend's Storyblok:**
- Space ID: 139140
- Preview URL: https://www.frend.no/api/preview?secret=134251135A&slug=
- Space Name: "Frend"

### Git Repository

**Location:** `/Users/harald/Documents/GitHub/frend-x-cure`
**Status:** Not yet initialized as git repository
**TODO:** Initialize git, create `.gitignore`, first commit

### Contact Information

**Agency:** Cure (Digital Design Agency)
**Developer:** Harald (harald@cure.no)
**Client:** Frend (https://www.frend.no)
**Partner Agency:** (Not specified)

---

**Session End:** October 17, 2025
**Next Session:** TBD
**Status:** Discovery complete, Tool development in progress
