import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const STORYBLOK_TOKEN = process.env.STORYBLOK_TOKEN;
const SPACE_ID = process.env.STORYBLOK_SPACE_ID;

// Management API base URL
const MGMT_API = 'https://mapi.storyblok.com/v1';
// Content Delivery API base URL
const API = 'https://api.storyblok.com/v2';

class StoryblokDiscovery {
  constructor(token, spaceId) {
    this.token = token;
    this.spaceId = spaceId;

    // For Management API
    this.mgmtClient = axios.create({
      baseURL: MGMT_API,
      headers: {
        'Authorization': token
      }
    });

    // For Content Delivery API
    this.apiClient = axios.create({
      baseURL: API,
      params: {
        token: token
      }
    });
  }

  async fetchComponents() {
    console.log('📦 Fetching components (content types)...');
    try {
      const response = await this.mgmtClient.get(`/spaces/${this.spaceId}/components`);
      return response.data.components;
    } catch (error) {
      console.error('Error fetching components:', error.response?.data || error.message);
      return [];
    }
  }

  async fetchStories(page = 1, perPage = 100) {
    console.log(`📄 Fetching stories (page ${page})...`);
    try {
      const response = await this.mgmtClient.get(`/spaces/${this.spaceId}/stories`, {
        params: {
          per_page: perPage,
          page: page
        }
      });

      const stories = response.data.stories;

      // Check if there are more pages
      if (stories.length === perPage) {
        const nextPageStories = await this.fetchStories(page + 1, perPage);
        return [...stories, ...nextPageStories];
      }

      return stories;
    } catch (error) {
      console.error('Error fetching stories:', error.response?.data || error.message);
      return [];
    }
  }

  async fetchAssets(page = 1, perPage = 100) {
    console.log(`🖼️  Fetching assets (page ${page})...`);
    try {
      const response = await this.mgmtClient.get(`/spaces/${this.spaceId}/assets`, {
        params: {
          per_page: perPage,
          page: page
        }
      });

      const assets = response.data.assets;

      // Check if there are more pages
      if (assets.length === perPage) {
        const nextPageAssets = await this.fetchAssets(page + 1, perPage);
        return [...assets, ...nextPageAssets];
      }

      return assets;
    } catch (error) {
      console.error('Error fetching assets:', error.response?.data || error.message);
      return [];
    }
  }

  async fetchSpace() {
    console.log('🌐 Fetching space information...');
    try {
      const response = await this.mgmtClient.get(`/spaces/${this.spaceId}`);
      return response.data.space;
    } catch (error) {
      console.error('Error fetching space:', error.response?.data || error.message);
      return null;
    }
  }

  analyzeComponents(components) {
    const analysis = {
      total: components.length,
      byType: {},
      complexFields: [],
      nestedComponents: []
    };

    components.forEach(component => {
      // Count by type
      if (component.is_root) {
        analysis.byType['root'] = (analysis.byType['root'] || 0) + 1;
      } else if (component.is_nestable) {
        analysis.byType['nestable'] = (analysis.byType['nestable'] || 0) + 1;
      } else {
        analysis.byType['regular'] = (analysis.byType['regular'] || 0) + 1;
      }

      // Analyze fields
      if (component.schema) {
        Object.entries(component.schema).forEach(([fieldName, fieldConfig]) => {
          const fieldType = fieldConfig.type;

          // Track complex field types
          if (['blocks', 'richtext', 'table', 'custom'].includes(fieldType)) {
            analysis.complexFields.push({
              component: component.name,
              field: fieldName,
              type: fieldType
            });
          }

          // Track nested components
          if (fieldType === 'blocks') {
            analysis.nestedComponents.push({
              component: component.name,
              field: fieldName,
              allowedComponents: fieldConfig.restrict_components ? 'restricted' : 'all'
            });
          }
        });
      }
    });

    return analysis;
  }

  analyzeStories(stories) {
    const analysis = {
      total: stories.length,
      byContentType: {},
      byFolder: {},
      byTag: {},
      languages: new Set(),
      hasTranslations: false,
      publishedCount: 0,
      draftCount: 0
    };

    stories.forEach(story => {
      // Count by content type (from Management API)
      const contentType = story.content_type || 'unknown';
      analysis.byContentType[contentType] = (analysis.byContentType[contentType] || 0) + 1;

      // Count by folder
      const folder = story.full_slug.split('/')[0] || 'root';
      analysis.byFolder[folder] = (analysis.byFolder[folder] || 0) + 1;

      // Count by tags
      if (story.tag_list && Array.isArray(story.tag_list)) {
        story.tag_list.forEach(tag => {
          analysis.byTag[tag] = (analysis.byTag[tag] || 0) + 1;
        });
      }

      // Check for translations
      if (story.lang && story.lang !== 'default') {
        analysis.languages.add(story.lang);
        analysis.hasTranslations = true;
      }

      // Count published vs draft
      if (story.published) {
        analysis.publishedCount++;
      } else {
        analysis.draftCount++;
      }
    });

    analysis.languages = Array.from(analysis.languages);

    return analysis;
  }

