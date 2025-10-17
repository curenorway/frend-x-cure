/**
 * Base Transformer Class
 *
 * All content type transformers extend this base class.
 * Provides common utilities for transformation, validation, and SEO extraction.
 */

import { convertRichText } from '../converters/richtext.js';

export class BaseTransformer {
  constructor(storyblokItem, options = {}) {
    this.source = storyblokItem;
    this.options = options;
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Main transform method - MUST be overridden in subclasses
   */
  transform() {
    throw new Error(`Transform method must be implemented in ${this.constructor.name}`);
  }

  /**
   * Extract SEO fields from Storyblok metaFields or fallback to defaults
   */
  extractSEO() {
    const content = this.source.content || {};
    const metaFields = content.metaFields || {};

    return {
      seoTitle: metaFields.title || this.source.name || '',
      seoDescription: metaFields.description || content.subtext || '',
      seoImage: this.resolveAssetUrl(metaFields.og_image || content.image)
    };
  }

  /**
   * Convert Storyblok rich text to HTML
   */
  convertRichText(richtextField) {
    if (!richtextField) return '';

    try {
      return convertRichText(richtextField);
    } catch (error) {
      this.warnings.push({
        field: 'richtext',
        message: 'Rich text conversion failed, using empty string',
        error: error.message
      });
      return '';
    }
  }

  /**
   * Resolve Storyblok asset to URL
   * Handles both asset objects and direct URLs
   */
  resolveAssetUrl(asset) {
    if (!asset) return null;

    // If it's already a string URL
    if (typeof asset === 'string') {
      return asset;
    }

    // If it's an asset object with filename
    if (asset.filename) {
      return asset.filename;
    }

    // If it's just an ID, construct URL (will need to fetch asset details)
    if (typeof asset === 'number') {
      this.warnings.push({
        field: 'asset',
        message: `Asset ID ${asset} needs to be resolved to URL`
      });
      return null;
    }

    return null;
  }

  /**
   * Generate slug from name if not provided
   */
  generateSlug(text) {
    if (!text) return '';

    return text
      .toLowerCase()
      .replace(/[æ]/g, 'ae')
      .replace(/[ø]/g, 'o')
      .replace(/[å]/g, 'aa')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Ensure slug is unique and valid
   */
  sanitizeSlug(slug) {
    if (!slug) return this.generateSlug(this.source.name);

    // Webflow slug requirements: lowercase, alphanumeric, hyphens only
    return slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Extract tags from tag_list array
   */
  extractTags() {
    const tagList = this.source.tag_list || [];
    return tagList.map(tag => ({
      name: tag,
      slug: this.generateSlug(tag)
    }));
  }

  /**
   * Format date to ISO string
   */
  formatDate(date) {
    if (!date) return null;

    try {
      return new Date(date).toISOString();
    } catch (error) {
      this.warnings.push({
        field: 'date',
        message: `Invalid date: ${date}`
      });
      return null;
    }
  }

  /**
   * Validate required fields in transformed output
   */
  validate(output, requiredFields = []) {
    const missing = [];

    for (const field of requiredFields) {
      if (!output[field] || (typeof output[field] === 'string' && output[field].trim() === '')) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      this.errors.push({
        type: 'MissingRequiredFields',
        fields: missing,
        message: `Missing required fields: ${missing.join(', ')}`
      });
      return false;
    }

    return true;
  }

  /**
   * Check if transformation was successful
   */
  hasErrors() {
    return this.errors.length > 0;
  }

  /**
   * Get all errors
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Get all warnings
   */
  getWarnings() {
    return this.warnings;
  }

  /**
   * Get transformation result with metadata
   */
  getResult(transformed) {
    return {
      success: !this.hasErrors(),
      data: transformed,
      source: {
        id: this.source.id,
        name: this.source.name,
        contentType: this.source.content_type
      },
      errors: this.errors,
      warnings: this.warnings
    };
  }
}
