/**
 * Minimalistic Web UI Server
 *
 * Terminal-inspired web interface for the migration tool.
 * Black and white, data-focused, no fancy styling.
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transformTeamMembers } from './transformers/team-members.js';
import { transformVideos } from './transformers/videos.js';
import { transformProjects } from './transformers/projects.js';
import { transformArticles } from './transformers/articles.js';
import { transformNews } from './transformers/news.js';
import { createWebflowClient, mapToWebflowFields } from './integrations/webflow.js';
import { createAIGenerator } from './integrations/ai-collection-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

const PORT = process.env.PORT || 3000;

// HTTP Basic Authentication middleware
const basicAuth = (req, res, next) => {
  // Skip auth if credentials are not set (for local development)
  const authUsername = process.env.AUTH_USERNAME;
  const authPassword = process.env.AUTH_PASSWORD;

  if (!authUsername || !authPassword) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Migration Dashboard"');
    return res.status(401).send('Authentication required');
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  if (username === authUsername && password === authPassword) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Migration Dashboard"');
  return res.status(401).send('Invalid credentials');
};

// Apply auth to all routes
app.use(basicAuth);

// Store active connections
const clients = new Set();

// Store operation logs
const operationLog = [];

// Serve static files from ui directory
app.use(express.static(path.join(__dirname, '../ui')));

// Serve reports directory
app.use('/reports', express.static(path.join(__dirname, '../reports')));

// API: Get discovery report
app.get('/api/discovery', (req, res) => {
  try {
    const report = JSON.parse(
      fs.readFileSync('./reports/storyblok-discovery.json', 'utf-8')
    );
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Discovery report not found. Run: npm run discover' });
  }
});

// API: Get transformation results
app.get('/api/transformed/:type', (req, res) => {
  const type = req.params.type;
  const filePath = `./output/transformed/${type}.json`;

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: `No transformed data for ${type}` });
  }
});

// API: Run discovery
app.post('/api/run-discovery', (req, res) => {
  broadcast({ type: 'discovery-start' });

  const discovery = spawn('npm', ['run', 'discover'], {
    cwd: path.join(__dirname, '..'),
    shell: true
  });

  let output = '';

  discovery.stdout.on('data', (data) => {
    const message = data.toString();
    output += message;
    broadcast({ type: 'discovery-output', message: message.trim() });
  });

  discovery.stderr.on('data', (data) => {
    const message = data.toString();
    output += message;
    broadcast({ type: 'discovery-output', message: message.trim() });
  });

  discovery.on('close', (code) => {
    if (code === 0) {
      broadcast({ type: 'discovery-complete' });
      res.json({ success: true, output });
    } else {
      broadcast({ type: 'discovery-error', error: 'Discovery failed' });
      res.status(500).json({ success: false, error: 'Discovery failed', output });
    }
  });

  discovery.on('error', (error) => {
    broadcast({ type: 'discovery-error', error: error.message });
    res.status(500).json({ success: false, error: error.message });
  });
});

// API: Get available transformers
app.get('/api/transformers', (req, res) => {
  try {
    const transformersDir = path.join(__dirname, 'transformers');
    const files = fs.readdirSync(transformersDir);

    const transformers = files
      .filter(f => f.endsWith('.js') && f !== 'base.js')
      .map(f => {
        const name = f.replace('.js', '');
        return {
          id: name,
          name: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          available: true
        };
      });

    res.json(transformers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Validate content
app.get('/api/validate', (req, res) => {
  try {
    const stories = JSON.parse(fs.readFileSync('./reports/raw-stories.json', 'utf-8'));
    const errors = [];
    const warnings = [];

    stories.forEach(story => {
      const content = story.content || {};

      // Check for missing required fields
      if (!story.name) errors.push({ id: story.id, field: 'name', message: 'Missing name' });
      if (!story.slug) errors.push({ id: story.id, field: 'slug', message: 'Missing slug' });

      // Check for empty content
      if (Object.keys(content).length === 0) {
        warnings.push({ id: story.id, message: 'Empty content object' });
      }

      // Check slug format
      if (story.slug && story.slug.includes(' ')) {
        warnings.push({ id: story.id, field: 'slug', message: 'Slug contains spaces' });
      }
    });

    res.json({ total: stories.length, errors, warnings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get assets info
app.get('/api/assets', (req, res) => {
  try {
    const assets = JSON.parse(fs.readFileSync('./reports/raw-assets.json', 'utf-8'));

    const analysis = {
      total: assets.length,
      byType: {},
      totalSize: 0,
      largest: []
    };

    assets.forEach(asset => {
      const ext = asset.filename?.split('.').pop()?.toLowerCase() || 'unknown';
      analysis.byType[ext] = (analysis.byType[ext] || 0) + 1;

      if (asset.content_length) {
        analysis.totalSize += asset.content_length;
      }
    });

    analysis.largest = assets
      .filter(a => a.content_length)
      .sort((a, b) => b.content_length - a.content_length)
      .slice(0, 10)
      .map(a => ({
        filename: a.filename,
        size: a.content_length,
        sizeReadable: (a.content_length / 1024 / 1024).toFixed(2) + ' MB'
      }));

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get operation log
app.get('/api/operations', (req, res) => {
  res.json(operationLog.slice(-100)); // Last 100 operations
});

// API: Export data
app.get('/api/export/:type', (req, res) => {
  const type = req.params.type;

  try {
    let data;
    let filename;

    if (type === 'discovery') {
      data = fs.readFileSync('./reports/storyblok-discovery.json', 'utf-8');
      filename = 'discovery-report.json';
    } else {
      data = fs.readFileSync(`./output/transformed/${type}.json`, 'utf-8');
      filename = `transformed-${type}.json`;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

// API: Transform single item
app.post('/api/transform-single', async (req, res) => {
  const { itemId, contentType } = req.body;

  try {
    const allStories = JSON.parse(fs.readFileSync('./reports/raw-stories.json', 'utf-8'));
    const story = allStories.find(s => s.id === itemId);

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    let result;
    let results;

    switch (story.content_type) {
      case 'Person':
        results = transformTeamMembers([story]);
        result = results.items[0];
        break;

      case 'Video':
        results = transformVideos([story]);
        result = results.items[0];
        break;

      case 'project':
        results = transformProjects([story]);
        result = results.items[0];
        break;

      case 'Article':
        results = transformArticles([story]);
        result = results.items[0];
        break;

      case 'News':
        results = transformNews([story]);
        result = results.items[0];
        break;

      default:
        return res.status(400).json({
          error: 'Transformer not available for this type',
          contentType: story.content_type,
          availableTypes: ['Person', 'Video', 'project', 'Article', 'News']
        });
    }

    // Log operation
    operationLog.push({
      timestamp: new Date().toISOString(),
      type: 'transform-single',
      itemId,
      contentType: story.content_type,
      success: true
    });

    res.json({ success: true, result });
  } catch (error) {
    operationLog.push({
      timestamp: new Date().toISOString(),
      type: 'transform-single',
      itemId,
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

// API: Bulk transform selected items
app.post('/api/transform-bulk', async (req, res) => {
  const { itemIds } = req.body;

  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: 'Invalid item IDs' });
  }

  try {
    const allStories = JSON.parse(fs.readFileSync('./reports/raw-stories.json', 'utf-8'));
    const selectedStories = allStories.filter(s => itemIds.includes(s.id));

    // Group by content type
    const byType = {};
    selectedStories.forEach(story => {
      const type = story.content_type;
      if (!byType[type]) byType[type] = [];
      byType[type].push(story);
    });

    const results = {
      total: selectedStories.length,
      successful: 0,
      failed: 0,
      byType: {}
    };

    // Transform each type
    for (const [type, stories] of Object.entries(byType)) {
      broadcast({
        type: 'bulk-transform-progress',
        contentType: type,
        current: results.successful + results.failed,
        total: selectedStories.length
      });

      try {
        let transformed;

        switch (type) {
          case 'Person':
            transformed = transformTeamMembers(stories);
            break;
          case 'Video':
            transformed = transformVideos(stories);
            break;
          case 'project':
            transformed = transformProjects(stories);
            break;
          case 'Article':
            transformed = transformArticles(stories);
            break;
          case 'News':
            transformed = transformNews(stories);
            break;
          default:
            results.failed += stories.length;
            results.byType[type] = { error: 'No transformer available' };
            continue;
        }

        results.successful += transformed.successful;
        results.failed += transformed.failed;
        results.byType[type] = transformed;
      } catch (error) {
        results.failed += stories.length;
        results.byType[type] = { error: error.message };
      }
    }

    // Log operation
    operationLog.push({
      timestamp: new Date().toISOString(),
      type: 'transform-bulk',
      itemCount: itemIds.length,
      successful: results.successful,
      failed: results.failed
    });

    broadcast({
      type: 'bulk-transform-complete',
      results
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Run transformation
app.post('/api/transform/:type', async (req, res) => {
  const type = req.params.type;

  broadcast({ type: 'transform-start', contentType: type });

  try {
    let results;

    const allStories = JSON.parse(
      fs.readFileSync('./reports/raw-stories.json', 'utf-8')
    );

    let filteredStories;
    let transformer;
    let outputFilename;

    switch (type) {
      case 'team-members':
        filteredStories = allStories.filter(s => s.content_type === 'Person');
        transformer = transformTeamMembers;
        outputFilename = 'team-members.json';
        break;

      case 'videos':
        filteredStories = allStories.filter(s => s.content_type === 'Video');
        transformer = transformVideos;
        outputFilename = 'videos.json';
        break;

      case 'projects':
        filteredStories = allStories.filter(s => s.content_type === 'project');
        transformer = transformProjects;
        outputFilename = 'projects.json';
        break;

      case 'articles':
        filteredStories = allStories.filter(s => s.content_type === 'Article');
        transformer = transformArticles;
        outputFilename = 'articles.json';
        break;

      case 'news':
        filteredStories = allStories.filter(s => s.content_type === 'News');
        transformer = transformNews;
        outputFilename = 'news.json';
        break;

      default:
        return res.status(400).json({
          error: `Unknown content type: ${type}`,
          availableTypes: ['team-members', 'videos', 'projects', 'articles', 'news']
        });
    }

    broadcast({
      type: 'transform-progress',
      contentType: type,
      current: 0,
      total: filteredStories.length,
      percentage: 0
    });

    // Transform with progress updates
    results = transformer(filteredStories);

    broadcast({
      type: 'transform-progress',
      contentType: type,
      current: filteredStories.length,
      total: filteredStories.length,
      percentage: 100
    });

    // Save results
    const outputPath = `./output/transformed/${outputFilename}`;
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

    broadcast({
      type: 'transform-complete',
      contentType: type,
      results: results
    });

    res.json(results);

  } catch (error) {
    broadcast({
      type: 'transform-error',
      contentType: type,
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

// API: Upload to Webflow - Get collections
app.get('/api/webflow/collections', async (req, res) => {
  try {
    const webflow = createWebflowClient();
    const collections = await webflow.getCollections();

    operationLog.push({
      timestamp: new Date().toISOString(),
      type: 'webflow-list-collections',
      success: true
    });

    res.json(collections);
  } catch (error) {
    operationLog.push({
      timestamp: new Date().toISOString(),
      type: 'webflow-list-collections',
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

// API: Upload transformed data to Webflow
app.post('/api/webflow/upload', async (req, res) => {
  const { contentType, collectionId, dryRun = true } = req.body;

  try {
    // Load transformed data
    const filePath = `./output/transformed/${contentType}.json`;
    const transformedData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (!transformedData.items || transformedData.items.length === 0) {
      return res.status(400).json({ error: 'No items to upload' });
    }

    // Map to Webflow fields
    const webflowItems = transformedData.items.map(item =>
      mapToWebflowFields(item, contentType)
    );

    if (dryRun) {
      // Validate only, don't upload
      const webflow = createWebflowClient();
      const validation = webflow.validateItems(webflowItems, ['name', 'slug']);

      broadcast({
        type: 'webflow-dry-run-complete',
        contentType,
        validation
      });

      operationLog.push({
        timestamp: new Date().toISOString(),
        type: 'webflow-dry-run',
        contentType,
        itemCount: webflowItems.length,
        valid: validation.valid,
        invalid: validation.invalid
      });

      return res.json({
        dryRun: true,
        validation,
        message: 'Dry run complete - no data uploaded'
      });
    }

    // Actual upload
    const webflow = createWebflowClient();

    broadcast({
      type: 'webflow-upload-start',
      contentType,
      total: webflowItems.length
    });

    const results = await webflow.batchUploadWithRetry(
      collectionId,
      webflowItems,
      {
        progressCallback: (progress) => {
          broadcast({
            type: 'webflow-upload-progress',
            ...progress
          });
        },
        isLive: false // Upload as drafts
      }
    );

    broadcast({
      type: 'webflow-upload-complete',
      contentType,
      results
    });

    operationLog.push({
      timestamp: new Date().toISOString(),
      type: 'webflow-upload',
      contentType,
      collectionId,
      total: results.total,
      successful: results.successful,
      failed: results.failed
    });

    res.json(results);
  } catch (error) {
    broadcast({
      type: 'webflow-upload-error',
      contentType,
      error: error.message
    });

    operationLog.push({
      timestamp: new Date().toISOString(),
      type: 'webflow-upload',
      contentType,
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

// API: Analyze and suggest Webflow collections using AI
app.post('/api/webflow/ai-analyze', async (req, res) => {
  const { contentType } = req.body;

  try {
    // Load transformed data
    let dataToAnalyze = {};

    if (contentType === 'all') {
      // Analyze all content types
      const contentTypes = ['team-members', 'videos', 'projects', 'articles', 'news'];
      for (const type of contentTypes) {
        try {
          const filePath = `./output/transformed/${type}.json`;
          dataToAnalyze[type] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (e) {
          console.log(`No data for ${type}`);
        }
      }
    } else {
      // Analyze specific content type
      const filePath = `./output/transformed/${contentType}.json`;
      dataToAnalyze[contentType] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    // Create AI generator
    const webflow = createWebflowClient();
    const aiGenerator = createAIGenerator(webflow);

    broadcast({
      type: 'ai-analysis-start',
      contentType
    });

    // Analyze data and generate suggestions
    const suggestions = await aiGenerator.analyzeAndSuggestCollections(dataToAnalyze);

    broadcast({
      type: 'ai-analysis-complete',
      suggestions
    });

    operationLog.push({
      timestamp: new Date().toISOString(),
      type: 'ai-analysis',
      contentType,
      success: true
    });

    res.json({
      success: true,
      suggestions,
      message: 'AI analysis complete'
    });
  } catch (error) {
    broadcast({
      type: 'ai-analysis-error',
      error: error.message
    });

    operationLog.push({
      timestamp: new Date().toISOString(),
      type: 'ai-analysis',
      contentType,
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

// API: Create Webflow collection based on AI suggestion
app.post('/api/webflow/create-collection', async (req, res) => {
  const { schema, siteId } = req.body;

  try {
    const webflow = createWebflowClient();
    const aiGenerator = createAIGenerator(webflow);

    broadcast({
      type: 'collection-creation-start',
      collectionName: schema.collection.name
    });

    // Create the collection
    const collection = await aiGenerator.createWebflowCollection(schema, siteId || webflow.siteId);

    broadcast({
      type: 'collection-creation-complete',
      collection
    });

    operationLog.push({
      timestamp: new Date().toISOString(),
      type: 'create-collection',
      collectionName: schema.collection.name,
      success: true
    });

    res.json({
      success: true,
      collection,
      message: `Collection "${schema.collection.name}" created successfully`
    });
  } catch (error) {
    broadcast({
      type: 'collection-creation-error',
      error: error.message
    });

    operationLog.push({
      timestamp: new Date().toISOString(),
      type: 'create-collection',
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

// API: Publish items in Webflow
app.post('/api/webflow/publish', async (req, res) => {
  const { collectionId, itemIds } = req.body;

  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ error: 'Invalid item IDs' });
  }

  try {
    const webflow = createWebflowClient();
    const results = await webflow.publishItems(collectionId, itemIds);

    operationLog.push({
      timestamp: new Date().toISOString(),
      type: 'webflow-publish',
      collectionId,
      itemCount: itemIds.length,
      success: true
    });

    res.json(results);
  } catch (error) {
    operationLog.push({
      timestamp: new Date().toISOString(),
      type: 'webflow-publish',
      collectionId,
      error: error.message
    });

    res.status(500).json({ error: error.message });
  }
});

// WebSocket connection
wss.on('connection', (ws) => {
  clients.add(ws);

  // Send initial status
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to migration server'
  }));

  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

// Start server
server.listen(PORT, async () => {
  console.log('');
  console.log('════════════════════════════════════════════════════════');
  console.log('  Migration Tool - Web UI');
  console.log('════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Server running at: http://localhost:${PORT}`);
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');
  console.log('════════════════════════════════════════════════════════');
  console.log('');

  // Auto-open browser
  try {
    const open = (await import('open')).default;
    await open(`http://localhost:${PORT}`);
  } catch (error) {
    // If open fails, just continue - user can open manually
    console.log('  (Open http://localhost:3000 in your browser)\n');
  }
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down server...\n');
  server.close(() => {
    process.exit(0);
  });
});
