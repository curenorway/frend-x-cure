/**
 * Projects Transformer
 *
 * Transforms Storyblok project (case studies) content to Webflow CMS format
 * Handles: 123 project items with client info, tools, results, rich content
 */

import { BaseTransformer } from './base.js';
import { convertRichText } from '../converters/richtext.js';

export class ProjectsTransformer extends BaseTransformer {
  constructor() {
    super('project', 'projects');
  }

  transformItem(story) {
    const content = story.content || {};
    const transformed = {
      // Core fields
      name: story.name || 'Untitled Project',
      slug: story.slug,

      // Titles (responsive)
      title: content.title || story.name,
      smallTitle: content.smallTitle || content.title,
      mobileTitle: content.mobileTitle || content.title,

      // Project metadata
      description: content.subtext || '',
      customer: content.customer || '',
      contactPerson: content.contact || '',

      // Tags and categorization
      tags: this.parseTags(content.highlightTags),

      // Images
      featuredImage: content.image?.filename || null,
      featuredImageAlt: content.image?.alt || content.title,
      pageImage: content.pageImage?.filename || null,
      pageImageAlt: content.pageImage?.alt || '',

      // External link to live project
      websiteUrl: content.webpage || null,
      websiteLabel: content.webpageLabel || 'Visit Website',

      // Project details (rich text)
      tools: content.tools ? convertRichText(content.tools) : '',
      results: content.results ? convertRichText(content.results) : '',

      // Rich content body
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

      case 'imageGrid':
        return {
          images: blok.images || [],
          inArticle: blok.inArticle || false
        };

      case 'imageGallery':
        return {
          images: blok.images || [],
          columns: blok.columns || 3
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

      case 'featuredPeople':
        return {
          title: blok.title || '',
          people: blok.people || []
        };

      default:
        // Return raw blok for unknown types
        return blok;
    }
  }
}

/**
 * Transform array of project stories
 */
export function transformProjects(stories) {
  const transformer = new ProjectsTransformer();
  return transformer.transform(stories);
}
