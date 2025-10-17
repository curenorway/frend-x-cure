# Architecture Documentation

Technical architecture and design for the Storyblok to Webflow migration tool.

## System Overview

```
┌─────────────────┐
│   Storyblok     │
│   (Source CMS)  │
└────────┬────────┘
         │ Management API
         │ (Read Only)
         ▼
┌─────────────────────────────────────┐
│     Migration Tool (Node.js)         │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  1. Discovery                  │ │
│  │     - Fetch all content        │ │
│  │     - Analyze structure        │ │
│  │     - Generate reports         │ │
│  └────────────────────────────────┘ │
│                │                     │
│                ▼                     │
│  ┌────────────────────────────────┐ │
│  │  2. Transformation             │ │
│  │     - Map content types        │ │
│  │     - Convert rich text        │ │
│  │     - Flatten nested           │ │
│  │     - Optimize assets          │ │
│  └────────────────────────────────┘ │
│                │                     │
│                ▼                     │
│  ┌────────────────────────────────┐ │
│  │  3. Validation                 │ │
│  │     - Check required fields    │ │
│  │     - Verify references        │ │
│  │     - Validate assets          │ │
│  └────────────────────────────────┘ │
│                │                     │
│                ▼                     │
│  ┌────────────────────────────────┐ │
│  │  4. Upload                     │ │
│  │     - Batch upload             │ │
│  │     - Rate limiting            │ │
│  │     - Error handling           │ │
│  └────────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │ Webflow API
               ▼
┌─────────────────┐
│    Webflow      │
│ (Target CMS)    │
└─────────────────┘
```

## Component Architecture

### 1. Discovery Layer

**Purpose:** Analyze Storyblok space to understand content structure.

**Components:**
- `src/discover.js` - Main discovery script
- `src/clients/storyblok.js` - Storyblok API wrapper

**Flow:**
```
1. Fetch space metadata
2. Fetch all components (content types)
3. Fetch all stories (content items) - paginated
4. Fetch all assets - paginated
5. Analyze and generate reports
6. Save to reports/ directory
```

**Outputs:**
- `reports/storyblok-discovery.json` - Complete analysis
- `reports/raw-components.json` - Component definitions
- `reports/raw-stories.json` - All content items
- `reports/raw-assets.json` - All assets

**Key Features:**
- Automatic pagination handling
- Built-in rate limiting (6 req/sec)
- Error handling and retry logic
- Progress logging

### 2. Transformation Layer

**Purpose:** Convert Storyblok content to Webflow format.

**Architecture:**
```
src/transformers/
├── base.js               # Base transformer class
├── team-members.js       # Transform Person → Team Members
├── articles.js           # Transform Article → Articles
├── videos.js             # Transform Video/Webinar → Videos
├── projects.js           # Transform project → Projects
├── landing-pages.js      # Transform HubspotPage/Landing → Landing Pages
├── careers.js            # Transform Jobs → Careers
├── news.js               # Transform News → News
├── events.js             # Transform Arrangmement → Events
├── resources.js          # Transform EBook → Resources
└── services.js           # Transform Service → Services
```

**Base Transformer Class:**

```javascript
class BaseTransformer {
  constructor(storyblokItem) {
    this.source = storyblokItem;
  }

  // Override in subclasses
  transform() {
    throw new Error('Must implement transform()');
  }

  // Shared utilities
  extractSEO() { /* ... */ }
  convertRichText(richtext) { /* ... */ }
  resolveAsset(assetUrl) { /* ... */ }
  validate(output) { /* ... */ }
}
```

**Example Transformer (Team Members):**

```javascript
class TeamMemberTransformer extends BaseTransformer {
  transform() {
    return {
      name: this.source.name,
      slug: this.source.slug,
      role: this.source.content.role,
      email: this.source.content.email,
      phone: this.source.content.phone,
      profileImage: this.resolveAsset(this.source.content.image),
      altImage: this.resolveAsset(this.source.content.altImage),
      // ... more fields
    };
  }
}
```

### 3. Converter Layer

**Purpose:** Convert specific formats between Storyblok and Webflow.

#### Rich Text Converter (`src/converters/richtext.js`)

Converts Storyblok's JSON rich text format to Webflow's HTML.

