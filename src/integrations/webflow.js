/**
 * Webflow API Integration
 *
 * Handles uploading transformed content to Webflow CMS
 * Supports: Collection items, assets, bulk operations, retry logic
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

export class WebflowClient {
  constructor(apiToken, siteId) {
    this.apiToken = apiToken;
    this.siteId = siteId;
    this.baseUrl = 'https://api.webflow.com';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept-Version': '1.0.0',
        'Content-Type': 'application/json'
      }
    });

    // Rate limiting: 60 requests per minute
    this.rateLimitDelay = 1100; // 1.1 seconds between requests
    this.lastRequestTime = 0;
  }

  /**
   * Rate limiting helper
   */
  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get all collections for a site
   */
  async getCollections() {
    await this.rateLimit();

    try {
      const response = await this.client.get(`/sites/${this.siteId}/collections`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get collections: ${error.message}`);
    }
  }

  /**
   * Get a specific collection by ID
   */
  async getCollection(collectionId) {
    await this.rateLimit();

    try {
      const response = await this.client.get(`/collections/${collectionId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get collection: ${error.message}`);
    }
  }

  /**
   * Get items in a collection
   */
  async getCollectionItems(collectionId, offset = 0, limit = 100) {
    await this.rateLimit();

    try {
      const response = await this.client.get(
        `/collections/${collectionId}/items`,
        { params: { offset, limit } }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get collection items: ${error.message}`);
    }
  }

  /**
   * Create a single collection item
   */
  async createCollectionItem(collectionId, fields, isLive = false) {
    await this.rateLimit();

    try {
      const response = await this.client.post(
        `/collections/${collectionId}/items`,
        {
          fields,
          _archived: false,
          _draft: !isLive
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create item: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Update a collection item
   */
  async updateCollectionItem(collectionId, itemId, fields, isLive = false) {
    await this.rateLimit();

    try {
      const response = await this.client.put(
        `/collections/${collectionId}/items/${itemId}`,
        {
          fields,
          _archived: false,
          _draft: !isLive
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update item: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete a collection item
   */
  async deleteCollectionItem(collectionId, itemId) {
    await this.rateLimit();

    try {
      const response = await this.client.delete(
        `/collections/${collectionId}/items/${itemId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete item: ${error.message}`);
    }
  }

  /**
   * Publish collection items (make them live)
   */
  async publishItems(collectionId, itemIds) {
    await this.rateLimit();

    try {
      const response = await this.client.put(
        `/collections/${collectionId}/items/publish`,
        { itemIds }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to publish items: ${error.message}`);
    }
  }

  /**
   * Upload an asset to Webflow
   * Note: This is a simplified version - actual implementation may vary
   */
  async uploadAsset(filePath) {
    await this.rateLimit();

    // Note: Webflow asset upload requires special handling
    // This is a placeholder - actual implementation needs FormData and proper headers
    throw new Error('Asset upload not yet implemented - use Webflow UI or direct S3 upload');
  }

  /**
   * Batch upload collection items with progress tracking
   *
   * @param {string} collectionId - Webflow collection ID
   * @param {Array} items - Array of items to upload
   * @param {Function} progressCallback - Callback for progress updates
   * @param {boolean} isLive - Whether to publish items immediately
   */
  async batchUpload(collectionId, items, progressCallback = null, isLive = false) {
    const results = {
      total: items.length,
      successful: 0,
      failed: 0,
      errors: [],
      createdItems: []
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        const created = await this.createCollectionItem(collectionId, item, isLive);
        results.successful++;
        results.createdItems.push(created);

        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: items.length,
            percentage: Math.round(((i + 1) / items.length) * 100),
            item: item
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          item,
          error: error.message
        });

        if (progressCallback) {
          progressCallback({
            current: i + 1,
            total: items.length,
            percentage: Math.round(((i + 1) / items.length) * 100),
            item: item,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  /**
   * Batch upload with retry logic
   */
  async batchUploadWithRetry(collectionId, items, options = {}) {
    const {
      maxRetries = 3,
      retryDelay = 2000,
      progressCallback = null,
      isLive = false
    } = options;

    let attempt = 0;
    let remainingItems = [...items];
    const allResults = {
      total: items.length,
      successful: 0,
      failed: 0,
      errors: [],
      createdItems: []
    };

    while (attempt < maxRetries && remainingItems.length > 0) {
      attempt++;

      const results = await this.batchUpload(
        collectionId,
        remainingItems,
        progressCallback,
        isLive
      );

      allResults.successful += results.successful;
      allResults.createdItems.push(...results.createdItems);

      // Items that failed - will retry
      remainingItems = results.errors.map(e => e.item);

      if (remainingItems.length > 0 && attempt < maxRetries) {
        console.log(`Retry ${attempt}/${maxRetries}: ${remainingItems.length} items failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        // Final attempt or no items left
        allResults.failed = remainingItems.length;
        allResults.errors = results.errors;
      }
    }

    return allResults;
  }

  /**
   * Dry run - validate items without uploading
   */
  validateItems(items, requiredFields = []) {
    const results = {
      valid: 0,
      invalid: 0,
      errors: []
    };

    items.forEach((item, index) => {
      const missing = requiredFields.filter(field => !item[field]);

      if (missing.length > 0) {
        results.invalid++;
        results.errors.push({
          index,
          item,
          missingFields: missing
        });
      } else {
        results.valid++;
      }
    });

    return results;
  }
}

/**
 * Helper function to create Webflow client from environment variables
 */
export function createWebflowClient() {
  const apiToken = process.env.WEBFLOW_API_TOKEN;
  const siteId = process.env.WEBFLOW_SITE_ID;

  if (!apiToken || !siteId) {
    throw new Error(
      'Webflow credentials not configured. Set WEBFLOW_API_TOKEN and WEBFLOW_SITE_ID environment variables.'
    );
  }

  return new WebflowClient(apiToken, siteId);
}

/**
 * Map transformed data to Webflow fields
 * This needs to be customized based on your Webflow collection structure
 */
export function mapToWebflowFields(transformedItem, contentType) {
  // This is a template - customize based on your Webflow CMS structure

  switch (contentType) {
    case 'team-members':
      return {
        name: transformedItem.name,
        slug: transformedItem.slug,
        role: transformedItem.role,
        email: transformedItem.email,
        phone: transformedItem.phone,
        // image: transformedItem.image, // Requires asset upload first
        // Add other fields as needed
      };

    case 'videos':
      return {
        name: transformedItem.name,
        slug: transformedItem.slug,
        title: transformedItem.title,
        description: transformedItem.description,
        'vimeo-id': transformedItem.vimeoId,
        // thumbnail: transformedItem.thumbnailImage, // Requires asset upload
        // Add other fields
      };

    case 'projects':
      return {
        name: transformedItem.name,
        slug: transformedItem.slug,
        title: transformedItem.title,
        description: transformedItem.description,
        customer: transformedItem.customer,
        'website-url': transformedItem.websiteUrl,
        // featured-image: transformedItem.featuredImage, // Requires asset upload
        // Add other fields
      };

    case 'articles':
      return {
        name: transformedItem.name,
        slug: transformedItem.slug,
        title: transformedItem.title,
        subtitle: transformedItem.subtitle,
        author: transformedItem.author,
        'published-date': transformedItem.published,
        // featured-image: transformedItem.featuredImage, // Requires asset upload
        // Add other fields
      };

    default:
      throw new Error(`No field mapping defined for content type: ${contentType}`);
  }
}
