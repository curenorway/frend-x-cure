/**
 * News Transformer
 *
 * Transforms Storyblok News content to Webflow CMS format
 * Handles: 34 news items (similar to articles but news-focused)
 */

import { BaseTransformer } from './base.js';
import { convertRichText } from '../converters/richtext.js';

export class NewsTransformer extends BaseTransformer {
  constructor() {
    super('News', 'news');
  }

  transformItem(story) {
    const content = story.content || {};
    const transformed = {
      // Core fields
      name: story.name || 'Untitled News',
      slug: story.slug,

      // News content
      title: content.title || story.name,
      subtitle: content.subtext || '',
      author: content.author || '',

      // Tags and categorization
      tags: this.parseTags(content.highlightTags),

      // Featured image
      featuredImage: content.image?.filename || null,
      featuredImageAlt: content.image?.alt || content.title,

      // Rich content body
      bodyContent: content.body ? this.transformBody(content.body) : null,

      // SEO & Meta
      metaTitle: content.metaFields?.title || content.title || story.name,
      metaDescription: content.metaFields?.description || content.subtext || '',
      ogImage: content.image?.filename || null,

      // Publishing info (important for news - show date)
      published: story.published_at || story.created_at,
      publishedDate: this.formatDate(story.published_at || story.created_at),
      lastModified: story.published_at || story.created_at,
      status: story.is_published ? 'published' : 'draft',

      // Original data reference
      storyblokId: story.id,
      storyblokUuid: story.uuid
    };

    return transformed;
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

      case 'bodyBigText':
        return {
          text: blok.text || ''
        };

      case 'bodyTitle':
        return {
          text: blok.text || '',
          inArticle: blok.inArticle || false
        };

      case 'bodyImage':
      case 'bigImage':
        return {
          image: blok.image?.filename || '',
          alt: blok.image?.alt || ''
        };

      case 'quote':
        return {
          text: blok.text || '',
          source: blok.source || ''
        };

      case 'bodyVideo':
        return {
          vimeoId: blok.vimeoId || '',
          twentyThreeEmbed: blok.twentyThreeEmbed || '',
          autoplay: blok.autoplay || false
        };

      case 'bigList':
        return {
          title: blok.title || '',
          points: blok.points ? convertRichText(blok.points) : ''
        };

      case 'bigLink':
        return {
          label: blok.label || '',
          link: blok.link || {},
          size: blok.size || 'medium'
        };

      default:
        // Return raw blok for unknown types
        return blok;
    }
  }
}

/**
 * Transform array of News stories
 */
export function transformNews(stories) {
  const transformer = new NewsTransformer();
  return transformer.transform(stories);
}
