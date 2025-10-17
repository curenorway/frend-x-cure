/**
 * AI-Powered Webflow Collection Generator
 *
 * Uses Claude to analyze transformed data and automatically:
 * - Suggest optimal Webflow collection schemas
 * - Identify field types and relationships
 * - Generate collection creation parameters
 * - Create collections via Webflow API
 */

import axios from 'axios';

export class AICollectionGenerator {
  constructor(anthropicApiKey, webflowClient) {
    this.anthropicApiKey = anthropicApiKey;
    this.webflowClient = webflowClient;
    this.claudeClient = axios.create({
      baseURL: 'https://api.anthropic.com/v1',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });
  }

  /**
   * Analyze transformed data and generate Webflow collection schema
   */
  async analyzeDataStructure(transformedData, contentType) {
    const sampleItems = transformedData.items.slice(0, 5); // Analyze first 5 items

    const prompt = `You are a Webflow CMS expert. Analyze this transformed data from Storyblok and suggest the optimal Webflow collection schema.

Content Type: ${contentType}
Sample Data (${transformedData.items.length} total items):
${JSON.stringify(sampleItems, null, 2)}

Generate a Webflow collection schema with:
1. Collection name and slug
2. Field definitions with proper Webflow field types
3. Required fields and validation rules
4. SEO settings

Return ONLY valid JSON in this exact format:
{
  "collection": {
    "name": "Collection Name",
    "slug": "collection-slug",
    "singularName": "Item Name"
  },
  "fields": [
    {
      "name": "Field Name",
      "slug": "field-slug",
      "type": "PlainText|RichText|Number|Email|Phone|Link|Date|Image|Video|Color|Option|Switch|Reference|MultiReference",
      "required": true/false,
      "helpText": "Optional help text",
      "validations": {}
    }
  ],
  "seoSettings": {
    "titleField": "field-slug",
    "descriptionField": "field-slug",
    "imageField": "field-slug"
  }
}`;

    try {
      const response = await this.claudeClient.post('/messages', {
        model: 'claude-3-5-sonnet-20241022', // Using latest Sonnet
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2 // Low temperature for consistent JSON
      });

      const aiResponse = response.data.content[0].text;

      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('AI analysis error:', error);
      // Fallback to basic schema generation
      return this.generateBasicSchema(transformedData, contentType);
    }
  }

  /**
   * Generate basic schema without AI (fallback)
   */
  generateBasicSchema(transformedData, contentType) {
    const sampleItem = transformedData.items[0];
    const fields = [];

    // Always include name and slug
    fields.push(
      {
        name: 'Name',
        slug: 'name',
        type: 'PlainText',
        required: true,
        helpText: 'The name of this item'
      },
      {
        name: 'Slug',
        slug: 'slug',
        type: 'PlainText',
        required: true,
        helpText: 'URL-friendly version of the name',
        validations: {
          unique: true,
          slug: true
        }
      }
    );

    // Analyze sample item to determine field types
    for (const [key, value] of Object.entries(sampleItem)) {
      if (key === 'name' || key === 'slug') continue;

      const fieldType = this.detectFieldType(key, value);
      if (fieldType) {
        fields.push({
          name: this.formatFieldName(key),
          slug: key.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          type: fieldType,
          required: false,
          helpText: ''
        });
      }
    }

    return {
      collection: {
        name: this.formatCollectionName(contentType),
        slug: contentType.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        singularName: this.formatSingularName(contentType)
      },
      fields,
      seoSettings: {
        titleField: 'name',
        descriptionField: fields.find(f => f.slug.includes('description'))?.slug || 'name',
        imageField: fields.find(f => f.type === 'Image')?.slug || null
      }
    };
  }

