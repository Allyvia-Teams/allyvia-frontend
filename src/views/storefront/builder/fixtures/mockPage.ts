/**
 * TEMPORARY fixture — swap to T1's pages endpoint once merged.
 */
import type { StorefrontPage } from '../types.local';

export const mockHomePage: StorefrontPage = {
  id: 'page_home_fixture',
  site: 'site_fixture',
  kind: 'home',
  handle: 'home',
  title: 'Home',
  seo_title: 'Allyvia Demo Store',
  seo_description: 'Temporary storefront home page fixture for the T2 builder.',
  is_visible: true,
  sort: 0,
  sections: [
    {
      id: 'sec_hero_1',
      type: 'hero',
      label: 'Hero',
      is_visible: true,
      sort: 0,
      settings: {
        heading: 'Welcome to our store',
        body: '<p>Discover products crafted for everyday life.</p>',
        overlay_color: '#111827',
        show_cta: true
      }
    },
    {
      id: 'sec_products_1',
      type: 'product-grid',
      label: 'Product grid',
      is_visible: true,
      sort: 1,
      settings: {
        title: 'Bestsellers',
        columns: '3',
        show_prices: true
      }
    },
    {
      id: 'sec_faq_1',
      type: 'faq',
      label: 'FAQ',
      is_visible: false,
      sort: 2,
      settings: {
        heading: 'Questions?',
        accent_color: '#1A73E8',
        open_first: false
      }
    }
  ]
};

export const mockPages: StorefrontPage[] = [
  mockHomePage,
  {
    id: 'page_about_fixture',
    site: 'site_fixture',
    kind: 'standard',
    handle: 'about',
    title: 'About',
    seo_title: 'About us',
    seo_description: 'Temporary about page fixture.',
    is_visible: true,
    sort: 1,
    sections: [
      {
        id: 'sec_image_text_1',
        type: 'image-with-text',
        label: 'Image with text',
        is_visible: true,
        sort: 0,
        settings: {
          heading: 'Built for merchants',
          image_position: 'left'
        }
      }
    ]
  }
];
