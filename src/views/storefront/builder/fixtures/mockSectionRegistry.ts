/**
 * TEMPORARY fixtures — match T1 SectionRegistry shape for local/dev fallback.
 * Prefer storefrontAPI.getRegistry() via useBuilderData when authenticated.
 */
import type { SectionRegistry } from 'types/storefront';

export const mockSectionRegistry: SectionRegistry = {
  hero: {
    label: 'Hero',
    icon: 'layout-hero',
    max_per_page: 1,
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', required: true, max_length: 80, default: 'Welcome' },
      { key: 'body', label: 'Body', type: 'richtext', default: '<p>Tell your story.</p>' },
      { key: 'background_image', label: 'Background image', type: 'media' },
      { key: 'overlay_color', label: 'Overlay color', type: 'color', default: '#000000' },
      { key: 'show_cta', label: 'Show CTA button', type: 'toggle', default: true }
    ]
  },
  'product-grid': {
    label: 'Product grid',
    icon: 'grid',
    max_per_page: null,
    fields: [
      { key: 'title', label: 'Title', type: 'text', max_length: 60, default: 'Featured products' },
      {
        key: 'columns',
        label: 'Columns',
        type: 'select',
        options: ['2', '3', '4'],
        default: '3'
      },
      { key: 'collection', label: 'Collection', type: 'collection_ref' },
      { key: 'max_products', label: 'Max products', type: 'number', min: 1, max: 24, default: 8 },
      { key: 'show_prices', label: 'Show prices', type: 'toggle', default: true }
    ]
  },
  'image-with-text': {
    label: 'Image with text',
    icon: 'photo',
    max_per_page: null,
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', default: 'Our story' },
      { key: 'body', label: 'Body', type: 'richtext' },
      { key: 'image', label: 'Image', type: 'media', required: true },
      {
        key: 'image_position',
        label: 'Image position',
        type: 'select',
        options: ['left', 'right'],
        default: 'left'
      }
    ]
  },
  faq: {
    label: 'FAQ',
    icon: 'help',
    max_per_page: null,
    fields: [
      { key: 'heading', label: 'Heading', type: 'text', default: 'Frequently asked questions' },
      { key: 'intro', label: 'Intro', type: 'richtext' },
      { key: 'accent_color', label: 'Accent color', type: 'color', default: '#1A73E8' },
      { key: 'open_first', label: 'Open first item by default', type: 'toggle', default: false }
    ]
  }
};