  calculateNestingDepth(content, depth = 0) {
    if (!content) return depth;

    let maxDepth = depth;

    Object.values(content).forEach(value => {
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item && typeof item === 'object' && item.component) {
            const nestedDepth = this.calculateNestingDepth(item, depth + 1);
            maxDepth = Math.max(maxDepth, nestedDepth);
          }
        });
      }
    });

    return maxDepth;
  }

  analyzeAssets(assets) {
    const analysis = {
      total: assets.length,
      totalSize: 0,
      byType: {},
      largestFiles: []
    };

    assets.forEach(asset => {
      const ext = asset.filename.split('.').pop().toLowerCase();
      analysis.byType[ext] = (analysis.byType[ext] || 0) + 1;

      if (asset.content_length) {
        analysis.totalSize += asset.content_length;
      }
    });

    // Get 10 largest files
    analysis.largestFiles = assets
      .filter(a => a.content_length)
      .sort((a, b) => b.content_length - a.content_length)
      .slice(0, 10)
      .map(a => ({
        filename: a.filename,
        size: this.formatBytes(a.content_length),
        sizeBytes: a.content_length
      }));

    analysis.totalSizeFormatted = this.formatBytes(analysis.totalSize);

    return analysis;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  identifyMigrationChallenges(components, stories, assets, componentsAnalysis, storiesAnalysis) {
    const challenges = [];

    // Check for nested components
    if (componentsAnalysis.nestedComponents.length > 0) {
      challenges.push({
        severity: 'high',
        category: 'Structure',
        issue: 'Nested/Modular Components',
        description: `Found ${componentsAnalysis.nestedComponents.length} components with nested blocks. Webflow doesn't support nested collections, will need flattening strategy.`,
        affectedItems: componentsAnalysis.nestedComponents.length
      });
    }

    // Check for rich text
    const richTextFields = componentsAnalysis.complexFields.filter(f => f.type === 'richtext');
    if (richTextFields.length > 0) {
      challenges.push({
        severity: 'medium',
        category: 'Content',
        issue: 'Rich Text Conversion',
        description: `Found ${richTextFields.length} rich text fields. Storyblok and Webflow use different rich text formats, conversion needed.`,
        affectedItems: richTextFields.length
      });
    }

    // Check for translations
    if (storiesAnalysis.hasTranslations) {
      challenges.push({
        severity: 'high',
        category: 'Localization',
        issue: 'Multi-language Content',
        description: `Content exists in ${storiesAnalysis.languages.length + 1} languages. Webflow localization works differently than Storyblok.`,
        affectedItems: storiesAnalysis.languages.length + 1
      });
    }

    // Check content volume
    if (stories.length > 1000) {
      challenges.push({
        severity: 'medium',
        category: 'Scale',
        issue: 'Large Content Volume',
        description: `${stories.length} stories to migrate. Consider batching and rate limiting for Webflow API.`,
        affectedItems: stories.length
      });
    }

    // Check asset volume
    if (assets.length > 500) {
      challenges.push({
        severity: 'medium',
        category: 'Assets',
        issue: 'Large Asset Volume',
        description: `${assets.length} assets to migrate. Will need efficient asset upload strategy.`,
        affectedItems: assets.length
      });
    }

    // Check nesting depth
    if (storiesAnalysis.maxNestingDepth > 3) {
      challenges.push({
        severity: 'high',
        category: 'Structure',
        issue: 'Deep Nesting',
        description: `Maximum nesting depth of ${storiesAnalysis.maxNestingDepth} levels found. Will need significant restructuring for Webflow.`,
        affectedItems: storiesAnalysis.maxNestingDepth
      });
    }

    // Check for custom field types
    const customFields = componentsAnalysis.complexFields.filter(f => f.type === 'custom');
    if (customFields.length > 0) {
      challenges.push({
        severity: 'high',
        category: 'Custom Fields',
        issue: 'Custom Field Types',
        description: `Found ${customFields.length} custom field types. Will need manual mapping to Webflow field types.`,
        affectedItems: customFields.length
      });
    }

    return challenges;
  }

  async generateReport() {
    console.log('\n🚀 Starting Storyblok Discovery...\n');

    const space = await this.fetchSpace();
    const components = await this.fetchComponents();
    const stories = await this.fetchStories();
    const assets = await this.fetchAssets();

    console.log('\n📊 Analyzing data...\n');

    const componentsAnalysis = this.analyzeComponents(components);
    const storiesAnalysis = this.analyzeStories(stories);
    const assetsAnalysis = this.analyzeAssets(assets);
    const challenges = this.identifyMigrationChallenges(
      components,
      stories,
      assets,
      componentsAnalysis,
      storiesAnalysis
    );

    const report = {
      generatedAt: new Date().toISOString(),
      space: {
        id: this.spaceId,
        name: space?.name || 'Unknown',
        domain: space?.domain || 'Unknown'
      },
      components: {
        total: components.length,
        analysis: componentsAnalysis,
        list: components.map(c => ({
          name: c.name,
          displayName: c.display_name,
          isRoot: c.is_root,
          isNestable: c.is_nestable,
          fieldCount: Object.keys(c.schema || {}).length,
          fields: Object.entries(c.schema || {}).map(([name, config]) => ({
            name,
            type: config.type,
            required: config.required || false
          }))
        }))
      },
      stories: {
        total: stories.length,
        analysis: storiesAnalysis
      },
      assets: {
        total: assets.length,
        analysis: assetsAnalysis
      },
      migrationChallenges: challenges
    };

    // Save full report as JSON
    const reportPath = './reports/storyblok-discovery.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ Full report saved to: ${reportPath}\n`);

    // Save raw data
    fs.writeFileSync('./reports/raw-components.json', JSON.stringify(components, null, 2));
    fs.writeFileSync('./reports/raw-stories.json', JSON.stringify(stories, null, 2));
    fs.writeFileSync('./reports/raw-assets.json', JSON.stringify(assets, null, 2));

    // Print summary to console
    this.printSummary(report);

    return report;
  }

  printSummary(report) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('           STORYBLOK MIGRATION DISCOVERY REPORT        ');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`📅 Generated: ${new Date(report.generatedAt).toLocaleString()}`);
    console.log(`🌐 Space: ${report.space.name} (ID: ${report.space.id})\n`);

    console.log('📦 COMPONENTS (Content Types)');
    console.log('─────────────────────────────────────────────────────');
    console.log(`Total: ${report.components.total}`);
    console.log(`  - Root components: ${report.components.analysis.byType.root || 0}`);
    console.log(`  - Nestable components: ${report.components.analysis.byType.nestable || 0}`);
    console.log(`  - Regular components: ${report.components.analysis.byType.regular || 0}`);
    console.log(`  - Complex fields: ${report.components.analysis.complexFields.length}`);
    console.log(`  - Nested structures: ${report.components.analysis.nestedComponents.length}\n`);

    console.log('📄 STORIES (Content Items)');
    console.log('─────────────────────────────────────────────────────');
    console.log(`Total: ${report.stories.total} (${report.stories.analysis.publishedCount} published, ${report.stories.analysis.draftCount} drafts)`);
    console.log(`\nBy Content Type:`);
    Object.entries(report.stories.analysis.byContentType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });
    console.log(`\nBy Folder:`);
    Object.entries(report.stories.analysis.byFolder)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([folder, count]) => {
        console.log(`  - ${folder}: ${count}`);
      });
    const tagCount = Object.keys(report.stories.analysis.byTag || {}).length;
    if (tagCount > 0) {
      console.log(`\nTags: ${tagCount} unique tags in use`);
    }
    if (report.stories.analysis.hasTranslations) {
      console.log(`\n⚠️  Translations detected: ${report.stories.analysis.languages.join(', ')}`);
    }
    console.log('');

    console.log('🖼️  ASSETS');
    console.log('─────────────────────────────────────────────────────');
    console.log(`Total: ${report.assets.total}`);
    console.log(`Total size: ${report.assets.analysis.totalSizeFormatted}`);
    console.log(`By type:`);
    Object.entries(report.assets.analysis.byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
    console.log('');

    console.log('⚠️  MIGRATION CHALLENGES');
    console.log('─────────────────────────────────────────────────────');
    if (report.migrationChallenges.length === 0) {
      console.log('✅ No major challenges detected!');
    } else {
      report.migrationChallenges.forEach((challenge, idx) => {
        const severityIcon = challenge.severity === 'high' ? '🔴' : '🟡';
        console.log(`${severityIcon} [${challenge.severity.toUpperCase()}] ${challenge.issue}`);
        console.log(`   ${challenge.description}`);
        console.log('');
      });
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('Next steps:');
    console.log('1. Review the full JSON report in ./reports/storyblok-discovery.json');
    console.log('2. Examine the migration challenges above');
    console.log('3. Map Storyblok components to Webflow collections');
    console.log('4. Plan the transformation strategy for nested content');
    console.log('═══════════════════════════════════════════════════════\n');
  }
}

// Run the discovery
const discovery = new StoryblokDiscovery(STORYBLOK_TOKEN, SPACE_ID);
discovery.generateReport().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
