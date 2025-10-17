/**
 * Direct Storyblok API Fetcher
 *
 * Fetches data directly from Storyblok API without spawning processes
 * Works properly in production environments like Railway
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

export class StoryblokFetcher {
  constructor(token, spaceId) {
    this.token = token;
    this.spaceId = spaceId;
    this.baseURL = `https://api.storyblok.com/v1/spaces/${spaceId}`;

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': token
      }
    });
  }

  /**
   * Fetch all stories with pagination
   */
  async fetchStories(progressCallback = null) {
    const allStories = [];
    let page = 1;
    let hasMore = true;
    const perPage = 100;

    while (hasMore) {
      try {
        const response = await this.client.get('/stories', {
          params: {
            page,
            per_page: perPage
          }
        });

        const stories = response.data.stories || [];
        allStories.push(...stories);

        if (progressCallback) {
          progressCallback({
            type: 'stories',
            current: allStories.length,
            message: `Fetched ${allStories.length} stories...`
          });
        }

        hasMore = stories.length === perPage;
        page++;
      } catch (error) {
        console.error(`Error fetching stories page ${page}:`, error.message);
        hasMore = false;
      }
    }

    return allStories;
  }

  /**
   * Fetch all components
   */
  async fetchComponents(progressCallback = null) {
    try {
      const response = await this.client.get('/components');
      const components = response.data.components || [];

      if (progressCallback) {
        progressCallback({
          type: 'components',
          current: components.length,
          message: `Fetched ${components.length} components`
        });
      }

      return components;
    } catch (error) {
      console.error('Error fetching components:', error.message);
      return [];
    }
  }

  /**
   * Fetch all assets with pagination
   */
  async fetchAssets(progressCallback = null) {
    const allAssets = [];
    let page = 1;
    let hasMore = true;
    const perPage = 100;

    while (hasMore) {
      try {
        const response = await this.client.get('/assets', {
          params: {
            page,
            per_page: perPage
          }
        });

        const assets = response.data.assets || [];
        allAssets.push(...assets);

        if (progressCallback) {
          progressCallback({
            type: 'assets',
            current: allAssets.length,
            message: `Fetched ${allAssets.length} assets...`
          });
        }

        hasMore = assets.length === perPage;
        page++;
      } catch (error) {
        console.error(`Error fetching assets page ${page}:`, error.message);
        hasMore = false;
      }
    }

    return allAssets;
  }

  /**
   * Run complete discovery and save to files
   */
  async runDiscovery(progressCallback = null) {
    const startTime = Date.now();

    if (progressCallback) {
      progressCallback({
        type: 'start',
        message: 'Starting Storyblok discovery...'
      });
    }

    // Fetch all data
    const stories = await this.fetchStories(progressCallback);
    const components = await this.fetchComponents(progressCallback);
    const assets = await this.fetchAssets(progressCallback);

    // Analyze stories by content type
    const contentTypes = {};
    const byPublished = { published: 0, draft: 0 };

    stories.forEach(story => {
      // Count by content type
      const type = story.content_type || 'unknown';
      contentTypes[type] = (contentTypes[type] || 0) + 1;

      // Count by publish status
      if (story.published_at) {
        byPublished.published++;
      } else {
        byPublished.draft++;
      }
    });

    // Analyze assets
    let totalAssetSize = 0;
    const assetsByType = {};

    assets.forEach(asset => {
      const ext = asset.filename?.split('.').pop()?.toLowerCase() || 'unknown';
      assetsByType[ext] = (assetsByType[ext] || 0) + 1;

      if (asset.content_length) {
        totalAssetSize += asset.content_length;
      }
    });

    // Create discovery report
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      stories: {
        total: stories.length,
        analysis: {
          byContentType: contentTypes,
          byPublished: byPublished
        }
      },
      components: {
        total: components.length
      },
      assets: {
        total: assets.length,
        totalSize: totalAssetSize,
        sizeReadable: (totalAssetSize / 1024 / 1024 / 1024).toFixed(2) + ' GB',
        byType: assetsByType
      }
    };

    // Save files
    const reportsDir = './reports';
    fs.mkdirSync(reportsDir, { recursive: true });

    fs.writeFileSync(
      path.join(reportsDir, 'raw-stories.json'),
      JSON.stringify(stories, null, 2)
    );

    fs.writeFileSync(
      path.join(reportsDir, 'raw-components.json'),
      JSON.stringify(components, null, 2)
    );

    fs.writeFileSync(
      path.join(reportsDir, 'raw-assets.json'),
      JSON.stringify(assets, null, 2)
    );

    fs.writeFileSync(
      path.join(reportsDir, 'storyblok-discovery.json'),
      JSON.stringify(report, null, 2)
    );

    if (progressCallback) {
      progressCallback({
        type: 'complete',
        message: `Discovery complete! Found ${stories.length} stories, ${components.length} components, ${assets.length} assets`,
        report
      });
    }

    return report;
  }
}

/**
 * Create fetcher from environment variables
 */
export function createStoryblokFetcher() {
  const token = process.env.STORYBLOK_TOKEN;
  const spaceId = process.env.STORYBLOK_SPACE_ID;

  if (!token || !spaceId) {
    throw new Error('Storyblok credentials not configured. Set STORYBLOK_TOKEN and STORYBLOK_SPACE_ID environment variables.');
  }

  return new StoryblokFetcher(token, spaceId);
}