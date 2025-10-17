# Storyblok to Webflow CMS Migration Tool

A comprehensive migration tool for migrating Frend's website from Storyblok CMS to Webflow CMS.

## Project Overview

**Client:** Frend (via partner agency)
**Task:** Migrate content from Storyblok to Webflow
**Scale:** 909 content items, 101 components, 2,957 assets (7.33 GB)
**Status:** In Development

### The Challenge

Frend's current Storyblok CMS has become messy over time:
- 101 components defined (component bloat)
- Multiple duplicate/similar components (8 hero variants!)
- Complex nested component structures
- Large asset library needing optimization

We need to migrate to Webflow while **cleaning up and consolidating** the content structure.

## Current State

### Storyblok Content Inventory

| Content Type | Count | Status |
|--------------|-------|--------|
| Videos | 270 | ✅ Analyzed |
| Projects (Portfolio) | 123 | ✅ Analyzed |
| Team Members (Person) | 87 | ✅ Analyzed |
| Articles | 75 | ✅ Analyzed |
| Landing Pages (HubspotPage + Landing) | 127 | ✅ Analyzed |
| Careers (Jobs) | 50 | ✅ Analyzed |
| News | 34 | ✅ Analyzed |
| Events (Arrangmement) | 33 | ✅ Analyzed |
| Resources (EBook) | 31 | ✅ Analyzed |
| Services | 30 | ✅ Analyzed |
| Other | 49 | ✅ Analyzed |
| **TOTAL** | **909** | **697 published, 212 drafts** |

### Assets
- **2,957 files** (7.33 GB)
- Mix of: JPG (1,202), PNG (1,276), MP4 (31), SVG (48), etc.
- Largest file: 132 MB video
- **Needs optimization before migration**

## Tools Provided

### 1. Discovery Tool (`npm run discover`)

Analyzes the Storyblok space and generates comprehensive reports.

**What it does:**
- Fetches all components, stories, and assets from Storyblok
- Analyzes content distribution, tags, folders
- Identifies migration challenges
- Generates JSON reports

**Output:**
- `reports/storyblok-discovery.json` - Full analysis
- `reports/raw-components.json` - All component definitions
- `reports/raw-stories.json` - All content items
- `reports/raw-assets.json` - All assets

**Usage:**
```bash
npm run discover
```

### 2. Web UI (`npm run ui`) ✅ FULLY AUTOMATED

**NEW!** Minimalistic web interface for managing migrations with real-time progress tracking.

**What it does:**
- Run discovery from browser with live output streaming
- Transform content types individually or batch process all
- Real-time progress bars with percentage updates
- Auto-discovery of available transformers from filesystem
- WebSocket-based live updates to activity log
- Auto-refresh data after operations complete

**Features:**
- ✅ Black & white terminal-inspired design (data-focused)
- ✅ Run Discovery button (executes `npm run discover`)
- ✅ Transform All button (batch processes all content types)
- ✅ Individual transform buttons per content type
- ✅ Real-time progress tracking with live percentages
- ✅ Activity log with timestamped events
- ✅ Current operation panel with progress bar
- ✅ Content types table with transformation status

**Usage:**
```bash
npm run ui
```

Then open http://localhost:3000 in your browser (opens automatically).

**See:** `WEB_UI_GUIDE.md` for complete documentation

### 3. Migration Tool (`npm run migrate`) - IN DEVELOPMENT

Transforms and migrates content from Storyblok to Webflow.

**Features:**
- Content transformation (Storyblok → Webflow format)
- Rich text conversion
- Asset optimization & upload
- Dry-run mode for testing
- Batch processing with rate limiting
- Rollback capabilities

**Usage:**
```bash
# Dry run (no actual changes)
npm run migrate -- --dry-run

# Migrate specific content type
npm run migrate -- --type=team-members

# Migrate everything
npm run migrate
```

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Storyblok Management API token (Personal Access Token)
- Webflow API token (when ready to migrate)

### Installation

```bash
# Clone repository
cd frend-x-cure

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Configuration

Edit `.env` file:

```env
# Storyblok
STORYBLOK_TOKEN=your_personal_access_token
STORYBLOK_SPACE_ID=139140