**Storyblok Format:**
```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Title" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Hello " },
        {
          "type": "text",
          "text": "world",
          "marks": [{ "type": "bold" }]
        }
      ]
    },
    {
      "type": "bullet_list",
      "content": [
        {
          "type": "list_item",
          "content": [
            {
              "type": "paragraph",
              "content": [{ "type": "text", "text": "Item 1" }]
            }
          ]
        }
      ]
    }
  ]
}
```

**Webflow Format:**
```html
<h2>Title</h2>
<p>Hello <strong>world</strong></p>
<ul>
  <li>Item 1</li>
</ul>
```

**Node Type Mapping:**
| Storyblok Type | Webflow HTML |
|----------------|--------------|
| heading (level 1) | `<h1>` |
| heading (level 2) | `<h2>` |
| heading (level 3) | `<h3>` |
| paragraph | `<p>` |
| bold (mark) | `<strong>` |
| italic (mark) | `<em>` |
| link (mark) | `<a href="">` |
| bullet_list | `<ul>` |
| ordered_list | `<ol>` |
| list_item | `<li>` |
| code_block | `<pre><code>` |
| blockquote | `<blockquote>` |
| horizontal_rule | `<hr>` |
| image | `<img src="">` |

#### Asset Converter (`src/converters/assets.js`)

Optimizes and converts assets for Webflow.

**Workflow:**
```
1. Download asset from Storyblok URL
2. Identify file type
3. Apply optimization:
   - Images: Compress, resize, convert to WebP if beneficial
   - Videos: Skip (keep on Vimeo)
   - SVGs: Minify
   - PDFs: Keep as-is
4. Save to output/optimized-assets/
5. Generate upload manifest
```

**Optimization Rules:**
```javascript
{
  jpg: { quality: 85, maxWidth: 2400, maxHeight: 2400 },
  png: { quality: 90, maxWidth: 2400, convertToWebP: true },
  webp: { quality: 85, maxWidth: 2400 },
  svg: { minify: true },
  mp4: { skip: true }, // Keep on Vimeo
  pdf: { skip: false }
}
```

### 4. Upload Layer

**Purpose:** Upload transformed content and assets to Webflow.

**Components:**
- `src/clients/webflow.js` - Webflow API wrapper
- `src/migrate.js` - Migration orchestrator

**Workflow:**
```
1. Load transformed content from output/transformed/
2. For each content type:
   a. Batch into groups (e.g., 50 items)
   b. Upload batch with rate limiting
   c. Handle errors (retry, log, continue)
   d. Verify upload
3. Upload optimized assets
4. Update references (asset URLs, related content)
5. Generate migration report
```

**Rate Limiting:**
- Webflow API limits vary by plan
- Implementation: Token bucket algorithm
- Configurable: requests per second, burst size

**Error Handling:**
```javascript
{
  retryableErrors: ['RATE_LIMIT', 'TIMEOUT', 'SERVER_ERROR'],
  maxRetries: 3,
  retryDelay: 1000, // exponential backoff
  onError: 'continue', // or 'abort'
}
```

## Data Flow

### Transformation Pipeline

```
┌─────────────────────┐
│  Storyblok Story    │
│  {                  │
│    name: "..."      │
│    content: {...}   │
│    content_type:    │
│      "Person"       │
│  }                  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Transformer        │
│  Selection          │
│  (based on          │
│   content_type)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  TeamMember         │
│  Transformer        │
│  - Map fields       │
│  - Convert richtext │
│  - Resolve assets   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Validation         │
│  - Required fields  │
│  - Field types      │
│  - References exist │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Webflow Item       │
│  {                  │
│    name: "..."      │
│    slug: "..."      │
│    role: "..."      │
│    fieldData: {...} │
│  }                  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Upload to Webflow  │
│  POST /collections/ │
│       {id}/items    │
└─────────────────────┘
```

## API Integrations

### Storyblok Management API

**Base URL:** `https://mapi.storyblok.com/v1`

**Authentication:**
```javascript
headers: {
  'Authorization': process.env.STORYBLOK_TOKEN
}
```

**Key Endpoints:**

