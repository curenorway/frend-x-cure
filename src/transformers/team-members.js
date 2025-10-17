/**
 * Team Members Transformer
 *
 * Transforms Storyblok "Person" content type to Webflow "Team Members" collection.
 *
 * Source (Storyblok):
 * - Content Type: Person
 * - Fields: name, image, altImage, role, email, phone
 *
 * Target (Webflow):
 * - Collection: Team Members
 * - Fields: name, slug, role, email, phone, profileImage, altImage, bio, featured, sortOrder
 */

import { BaseTransformer } from './base.js';

export class TeamMemberTransformer extends BaseTransformer {
  /**
   * Transform Person to Team Member
   */
  transform() {
    const content = this.source.content || {};

    // Build the transformed object
    const transformed = {
      // Required fields
      name: this.source.name || '',
      slug: this.sanitizeSlug(this.source.slug),

      // Profile information
      role: content.role || '',
      email: content.email || '',
      phone: content.phone || '',

      // Images
      profileImage: this.resolveAssetUrl(content.image),
      altImage: this.resolveAssetUrl(content.altImage),

      // Optional fields
      bio: '', // Not in Storyblok Person, but available in Webflow

      // Meta
      featured: false,
      sortOrder: this.source.position || 0,

      // Tags for filtering (expertise areas)
      tags: this.extractTags(),

      // SEO
      ...this.extractSEO(),

      // Source tracking (helpful for debugging)
      _sourceId: this.source.id,
      _sourceUuid: this.source.uuid,
      _publishedAt: this.formatDate(this.source.published_at)
    };

    // Validate required fields
    const requiredFields = ['name', 'slug'];
    this.validate(transformed, requiredFields);

    // Add warnings for missing optional but recommended fields
    if (!transformed.profileImage) {
      this.warnings.push({
        field: 'profileImage',
        message: 'No profile image provided'
      });
    }

    if (!transformed.role) {
      this.warnings.push({
        field: 'role',
        message: 'No role/title provided'
      });
    }

    return this.getResult(transformed);
  }
}

/**
 * Transform a batch of Person stories
 */
export function transformTeamMembers(personStories) {
  const results = {
    total: personStories.length,
    successful: 0,
    failed: 0,
    items: [],
    errors: []
  };

  for (const story of personStories) {
    const transformer = new TeamMemberTransformer(story);
    const result = transformer.transform();

    if (result.success) {
      results.successful++;
      results.items.push(result.data);
    } else {
      results.failed++;
      results.errors.push({
        sourceId: story.id,
        sourceName: story.name,
        errors: result.errors
      });
    }
  }

  return results;
}