# Webflow (coming soon)
WEBFLOW_API_TOKEN=your_api_token
WEBFLOW_SITE_ID=your_site_id
```

### Run Discovery

```bash
npm run discover
```

Check the `reports/` folder for analysis results.

## Project Structure

```
frend-x-cure/
├── README.md                    # This file
├── ARCHITECTURE.md              # Technical architecture
├── PROJECT_CONTEXT.md           # Full project context & decisions
├── WEBFLOW_CMS_DESIGN.md        # Webflow CMS structure design
├── WEB_UI_GUIDE.md              # Web UI documentation (✅ NEW!)
├── SESSION_SUMMARY.md           # Session summary
├── package.json
├── .env                         # Environment variables (gitignored)
├── .env.example                 # Template for .env
├── .gitignore
│
├── src/
│   ├── discover.js              # Discovery tool (✅ Complete)
│   ├── ui-server.js             # Web UI server (✅ Complete)
│   ├── test-transform.js        # Test transformation runner (✅ Complete)
│   ├── migrate.js               # Main migration orchestrator (🚧 In Progress)
│   │
│   ├── transformers/            # Content transformers
│   │   ├── base.js              # Base transformer class (✅ Complete)
│   │   ├── team-members.js      # Team Members transformer (✅ Complete)
│   │   ├── articles.js          # Articles transformer (🚧 Coming)
│   │   ├── videos.js            # Videos transformer (🚧 Coming)
│   │   └── ...                  # One per content type
│   │
│   ├── converters/              # Format converters
│   │   ├── richtext.js          # Storyblok → Webflow rich text (✅ Complete)
│   │   └── assets.js            # Asset optimization & upload (🚧 Coming)
│   │
│   ├── clients/                 # API clients
│   │   ├── storyblok.js         # Storyblok API wrapper (🚧 Coming)
│   │   └── webflow.js           # Webflow API wrapper (🚧 Coming)
│   │
│   └── utils/                   # Utility functions
│       ├── logger.js            # Logging utility (🚧 Coming)
│       ├── rate-limiter.js      # API rate limiting (🚧 Coming)
│       └── validation.js        # Data validation (🚧 Coming)
│
├── ui/                          # Web interface (✅ NEW!)
│   └── index.html               # Minimalistic web UI
│
├── reports/                     # Generated reports (✅ Complete)
│   ├── storyblok-discovery.json # Full discovery report
│   ├── raw-components.json      # 101 components
│   ├── raw-stories.json         # 909 stories
│   ├── raw-assets.json          # 2,957 assets
│   └── migration-*.json         # Migration run reports
│
├── output/                      # Migration output (gitignored)
│   ├── transformed/             # Transformed content (JSON)
│   │   └── team-members.json    # 87 transformed team members (✅ Complete)
│   ├── optimized-assets/        # Compressed images (🚧 Coming)
│   └── logs/                    # Migration logs (🚧 Coming)
│
└── tests/                       # Tests (🚧 Coming soon)
    ├── transformers/
    └── converters/
```

## Migration Strategy

See `WEBFLOW_CMS_DESIGN.md` for the complete Webflow CMS design.

### Phases

#### Phase 1: Discovery & Planning ✅ COMPLETE
- [x] Analyze Storyblok content
- [x] Design Webflow CMS structure
- [x] Identify migration challenges
- [x] Create migration strategy

#### Phase 2: Tool Development 🚧 IN PROGRESS
- [x] Build discovery tool
- [ ] Build transformation pipeline
- [ ] Build asset optimizer
- [ ] Build Webflow uploader
- [ ] Test with sample content

#### Phase 3: Proof of Concept
- [ ] Migrate Team Members (simplest)
- [ ] Migrate Articles (medium complexity)
- [ ] Migrate Projects (most complex)
- [ ] Validate in Webflow
- [ ] Iterate based on findings

#### Phase 4: Full Migration
- [ ] Optimize all assets
- [ ] Transform all content
- [ ] Upload to Webflow
- [ ] Validate all content
- [ ] Fix edge cases

#### Phase 5: Go Live
- [ ] Final QA
- [ ] DNS/domain switch
- [ ] Monitor for issues
- [ ] Decommission Storyblok

## Key Design Decisions

### Content Consolidation

**Before (Storyblok):** 101 components
**After (Webflow):** 10-12 collections

**Example:**
- 8 hero components → 1 flexible hero component
- HubspotPage + Landing → 1 Landing Pages collection
- Video + Webinar → 1 Videos collection

### Nested Components

**Problem:** Storyblok uses nested "bloks", Webflow doesn't support nested collections.

**Solution:** Flatten nested structures into Rich Text fields with proper HTML formatting.

**Example:**
```
Storyblok:
  accordion
    └─ accordionItem
        ├─ title
        └─ text (richtext)