| Endpoint | Method | Purpose | Rate Limit |
|----------|--------|---------|------------|
| `/spaces/{id}` | GET | Get space info | 6/sec |
| `/spaces/{id}/components` | GET | List components | 6/sec |
| `/spaces/{id}/stories` | GET | List stories | 6/sec |
| `/spaces/{id}/stories/{id}` | GET | Get single story | 6/sec |
| `/spaces/{id}/assets` | GET | List assets | 6/sec |

**Pagination:**
```javascript
{
  per_page: 100, // max 100
  page: 1        // 1-indexed
}
```

**Response Format:**
```javascript
{
  stories: [...],  // or components, assets
  // No total in headers for Management API
  // Must check if result.length === per_page for more pages
}
```

### Webflow API v2

**Base URL:** `https://api.webflow.com/v2`

**Authentication:**
```javascript
headers: {
  'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
  'accept': 'application/json',
  'content-type': 'application/json'
}
```

**Key Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/sites/{id}` | GET | Get site info |
| `/sites/{id}/collections` | GET | List collections |
| `/collections/{id}` | GET | Get collection |
| `/collections/{id}/items` | GET | List items |
| `/collections/{id}/items` | POST | Create item |
| `/collections/{id}/items/{id}` | PATCH | Update item |
| `/sites/{id}/assets` | POST | Upload asset |

**Create Item Request:**
```javascript
POST /collections/{collection_id}/items
{
  "fieldData": {
    "name": "John Doe",
    "slug": "john-doe",
    "role": "Developer",
    "email": "john@example.com"
    // ... more fields
  }
}
```

**Rate Limits:** (Business Plan)
- 60 requests per minute per site
- 25,000 requests per minute across all sites

## Error Handling Strategy

### Error Types

1. **Network Errors**
   - Timeout
   - Connection refused
   - DNS failure
   - **Strategy:** Retry with exponential backoff

2. **API Errors**
   - 401 Unauthorized → Invalid token
   - 403 Forbidden → Insufficient permissions
   - 404 Not Found → Resource doesn't exist
   - 429 Rate Limit → Wait and retry
   - 500 Server Error → Retry
   - **Strategy:** Log, retry if retryable, abort if fatal

3. **Data Errors**
   - Missing required field
   - Invalid field type
   - Broken reference
   - **Strategy:** Log, skip item, continue

4. **Transform Errors**
   - Rich text conversion failure
   - Asset download failure
   - Unknown content type
   - **Strategy:** Log, use fallback, continue

### Error Logging

```javascript
{
  timestamp: '2025-10-17T10:00:00.000Z',
  level: 'error',
  phase: 'transform',
  contentType: 'Person',
  itemId: '12345',
  itemName: 'John Doe',
  error: {
    type: 'MissingRequiredField',
    field: 'email',
    message: 'Field email is required but missing'
  },
  context: { /* additional data */ }
}
```

**Log Destinations:**
- Console (real-time progress)
- File: `output/logs/migration-{timestamp}.log`
- File: `output/logs/errors-{timestamp}.json`

## Data Validation

### Validation Levels

**1. Schema Validation**
```javascript
{
  name: { type: 'string', required: true },
  slug: { type: 'string', required: true, pattern: /^[a-z0-9-]+$/ },
  email: { type: 'email', required: false },
  role: { type: 'string', required: false, maxLength: 100 }
}
```

**2. Reference Validation**
```javascript
// Ensure referenced items exist
{
  relatedArticles: {
    type: 'reference',
    collection: 'articles',
    validate: (ids) => ids.every(id => articleIds.includes(id))
  }
}
```

**3. Asset Validation**
```javascript
// Ensure assets exist and are accessible
{
  profileImage: {
    type: 'asset',
    validate: async (url) => {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    }
  }
}
```

## Performance Considerations

### Optimization Strategies

**1. Batching**
- Process items in batches (e.g., 50 at a time)
- Reduces API calls
- Better error isolation

**2. Caching**
- Cache transformed items to disk
- Avoid re-transforming on retry
- Resume capability

**3. Parallel Processing**
- Transform multiple items concurrently
- Limit concurrency to avoid overwhelming APIs
- Use worker pool (e.g., 5 workers)

**4. Lazy Asset Download**
- Download assets only when needed
- Skip already optimized assets
- Progressive download during upload

**5. Incremental Migration**
- Migrate by content type
- Allow pausing and resuming
- Track migration state

### Memory Management

```javascript
// Stream large files instead of loading into memory
const stream = fs.createReadStream(assetPath);
await uploadStream(stream);

