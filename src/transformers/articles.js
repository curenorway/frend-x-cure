/**
 * Articles Transformer
 *
 * Transforms Storyblok Article content to Webflow CMS format
 * Handles: 75 article items with author info, rich content, images
 */

import { BaseTransformer } from './base.js';
import { convertRichText } from '../converters/richtext.js';

export class ArticlesTransformer extends BaseTransformer {
  constructor() {
    super('Article', 'articles');
  }

  transformItem(story) {
    const content = story.content || {};
    const transformed = {
      // Core fields
      name: story.name || 'Untitled Article',
      slug: story.slug,

      // Article content
      title: content.title || story.name,
      subtitle: content.subtext || '',
      author: content.author || '',

      // Tags and categorization
      tags: this.parseTags(content.highlightTags),

      // Featured image
      featuredImage: content.image?.filename || null,
      featuredImageAlt: content.image?.alt || content.title,
      imageAsBackground: content.imageAsBackground || false,

      // Rich content body
      bodyContent: content.body ? this.transformBody(content.body) : null,

      // Calculate reading time (estimate based on body content)
      readingTime: this.estimateReadingTime(content.body),

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
   * Estimate reading time in minutes (avg 200 words/min)
   */
  estimateReadingTime(bloks) {
    if (!bloks || !Array.isArray(bloks)) return 1;

    let totalText = '';
    bloks.forEach(blok => {
      if (blok.text) {
        totalText += typeof blok.text === 'string' ? blok.text : JSON.stringify(blok.text);
      }
      if (blok.title) totalText += blok.title;
    });

    const wordCount = totalText.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);
    return Math.max(1, readingTime); // Minimum 1 minute
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
          inArticle: blok.inArticle || false,
          addMargin: blok.addMargin || false
        };

      case 'bodyImage':
      case 'bigImage':
        return {
          image: blok.image?.filename || '',
          alt: blok.image?.alt || ''
        };

      case 'paragraphImage':
        return {
          image: blok.image?.filename || '',
          alt: blok.image?.alt || '',
          size: blok.size || 'medium'
        };

      case 'imageGrid':
        return {
          images: blok.images || [],
          inArticle: blok.inArticle || false
        };

      case 'quote':
        return {
          text: blok.text || '',
          source: blok.source || ''
        };

      case 'imageQuote':
        return {
          quote: blok.quote || [],
          image: blok.image?.filename || '',
          imageCaption: blok.imageCaption || ''
        };

      case 'bodyVideo':
        return {
          vimeoId: blok.vimeoId || '',
          twentyThreeEmbed: blok.twentyThreeEmbed || '',
          autoplay: blok.autoplay || false,
          size: blok.size || 'full'
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
          size: blok.size || 'medium',
          openNew: blok.openNew || false
        };

      case 'callToAction':
        return {
          title: blok.title || '',
          ingress: blok.ingress || '',
          body: blok.body || '',
          text: blok.text || '',
          link: blok.link || {},
          color: blok.color || 'default'
        };

      default:
        // Return raw blok for unknown types
        return blok;
    }
  }
}

/**
 * Transform array of Article stories
 */
export function transformArticles(stories) {
  const transformer = new ArticlesTransformer();
  return transformer.transform(stories);
}