  /**
   * Detect Webflow field type from value
   */
  detectFieldType(key, value) {
    const keyLower = key.toLowerCase();

    // Check by key name patterns
    if (keyLower.includes('email')) return 'Email';
    if (keyLower.includes('phone')) return 'Phone';
    if (keyLower.includes('url') || keyLower.includes('link') || keyLower.includes('website')) return 'Link';
    if (keyLower.includes('image') || keyLower.includes('photo') || keyLower.includes('thumbnail')) return 'Image';
    if (keyLower.includes('video') || keyLower.includes('vimeo') || keyLower.includes('youtube')) return 'Video';
    if (keyLower.includes('date') || keyLower.includes('published') || keyLower.includes('created')) return 'Date';
    if (keyLower.includes('color')) return 'Color';

    // Check by value type
    if (typeof value === 'boolean') return 'Switch';
    if (typeof value === 'number') return 'Number';
    if (typeof value === 'string') {
      // Check for rich text patterns
      if (value.includes('<p>') || value.includes('<h') || value.includes('<ul>')) return 'RichText';
      // Check for email pattern
      if (value.includes('@')) return 'Email';
      // Check for URL pattern
      if (value.startsWith('http')) return 'Link';
      // Check for image URL
      if (value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'Image';
      // Long text
      if (value.length > 200) return 'RichText';
      // Default to plain text
      return 'PlainText';
    }
    if (Array.isArray(value)) {
      // Check if it's a multi-reference
      if (value.length > 0 && typeof value[0] === 'string') return 'Option';
      return null; // Skip complex arrays for now
    }
    if (typeof value === 'object' && value !== null) {
      // Skip nested objects for now
      return null;
    }

    return 'PlainText';
  }

  /**
   * Format field name for display
   */
  formatFieldName(key) {
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capitals
      .replace(/[_-]/g, ' ') // Replace underscores and hyphens
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }

  /**
   * Format collection name
   */
  formatCollectionName(contentType) {
    return this.formatFieldName(contentType);
  }

  /**
   * Format singular name
   */
  formatSingularName(contentType) {
    const name = this.formatCollectionName(contentType);
    // Simple singularization
    if (name.endsWith('ies')) return name.slice(0, -3) + 'y';
    if (name.endsWith('es')) return name.slice(0, -2);
    if (name.endsWith('s')) return name.slice(0, -1);
    return name;
  }

  /**
   * Create Webflow collection from schema
   */
  async createWebflowCollection(schema, siteId) {
    try {
      // Note: Webflow API v2 collection creation is complex
      // This is a simplified version - actual implementation needs proper API v2 format

      const collectionData = {
        displayName: schema.collection.name,
        slug: schema.collection.slug,
        singularName: schema.collection.singularName,
        fields: schema.fields.map(field => ({
          displayName: field.name,
          slug: field.slug,
          type: this.mapToWebflowFieldType(field.type),
          required: field.required,
          helpText: field.helpText,
          validations: field.validations || {}
        }))
      };

      // Note: Actual Webflow collection creation requires different endpoint
      // This is placeholder - needs Webflow API v2 implementation
      const response = await this.webflowClient.client.post(
        `/sites/${siteId}/collections`,
        collectionData
      );

      return response.data;
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw error;
    }
  }

  /**
   * Map our field types to Webflow API field types
   */
  mapToWebflowFieldType(type) {
    const typeMap = {
      'PlainText': 'PlainText',
      'RichText': 'RichText',
      'Number': 'Number',
      'Email': 'Email',
      'Phone': 'Phone',
      'Link': 'Link',
      'Date': 'Date',
      'Image': 'ImageRef',
      'Video': 'VideoLink',
      'Color': 'Color',
      'Option': 'Option',
      'Switch': 'Bool',
      'Reference': 'ItemRef',
      'MultiReference': 'ItemRefSet'
    };

    return typeMap[type] || 'PlainText';
  }

  /**
   * Generate field mapping code for transformed data
   */
  generateFieldMappingCode(schema, contentType) {
    const fieldMappings = schema.fields.map(field => {
      const transformedKey = Object.keys(sampleItem || {}).find(
        k => k.toLowerCase().replace(/[^a-z0-9]/g, '-') === field.slug
      ) || field.slug;

      return `        '${field.slug}': transformedItem.${transformedKey},`;
    }).join('\n');

    return `
    case '${contentType}':
      return {
${fieldMappings}
      };`;
  }

  /**
   * Comprehensive analysis with AI assistance
   */
  async analyzeAndSuggestCollections(allTransformedData) {
    const suggestions = {};

    for (const [contentType, data] of Object.entries(allTransformedData)) {
      if (!data.items || data.items.length === 0) continue;

      console.log(`Analyzing ${contentType}...`);

      // Get AI-powered schema suggestion
      const schema = await this.analyzeDataStructure(data, contentType);

      // Add statistics and insights
      suggestions[contentType] = {
        schema,
        statistics: {
          totalItems: data.items.length,
          successfulTransforms: data.successful || data.items.length,
          failedTransforms: data.failed || 0,
          uniqueFields: schema.fields.length,
          requiredFields: schema.fields.filter(f => f.required).length
        },
        insights: this.generateInsights(data, schema),
        mappingCode: this.generateFieldMappingCode(schema, contentType)
      };
    }

    return suggestions;
  }

  /**
   * Generate insights about the data and schema
   */
  generateInsights(data, schema) {
    const insights = [];

    // Check for missing data
    const sampleSize = Math.min(10, data.items.length);
    const samples = data.items.slice(0, sampleSize);

    schema.fields.forEach(field => {
      const fieldKey = field.slug;
      const missingCount = samples.filter(item => !item[fieldKey]).length;

      if (missingCount > 0) {
        insights.push({
          type: 'warning',
          message: `Field "${field.name}" is missing in ${missingCount}/${sampleSize} sample items`
        });
      }
    });

    // Check for rich content
    if (schema.fields.some(f => f.type === 'RichText')) {
      insights.push({
        type: 'info',
        message: 'Contains rich text content that will be converted from Storyblok to Webflow format'
      });
    }

    // Check for images
    if (schema.fields.some(f => f.type === 'Image')) {
      insights.push({
        type: 'info',
        message: 'Contains images that will need to be uploaded to Webflow separately'
      });
    }

    return insights;
  }
}

/**
 * Create AI generator from environment variables
 */
export function createAIGenerator(webflowClient) {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    console.warn('No Anthropic API key found. AI features will use fallback mode.');
    return new AICollectionGenerator(null, webflowClient);
  }

  return new AICollectionGenerator(apiKey, webflowClient);
}