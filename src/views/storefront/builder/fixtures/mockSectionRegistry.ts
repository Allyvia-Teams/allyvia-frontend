/**
 * TEMPORARY fixtures — swap to T1's section registry endpoint once merged.
 */
import type { StorefrontSectionType } from '../types.local';

export const mockSectionRegistry: StorefrontSectionType[] = [
  {
    type: 'hero',
    label: 'Hero',
    description: 'Full-width banner with headline, media, and CTA',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', required: true, max_length: 80, default: 'Welcome' },
      { key: 'body', label: 'Body', type: 'richtext', default: '<p>Tell your story.</p>' },
      { key: 'background_image', label: 'Background image', type: 'media' },
      { key: 'overlay_color', label: 'Overlay color', type: 'color', default: '#000000' },
      { key: 'show_cta', label: 'Show CTA button', type: 'toggle', default: true }
    ]
  },
  {
    type: 'product-grid',
    label: 'Product grid',
    description: 'Responsive grid of featured products',
    fields: [
      { key: 'title', label: 'Title', type: 'text', max_length: 60, default: 'Featured products' },
      {
        key: 'columns',
        label: 'Columns',
        type: 'select',
        options: [
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' }
        ],
        default: '3'
      },
      { key: 'collection', label: 'Collection', type: 'collection_ref' },
      { key: 'max_products', label: 'Max products', type: 'number', min: 1, max: 24, default: 8 },
      { key: 'show_prices', label: 'Show prices', type: 'toggle', default: true }
    ]
  },
  {
    type: 'image-with-text',
    label: 'Image with text',
    description: 'Split layout with media and copy',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', default: 'Our story' },
      { key: 'body', label: 'Body', type: 'richtext' },
      { key: 'image', label: 'Image', type: 'media', required: true },
      {
        key: 'image_position',
        label: 'Image position',
        type: 'select',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' }
        ],
        default: 'left'
      }
    ]
  },
  {
    type: 'faq',
    label: 'FAQ',
    description: 'Expandable questions and answers',
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', default: 'Frequently asked questions' },
      { key: 'intro', label: 'Intro', type: 'richtext' },
      { key: 'accent_color', label: 'Accent color', type: 'color', default: '#1A73E8' },
      { key: 'open_first', label: 'Open first item by default', type: 'toggle', default: false }
    ]
  }
];
