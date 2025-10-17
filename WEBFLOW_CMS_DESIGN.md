# Webflow CMS Structure Design
## Frend - Storyblok to Webflow Migration

**Generated:** October 17, 2025
**Source Data:** 909 stories, 101 Storyblok components, 2,957 assets

---

## Executive Summary

### Current State (Storyblok)
- **909 content items** (697 published, 212 drafts)
- **101 components defined**, but only ~14 actively used
- **Component bloat**: Multiple similar components (8+ hero variations)
- **2,957 assets** (7.33 GB) - needs optimization
- **21 unique content tags** for categorization

### Proposed State (Webflow)
- **10-12 core Collections** (streamlined from 101 components)
- **Unified component system** (no duplicates)
- **Optimized asset library** (compressed/CDN)
- **Tag/Category system** using Webflow's multi-reference

---

## 📊 Content Analysis

### Content Distribution

| Content Type | Count | % of Total | Webflow Collection |
|--------------|-------|------------|-------------------|
| Video | 270 | 30% | Videos |
| Project (Portfolio) | 123 | 14% | Projects |
| Person (Team) | 87 | 10% | Team Members |
| Article | 75 | 8% | Articles |
| HubspotPage (Landing) | 70 | 8% | Landing Pages |
| Landing | 57 | 6% | Landing Pages (merge) |
| Jobs | 50 | 5% | Careers |
| News | 34 | 4% | News |
| Arrangmement (Events) | 33 | 4% | Events |
| EBook | 31 | 3% | Resources |
| Service | 30 | 3% | Services |
| Webinar | 2 | <1% | Videos (merge) |
| videoSlider | 21 | 2% | Not needed (component) |
| Other | 26 | 3% | Various |

### Content Tags (Top 10)

1. **Digital Workplace** - 278 items
2. **Microsoft 365** - 200 items
3. **eCommerce** - 138 items
4. **Generativ AI** - 95 items
5. **SharePoint & Teams** - 84 items
6. **No-code** - 69 items
7. **Arbeidsstyringsplattformer** - 47 items
8. **IT-service & support** - 42 items
9. **Google Workspace** - 30 items
10. **CRM** - 28 items

---

## 🎯 Proposed Webflow Collections

### Core Collections (Content Types)

#### 1. **Videos** (270 items)
Primary content type for educational/marketing videos.

**Fields:**
- Title (Plain text, required)
- Slug (Auto-generated)
- Subtext/Description (Plain text, multi-line)
- Thumbnail Image (Image)
- Video URL (Plain text) - Vimeo/YouTube embed
- Vimeo ID (Plain text)
- Duration (Number)
- Publish Date (Date)
- Tags (Multi-reference → Tags collection)
- Categories (Multi-reference → Categories collection)
- Related Content (Multi-reference → Videos, Articles, Projects)
- Video Series (Reference → Video Series collection)
- Featured (Switch)
- SEO Title (Plain text)
- SEO Description (Plain text)
- SEO Image (Image)

**Webflow Plan Consideration:** CMS limit depends on plan
- Basic: 2,000 items ✅
- Standard: 10,000 items ✅

---

#### 2. **Projects** (123 items)
Portfolio/case studies.

**Fields:**
- Title (Plain text, required)
- Slug (Auto-generated)
- Small Title (Plain text)
- Mobile Title (Plain text)
- Subtext (Plain text, multi-line)
- Featured Image (Image)
- Page Image (Image)
- Client Name (Plain text)
- Client Website (Plain text)
- Client Website Label (Plain text)
- Tools Used (Rich text)
- Results (Rich text)
- Body (Rich text)
- Contact Person (Reference → Team Members)
- Highlight Tags (Plain text) - for filtering
- Tags (Multi-reference → Tags collection)
- Categories (Multi-reference → Categories collection)
- Related Projects (Multi-reference → Projects)
- Featured (Switch)
- Publish Date (Date)
- SEO Title (Plain text)
- SEO Description (Plain text)
- SEO Image (Image)

---

#### 3. **Team Members** (87 items)
Employee profiles.

**Fields:**
- Name (Plain text, required)
- Slug (Auto-generated)
- Role/Title (Plain text)
- Email (Email)
- Phone (Phone)
- Profile Image (Image)
- Alt/Fun Image (Image) - for personality
- Bio (Rich text)
- LinkedIn URL (Plain text)
- Expertise Tags (Multi-reference → Tags collection)
- Featured (Switch)
- Sort Order (Number)

---

#### 4. **Articles** (75 items)
Blog posts / knowledge articles.

