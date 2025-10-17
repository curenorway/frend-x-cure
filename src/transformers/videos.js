/**
 * Videos Transformer
 *
 * Transforms Storyblok Video content to Webflow CMS format
 * Handles: 270 video items with Vimeo embeds, TwentyThree embeds, metadata
 */

import { BaseTransformer } from './base.js';
import { convertRichText } from '../converters/richtext.js';

export class VideosTransformer extends BaseTransformer {
  constructor() {
    super('Video', 'videos');
  }

  transformItem(story) {
    const content = story.content || {};
    const transformed = {
      // Core fields
      name: story.name || 'Untitled Video',
      slug: story.slug,

      // Video metadata
      title: content.title || story.name,
      description: content.subtext || '',

      // Tags and categorization
      tags: this.parseTags(content.highlightTags),

      // Video embed data
      vimeoId: content.vimeoId || null,
      videoEmbed: content.twentyThreeEmbed || null,

      // Thumbnail image
      thumbnailImage: content.image?.filename || null,
      thumbnailAlt: content.image?.alt || content.title || story.name,

      // Video collections/series
      videoSeries: this.parseOptions(content.videoSeries),
      videoCollection: this.parseOptions(content.videoCollection),

      // Rich content body (if present)
      bodyContent: content.body ? this.transformBody(content.body) : null,

      // SEO & Meta
      metaTitle: content.metaFields?.title || content.title || story.name,
      metaDescription: content.metaFields?.description || content.subtext || '',
      ogImage: content.image?.filename || null,

      // Publishing info
      published: story.published_at || story.created_at,
      lastModified: story.published_at || story.created_at,
      status: story.is_published ? 'published' : 'draft',

      // Original data reference
      storyblokId: story.id,
      storyblokUuid: story.uuid
    };

    return transformed;
  }

  /**
   * Parse comma-separated tags into array
   */
  parseTags(tagString) {
    if (!tagString) return [];
    return tagString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  /**
   * Parse Storyblok options field (array of UUIDs referencing other content)
   */
  parseOptions(options) {
    if (!options || !Array.isArray(options)) return [];
    return options;
  }

  /**
   * Transform nested body bloks (components)
   */
  transformBody(bloks) {
    if (!bloks || !Array.isArray(bloks)) return null;

    return bloks.map(blok => ({
      component: blok.component,
      content: this.transformBlok(blok)
    }));
  }

  /**
   * Transform individual blok based on type
   */
  transformBlok(blok) {
    switch (blok.component) {
      case 'bodyParagraph':
        return {
          title: blok.title || '',
          text: blok.text ? convertRichText(blok.text) : ''
        };

      case 'bodyImage':
      case 'bigImage':
        return {
          image: blok.image?.filename || '',
          alt: blok.image?.alt || ''
        };

      case 'bodyVideo':
        return {
          vimeoId: blok.vimeoId || '',
          twentyThreeEmbed: blok.twentyThreeEmbed || '',
          autoplay: blok.autoplay || false
        };

      case 'quote':
        return {
          text: blok.text || '',
          source: blok.source || ''
        };

      default:
        // Return raw blok for unknown types
        return blok;
    }
  }
}

/**
 * Transform array of Video stories
 */
export function transformVideos(stories) {
  const transformer = new VideosTransformer();
  return transformer.transform(stories);
}