Webflow:
  Rich Text field:
    <h3>Accordion Title</h3>
    <p>Accordion content...</p>
```

### Asset Strategy

**Problem:** 2,957 assets (7.33 GB) is too large and expensive for Webflow.

**Solution:**
1. **Compress images** (target: 50% reduction → ~3.5 GB)
2. **Keep videos on Vimeo** (already hosted there)
3. **Convert PNGs to WebP** where appropriate
4. **Upload optimized versions only**

### Rich Text Conversion

**Problem:** Storyblok and Webflow use different rich text formats.

**Solution:** Build converter:
- Storyblok uses custom JSON schema
- Webflow uses HTML
- Map Storyblok nodes → HTML tags
- Preserve formatting, links, images

## APIs Used

### Storyblok Management API

**Base URL:** `https://mapi.storyblok.com/v1`

**Authentication:** Personal Access Token in `Authorization` header

**Key Endpoints:**
- `GET /spaces/{space_id}/components` - Get all components
- `GET /spaces/{space_id}/stories` - Get all content
- `GET /spaces/{space_id}/assets` - Get all assets

**Rate Limits:** 6 requests/second

**Documentation:** https://www.storyblok.com/docs/api/management

### Webflow API (Coming Soon)

**Base URL:** `https://api.webflow.com/v2`

**Authentication:** Bearer token

**Key Endpoints:**
- `POST /collections/{collection_id}/items` - Create collection item
- `POST /sites/{site_id}/assets` - Upload asset

**Rate Limits:** Varies by plan

**Documentation:** https://developers.webflow.com/

## Development Workflow

### Making Changes

1. **Pull latest code**
   ```bash
   git pull
   ```

2. **Create feature branch**
   ```bash
   git checkout -b feature/add-video-transformer
   ```

3. **Make changes & test**
   ```bash
   npm run discover  # Test discovery
   npm test          # Run tests (when available)
   ```

4. **Commit & push**
   ```bash
   git add .
   git commit -m "Add video content transformer"
   git push origin feature/add-video-transformer
   ```

### Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- transformers/team-members

# Test with dry-run
npm run migrate -- --dry-run --type=team-members
```

## Common Tasks

### Re-run Discovery

```bash
npm run discover
```

### Test a Transformer

```bash
# Transform team members (dry run)
node src/transformers/team-members.js --dry-run
```

### Optimize Assets

```bash
# Compress all images in reports/raw-assets.json
npm run optimize-assets
```

### Check Migration Status

```bash
# View latest migration report
cat reports/migration-$(date +%Y%m%d)*.json | jq
```

## Troubleshooting

### Discovery fails with "Unauthorized"

Check your `.env` file:
- Ensure `STORYBLOK_TOKEN` is correct
- Token format: `so12...` (starts with "so")
- Token must have read access to space 139140

### Rate limit errors

The tool has built-in rate limiting, but if you still hit limits:
- Wait 60 seconds
- Reduce `perPage` in `src/discover.js`
- Add delays between requests

### Missing content in reports

Check:
- Token has access to all content
- Content is not archived/deleted
- Folder permissions in Storyblok

## Next Steps

### Immediate (This Session)
- [ ] Create Team Members transformer
- [ ] Build rich text converter
- [ ] Test transformation on sample content

### Short-term (Next Session)
- [ ] Get Webflow API credentials
- [ ] Create Webflow collections manually (test)
- [ ] Upload transformed content to Webflow
- [ ] Validate results

### Medium-term
- [ ] Build remaining transformers
- [ ] Optimize all assets
- [ ] Full dry-run migration
- [ ] QA & validation

### Long-term
- [ ] Execute production migration
- [ ] Monitor Webflow site
- [ ] Training & handoff
- [ ] Decommission Storyblok

## Contributing

This is a private project for Frend's migration. If you're working on this:

1. Read `ARCHITECTURE.md` for technical details
2. Read `PROJECT_CONTEXT.md` for full context
3. Follow the code style (use existing files as examples)
4. Test thoroughly before committing
5. Document any new decisions in this README

## Support

**Project Contact:** harald@cure.no
**Agency:** Cure (Digital Design Agency)
**Client:** Frend

## License

Proprietary - All rights reserved by Cure and Frend.

---

**Last Updated:** October 17, 2025
**Version:** 0.1.0 (In Development)