**Fields:**
- Title (Plain text, required)
- Slug (Auto-generated)
- Subtext/Excerpt (Plain text, multi-line)
- Author Name (Plain text)
- Author (Reference → Team Members)
- Featured Image (Image)
- Image as Background (Switch)
- Body (Rich text)
- Publish Date (Date)
- Updated Date (Date)
- Tags (Multi-reference → Tags collection)
- Categories (Multi-reference → Categories collection)
- Related Content (Multi-reference → Articles, Videos, Resources)
- Reading Time (Number) - auto-calculate
- Featured (Switch)
- SEO Title (Plain text)
- SEO Description (Plain text)
- SEO Image (Image)

---

#### 5. **Landing Pages** (127 items = HubspotPage 70 + Landing 57)
Marketing/campaign pages.

**Fields:**
- Title (Plain text, required)
- Slug (Auto-generated)
- Subtext (Plain text, multi-line)
- Hero Image (Image)
- Theme/Color (Option - dropdown)
- Do Not Index (Switch)
- Form ID (Plain text) - HubSpot form integration
- Event Date (Date) - if event landing page
- Event Location (Plain text)
- Body (Rich text)
- CTA Text (Plain text)
- CTA Link (Link)
- Tags (Multi-reference → Tags collection)
- SEO Title (Plain text)
- SEO Description (Plain text)
- SEO Image (Image)

---

#### 6. **Careers** (50 items)
Job postings.

**Fields:**
- Title (Plain text, required)
- Slug (Auto-generated)
- Listing Title (Plain text) - for job boards
- Subtext (Plain text, multi-line)
- Excerpt (Plain text, multi-line)
- Body (Rich text)
- Listing Tags (Plain text) - comma-separated
- Deadline (Date)
- Location (Plain text)
- Employment Type (Option - Full-time/Part-time/Contract)
- Department (Reference → Departments collection)
- Apply Link (Link) - TeamTailor or other ATS
- Featured (Switch)
- Publish Date (Date)
- Expire Date (Date)
- SEO Title (Plain text)
- SEO Description (Plain text)

---

#### 7. **News** (34 items)
Company news/announcements.

**Fields:**
- Title (Plain text, required)
- Slug (Auto-generated)
- Subtext/Excerpt (Plain text, multi-line)
- Author (Reference → Team Members)
- Featured Image (Image)
- Body (Rich text)
- Publish Date (Date, required)
- Tags (Multi-reference → Tags collection)
- Categories (Multi-reference → Categories collection)
- Related Content (Multi-reference → News, Articles)
- Featured (Switch)
- SEO Title (Plain text)
- SEO Description (Plain text)
- SEO Image (Image)

---

#### 8. **Events** (33 items)
Webinars, seminars, workshops.

**Fields:**
- Title (Plain text, required)
- Slug (Auto-generated)
- Subtext/Description (Plain text, multi-line)
- Event Date (Date, required)
- Event Time (Plain text)
- Event End Date (Date)
- Location (Plain text)
- Registration URL (Link)
- Capacity/Places (Number)
- Price (Plain text)
- Event Type (Option - Webinar/Seminar/Workshop/Conference)
- Featured Image (Image)
- Hero Image (Image)
- Body (Rich text)
- Speakers (Multi-reference → Team Members or Speakers collection)
- Tags (Multi-reference → Tags collection)
- Status (Option - Upcoming/Past/Cancelled)
- Featured (Switch)
- SEO Title (Plain text)
- SEO Description (Plain text)
- SEO Image (Image)

---

#### 9. **Resources** (31 items - EBooks)
Downloadable resources, whitepapers, ebooks.

**Fields:**
- Title (Plain text, required)
- Slug (Auto-generated)
- Subtext/Description (Plain text, multi-line)
- Thumbnail Image (Image)
- Resource Type (Option - eBook/Whitepaper/Guide/Checklist)
- Download URL (Link) - or file upload
- File (File upload) - PDF
- Highlight Tags (Plain text)
- Body (Rich text) - description/preview
- Form ID (Plain text) - if gated
- Tags (Multi-reference → Tags collection)
- Categories (Multi-reference → Categories collection)
- Publish Date (Date)
- Featured (Switch)
- SEO Title (Plain text)
- SEO Description (Plain text)
- SEO Image (Image)

---

#### 10. **Services** (30 items)
Service offerings.

**Fields:**
- Title (Plain text, required)
- Slug (Auto-generated)
- Subtext/Description (Plain text, multi-line)
- Icon (Image/SVG)
- Body (Rich text)
- Service Features (Rich text)
- CTA Text (Plain text)
- CTA Link (Link)
- Tags (Multi-reference → Tags collection)
- Related Services (Multi-reference → Services)
- Featured (Switch)
- Sort Order (Number)
- SEO Title (Plain text)
- SEO Description (Plain text)
- SEO Image (Image)

---

### Supporting Collections (Taxonomies & Components)

#### 11. **Tags** (21+ unique tags)
For categorization and filtering.

**Fields:**
- Name (Plain text, required) - e.g., "Microsoft 365", "eCommerce"
- Slug (Auto-generated)
- Description (Plain text, multi-line)
- Color (Color) - for UI
- Icon (Image) - optional