// Clear processed items from memory
processedItems = null;

// Use generators for large datasets
function* batchItems(items, batchSize) {
  for (let i = 0; i < items.length; i += batchSize) {
    yield items.slice(i, i + batchSize);
  }
}
```

## Security Considerations

### Credential Management

**Environment Variables:**
```bash
# .env (gitignored)
STORYBLOK_TOKEN=so12...
STORYBLOK_SPACE_ID=139140
WEBFLOW_API_TOKEN=...
WEBFLOW_SITE_ID=...
```

**Never commit:**
- API tokens
- Space/Site IDs
- `.env` file
- Reports with sensitive data

### API Token Permissions

**Storyblok Token:**
- Read-only access sufficient
- Management API access required
- Should NOT have write/delete permissions

**Webflow Token:**
- Scopes needed:
  - `sites:read`
  - `collections:read`
  - `collections:write`
  - `assets:write`

## Testing Strategy

### Unit Tests

```javascript
// Example: Rich text converter tests
describe('RichTextConverter', () => {
  test('converts bold text', () => {
    const input = {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] }
      ]
    };
    expect(convert(input)).toBe('<p><strong>Bold</strong></p>');
  });
});
```

### Integration Tests

```javascript
// Example: Transformer integration test
describe('TeamMemberTransformer', () => {
  test('transforms full Person story', () => {
    const story = loadFixture('person-sample.json');
    const transformer = new TeamMemberTransformer(story);
    const result = transformer.transform();

    expect(result.name).toBe('John Doe');
    expect(result.role).toBe('Developer');
    expect(result.slug).toMatch(/^[a-z0-9-]+$/);
  });
});
```

### End-to-End Tests

```javascript
// Example: Full migration dry run
describe('Migration (dry run)', () => {
  test('migrates 5 team members', async () => {
    const result = await migrate({
      type: 'team-members',
      limit: 5,
      dryRun: true
    });

    expect(result.success).toBe(true);
    expect(result.processed).toBe(5);
    expect(result.errors).toBe(0);
  });
});
```

## Monitoring & Observability

### Progress Tracking

```javascript
{
  phase: 'transform',
  contentType: 'articles',
  processed: 45,
  total: 75,
  percentage: 60,
  eta: '2 minutes',
  errors: 2
}
```

### Metrics

- Items processed per second
- API calls per minute
- Error rate
- Average transform time
- Asset optimization savings (MB)

### Reporting

**Migration Report:**
```json
{
  "startTime": "2025-10-17T10:00:00.000Z",
  "endTime": "2025-10-17T10:30:00.000Z",
  "duration": "30 minutes",
  "summary": {
    "totalItems": 909,
    "successful": 897,
    "failed": 12,
    "skipped": 0
  },
  "byContentType": {
    "team-members": { "total": 87, "success": 87, "failed": 0 },
    "articles": { "total": 75, "success": 73, "failed": 2 }
  },
  "assets": {
    "optimized": 2100,
    "uploaded": 2100,
    "spaceSaved": "3.2 GB"
  },
  "errors": [
    {
      "item": "article-123",
      "error": "Missing required field: slug"
    }
  ]
}
```

## Future Enhancements

### Phase 1 (MVP)
- [x] Discovery tool
- [ ] Team Members transformer
- [ ] Rich text converter
- [ ] Basic asset optimizer
- [ ] Webflow uploader

### Phase 2
- [ ] All content type transformers
- [ ] Advanced asset optimization
- [ ] Resume capability
- [ ] Detailed error reporting

### Phase 3
- [ ] Web UI for monitoring
- [ ] Real-time progress dashboard
- [ ] Automated rollback
- [ ] Content diff tool (before/after)

### Phase 4
- [ ] AI-assisted content cleanup
- [ ] Automated image alt-text generation
- [ ] SEO optimization suggestions
- [ ] Content quality scoring

---

**Version:** 1.0
**Last Updated:** October 17, 2025
