/**
 * Test Transformation Script
 *
 * Loads data from discovery reports and tests transformers.
 * Usage: node src/test-transform.js [content-type]
 */

import fs from 'fs';
import { transformTeamMembers } from './transformers/team-members.js';

// Load raw stories from discovery
function loadStories() {
  const rawStories = JSON.parse(
    fs.readFileSync('./reports/raw-stories.json', 'utf-8')
  );
  return rawStories;
}

// Filter stories by content type
function filterByType(stories, contentType) {
  return stories.filter(story => story.content_type === contentType);
}

// Test Team Members transformation
function testTeamMembers() {
  console.log('\n🧪 Testing Team Members Transformer\n');
  console.log('════════════════════════════════════════════════════════\n');

  const allStories = loadStories();
  const personStories = filterByType(allStories, 'Person');

  console.log(`Found ${personStories.length} Person stories\n`);

  // Transform all
  const results = transformTeamMembers(personStories);

  console.log('Results:');
  console.log(`✅ Successful: ${results.successful}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total: ${results.total}\n`);

  // Show errors if any
  if (results.errors.length > 0) {
    console.log('Errors:');
    results.errors.forEach((error, idx) => {
      console.log(`\n${idx + 1}. ${error.sourceName} (ID: ${error.sourceId})`);
      error.errors.forEach(err => {
        console.log(`   - ${err.type}: ${err.message}`);
      });
    });
    console.log('');
  }

  // Show sample of transformed items
  if (results.items.length > 0) {
    console.log('Sample transformed items (first 3):\n');
    results.items.slice(0, 3).forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.name}`);
      console.log(`   Slug: ${item.slug}`);
      console.log(`   Role: ${item.role || '(none)'}`);
      console.log(`   Email: ${item.email || '(none)'}`);
      console.log(`   Image: ${item.profileImage ? '✓' : '✗'}`);
      console.log(`   Tags: ${item.tags.map(t => t.name).join(', ') || '(none)'}`);
      console.log('');
    });
  }

  // Save transformed data
  const outputPath = './output/transformed/team-members.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`💾 Saved transformed data to: ${outputPath}\n`);

  console.log('════════════════════════════════════════════════════════\n');

  return results;
}

// Main
function main() {
  const contentType = process.argv[2] || 'team-members';

  switch (contentType) {
    case 'team-members':
    case 'person':
      testTeamMembers();
      break;

    default:
      console.log('Usage: node src/test-transform.js [content-type]');
      console.log('\nAvailable content types:');
      console.log('  - team-members (or person)');
      console.log('  - articles (coming soon)');
      console.log('  - videos (coming soon)');
      console.log('  - projects (coming soon)');
      process.exit(1);
  }
}

main();