**Content:**
- Digital Workplace
- Microsoft 365
- eCommerce
- Generativ AI
- SharePoint & Teams
- No-code
- CRM
- IT-service & support
- Google Workspace
- Sikkerhet
- (etc.)

---

#### 12. **Categories** (Optional - broader groupings)
Higher-level organization than tags.

**Fields:**
- Name (Plain text, required) - e.g., "Technology", "Marketing"
- Slug (Auto-generated)
- Description (Rich text)
- Icon (Image)

**Suggested Categories:**
- Technology & IT
- Digital Workplace
- eCommerce & Retail
- AI & Automation
- Security
- Training & Education

---

#### 13. **Video Series** (22 items from videoSlider)
Group related videos.

**Fields:**
- Title (Plain text, required)
- Slug (Auto-generated)
- Description (Plain text, multi-line)
- Thumbnail (Image)
- Videos (Multi-reference → Videos) - or handled via reverse reference

---

### Optional Collections

#### **Speakers** (if external speakers are common)
**Fields:**
- Name
- Title/Company
- Bio
- Photo
- LinkedIn

#### **Departments** (for Careers filtering)
**Fields:**
- Name (e.g., "Development", "Consulting")
- Description

---

## 🧩 Handling Nested Components

### Challenge
Storyblok uses nested "bloks" (components within components). Webflow doesn't support this directly.

### Solutions

#### Option 1: **Rich Text Embed**
Store complex layouts as HTML in Rich Text fields.
- ✅ Flexible, supports any layout
- ❌ Not editable in Webflow Designer
- ❌ Requires HTML knowledge

#### Option 2: **JSON Field + Custom Code**
Store nested structure as JSON, parse with JavaScript.
- ✅ Preserves exact structure
- ❌ Complex to edit
- ❌ Requires development

#### Option 3: **Flattening** (RECOMMENDED)
Convert nested components to flat Rich Text with formatting.
- ✅ Easy to edit in Webflow
- ✅ No custom code needed
- ⚠️ May lose some complex layouts

**Example:**
```
Storyblok:
  accordion
    └─ accordionItem (title, text)
        └─ accordionItem (title, text)

Webflow:
  Rich Text field with:
  - H3 headers for accordion titles
  - Paragraphs for accordion text
  - Custom CSS for accordion styling
```

#### Option 4: **Component Collections**
Create collections for reusable components.
- Create "Components" collection
- Each content item references multiple components
- ⚠️ Complex, may hit CMS limits

**Recommendation:** Use **Option 3 (Flattening)** for most content, with **Option 2 (JSON)** for highly complex pages.

---

## 🎨 Component Consolidation

### Storyblok Has 8+ Hero Variants:
- hero
- heroEvent
- heroFrontpage
- heroHowWeWork
- heroSmallImage
- heroWithHighlight
- heroWithImage
- hero25Image

### Webflow Approach:
**One flexible Hero component** with conditional visibility:
- Hero Type (Option field: Standard/Event/Full-width/With-Highlights)
- Conditional show/hide fields based on type
- Or use Webflow's native CMS Designer sections

### Other Component Consolidation:

| Storyblok (Multiple) | Webflow (Unified) |
|---------------------|-------------------|
| 8 hero variants | 1 hero with options |
| callToAction, bigLink, newCta, longCTA | 1 CTA with size/style options |
| bigImage, bodyImage, paragraphImage | Image field with alignment option |
| Video, Webinar, bodyVideo | Videos collection |

---

## 📦 Asset Management Strategy

### Current State
- **2,957 assets** (7.33 GB)
- Large files: 132 MB video, 78 MB GIF, 43 MB JPG
- Mix of JPG, PNG, WebP, MP4, SVG

### Optimization Plan

#### 1. **Image Compression**
- Compress JPG/PNG before upload
- Target: Reduce to ~3-4 GB total
- Tools: TinyPNG, ImageOptim, Squoosh

#### 2. **Video Strategy**
- **Don't upload large videos to Webflow** (expensive, slow)
- Host videos on:
  - **Vimeo** (already using)
  - **YouTube**
  - **Mux** (specialized video hosting)
- Store only video IDs/URLs in Webflow CMS

#### 3. **WebP Conversion**
- Convert large PNGs to WebP
- 30-50% file size reduction
- Webflow supports WebP

#### 4. **SVG Handling**
- Upload SVGs directly (lightweight)
- Use for logos, icons

#### 5. **Lazy Loading**
- Webflow does this automatically ✅

---

## 🔄 Migration Mapping

### Content Type Mapping

| Storyblok Type | Count | Webflow Collection | Notes |
|----------------|-------|-------------------|-------|
| Video | 270 | Videos | Direct mapping |
| Webinar | 2 | Videos | Merge, add "type" field |
| videoSlider | 21 | Video Series | Group related videos |
| project | 123 | Projects | Direct mapping |
| Person | 87 | Team Members | Direct mapping |
| Article | 75 | Articles | Direct mapping |
| News | 34 | News | Direct mapping |
| HubspotPage | 70 | Landing Pages | Merge with Landing |
| Landing | 57 | Landing Pages | Merge with HubspotPage |
| Jobs | 50 | Careers | Direct mapping |
| Arrangmement | 33 | Events | Direct mapping |
| EBook | 31 | Resources | Direct mapping |
| Service | 30 | Services | Direct mapping |
| Kunnskap | 1 | Landing Pages | Or Articles |
| Page | 1 | Landing Pages | Generic pages |

### Field Type Mapping

| Storyblok Field | Webflow Field | Conversion Needed |
|----------------|---------------|-------------------|
| text | Plain text | ✅ Direct |
| textarea | Plain text (multi-line) | ✅ Direct |
| richtext | Rich text | ⚠️ Format conversion |
| asset | Image / File | ✅ Download & re-upload |
| multiasset | Image (multiple) or JSON | ⚠️ May need gallery component |
| datetime | Date | ✅ Direct |
| boolean | Switch | ✅ Direct |
| option | Option (dropdown) | ✅ Direct |
| options (multi-select) | Multi-reference | ⚠️ Create reference collection |
| multilink | Link | ✅ Direct |
| bloks (nested) | Rich text or JSON | ❌ Requires transformation |
| custom (metaFields) | SEO fields | ⚠️ Map to SEO Title/Description |

---

## 🚀 Migration Workflow

### Phase 1: Webflow Setup (Week 1)
1. Create all collections in Webflow
2. Set up field structures
3. Create test content manually to verify

### Phase 2: Content Transformation (Week 2-3)
1. Build transformation scripts for each content type
2. Handle rich text conversion
3. Handle nested components (flatten/JSON)
4. Test with sample content

### Phase 3: Asset Migration (Week 2-3, parallel)
1. Compress/optimize images
2. Upload to Webflow or CDN
3. Update video URLs (Vimeo)

### Phase 4: Content Migration (Week 4)
1. Migrate in batches by content type
2. Start with simple types (Team, Services)
3. Progress to complex types (Projects, Articles)
4. Videos last (largest volume)

### Phase 5: Validation & QA (Week 5)
1. Verify all content migrated
2. Check relationships/references
3. Test pages in Webflow Designer
4. Fix edge cases

---

## 🎯 Webflow Plan Recommendation

### Collection Item Limits

| Webflow Plan | CMS Items | Annual Cost |
|--------------|-----------|-------------|
| CMS | 2,000 | $23/mo |
| Business | 10,000 | $39/mo |
| Enterprise | 10,000+ | Custom |

### Recommendation
**Business Plan** ($39/mo)
- 10,000 CMS items (909 needed + room to grow)
- 25,000 API requests/min (sufficient for migration)
- 200 collections (10-13 needed)

---

## ⚠️ Migration Risks & Mitigation

### Risk 1: Nested Component Complexity
**Impact:** HIGH
**Mitigation:** Flatten to rich text, use JSON for complex cases

### Risk 2: Asset Upload Time
**Impact:** MEDIUM
**Mitigation:** Batch uploads, use Webflow API, compress first

### Risk 3: Custom Field (metaFields)
**Impact:** HIGH
**Mitigation:** Investigate metaFields content, map to standard SEO fields

### Risk 4: Rich Text Format Differences
**Impact:** MEDIUM
**Mitigation:** Build converter (Storyblok schema → Webflow HTML)

### Risk 5: Data Loss
**Impact:** HIGH
**Mitigation:** Keep Storyblok active during transition, thorough QA

---

## 📋 Next Steps

1. **Review & Approve** this CMS design
2. **Create Webflow workspace** (if not exists)
3. **Build first 3 collections** as proof-of-concept:
   - Team Members (simple)
   - Articles (medium complexity)
   - Projects (high complexity)
4. **Test migration** for 1 content type end-to-end
5. **Iterate** based on findings
6. **Build full transformation pipeline**
7. **Execute migration**

---

## 🤝 Questions for Stakeholders

1. Do you want to consolidate Landing + HubspotPage into one collection?
2. Are there any Storyblok components we missed that are critical?
3. How important is preserving exact layouts vs. clean, editable content?
4. What's your Webflow plan budget?
5. Do you need the ability to create new content types in the future?
6. Are videos critical to host in Webflow or OK to keep on Vimeo?
7. Do you want to migrate all 212 draft items or only published content?

---

**Document Version:** 1.0
**Last Updated:** October 17, 2025
**Author:** Claude (Anthropic)
**Contact:** harald@cure.no (for questions)
