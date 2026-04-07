import type { POSCategory, Product } from '../types/pos.types';

export const POS_CATEGORIES: POSCategory[] = [
  { id: 'apparel', name: 'Apparel' },
  { id: 'footwear', name: 'Footwear' },
  { id: 'accessories', name: 'Accessories' },
  { id: 'sale', name: 'Sale' }
];

const placehold = (sku: string) => `https://placehold.co/120x120?text=${encodeURIComponent(sku)}`;

// Note: stock values are intentionally varied to exercise in-stock/out-of-stock UI.
export const POS_PRODUCTS: Product[] = [
  // Apparel
  {
    id: 'p-apparel-001',
    name: 'Organic Cotton T-Shirt',
    sku: 'TS-OC-001',
    category: 'apparel',
    price: 24.99,
    stock: 18,
    imageUrl: placehold('TS-OC-001'),
    taxRate: 0.08
  },
  {
    id: 'p-apparel-002',
    name: 'Ribbed Henley Top',
    sku: 'HL-RB-002',
    category: 'apparel',
    price: 29.5,
    stock: 7,
    imageUrl: placehold('HL-RB-002'),
    taxRate: 0.08
  },
  {
    id: 'p-apparel-003',
    name: 'Flannel Button-Up',
    sku: 'FB-FT-003',
    category: 'apparel',
    price: 42.0,
    stock: 3,
    imageUrl: placehold('FB-FT-003'),
    taxRate: 0.08
  },
  {
    id: 'p-apparel-004',
    name: 'Lightweight Hoodie',
    sku: 'HD-LW-004',
    category: 'apparel',
    price: 49.0,
    stock: 12,
    imageUrl: placehold('HD-LW-004'),
    taxRate: 0.08
  },
  {
    id: 'p-apparel-005',
    name: 'Denim Jacket',
    sku: 'DJ-DN-005',
    category: 'apparel',
    price: 84.0,
    stock: 0,
    imageUrl: placehold('DJ-DN-005'),
    taxRate: 0.08
  },

  // Footwear
  {
    id: 'p-foot-001',
    name: 'Everyday Sneakers',
    sku: 'SN-EV-101',
    category: 'footwear',
    price: 59.99,
    stock: 22,
    imageUrl: placehold('SN-EV-101'),
    taxRate: 0.08
  },
  {
    id: 'p-foot-002',
    name: 'Trail Running Shoes',
    sku: 'TR-RN-102',
    category: 'footwear',
    price: 79.99,
    stock: 9,
    imageUrl: placehold('TR-RN-102'),
    taxRate: 0.08
  },
  {
    id: 'p-foot-003',
    name: 'Leather Loafers',
    sku: 'LF-LR-103',
    category: 'footwear',
    price: 74.5,
    stock: 5,
    imageUrl: placehold('LF-LR-103'),
    taxRate: 0.08
  },
  {
    id: 'p-foot-004',
    name: 'Canvas Slip-Ons',
    sku: 'CS-CN-104',
    category: 'footwear',
    price: 34.95,
    stock: 0,
    imageUrl: placehold('CS-CN-104'),
    taxRate: 0.08
  },

  // Accessories
  {
    id: 'p-acc-001',
    name: 'Woven Belt',
    sku: 'BL-WV-201',
    category: 'accessories',
    price: 21.99,
    stock: 25,
    imageUrl: placehold('BL-WV-201'),
    taxRate: 0.08
  },
  {
    id: 'p-acc-002',
    name: 'Minimalist Wallet',
    sku: 'WL-MN-202',
    category: 'accessories',
    price: 18.25,
    stock: 11,
    imageUrl: placehold('WL-MN-202'),
    taxRate: 0.08
  },
  {
    id: 'p-acc-003',
    name: 'Stainless Water Bottle',
    sku: 'WB-SS-203',
    category: 'accessories',
    price: 26.75,
    stock: 6,
    imageUrl: placehold('WB-SS-203'),
    taxRate: 0.08
  },
  {
    id: 'p-acc-004',
    name: 'Crossbody Sling Bag',
    sku: 'SB-CB-204',
    category: 'accessories',
    price: 39.99,
    stock: 2,
    imageUrl: placehold('SB-CB-204'),
    taxRate: 0.08
  },
  {
    id: 'p-acc-005',
    name: 'Sunglasses',
    sku: 'SG-SN-205',
    category: 'accessories',
    price: 22.5,
    stock: 14,
    imageUrl: placehold('SG-SN-205'),
    taxRate: 0.08
  },

  // Equipment
  {
    id: 'p-eq-001',
    name: 'Insulated Lunch Tote',
    sku: 'LT-IS-301',
    category: 'accessories',
    price: 33.0,
    stock: 15,
    imageUrl: placehold('LT-IS-301'),
    taxRate: 0.08
  },
  {
    id: 'p-eq-002',
    name: 'Compact Camping Lantern',
    sku: 'CL-CM-302',
    category: 'accessories',
    price: 27.5,
    stock: 8,
    imageUrl: placehold('CL-CM-302'),
    taxRate: 0.08
  },
  {
    id: 'p-eq-003',
    name: 'Trail Backpack (20L)',
    sku: 'TB-TR-303',
    category: 'accessories',
    price: 89.0,
    stock: 4,
    imageUrl: placehold('TB-TR-303'),
    taxRate: 0.08
  },
  {
    id: 'p-eq-004',
    name: 'Folding Utility Tool',
    sku: 'UT-FD-304',
    category: 'accessories',
    price: 24.0,
    stock: 1,
    imageUrl: placehold('UT-FD-304'),
    taxRate: 0.08
  },
  {
    id: 'p-eq-005',
    name: 'Outdoor Windbreaker',
    sku: 'WB-OT-305',
    category: 'accessories',
    price: 68.0,
    stock: 10,
    imageUrl: placehold('WB-OT-305'),
    taxRate: 0.08
  },

  // Sale
  {
    id: 'p-sale-001',
    name: 'Seasonal Clearance Tee',
    sku: 'SC-TC-401',
    category: 'sale',
    price: 12.99,
    stock: 30,
    imageUrl: placehold('SC-TC-401'),
    taxRate: 0.08
  },
  {
    id: 'p-sale-002',
    name: 'Marked-Down Hoodie',
    sku: 'MD-HD-402',
    category: 'sale',
    price: 24.5,
    stock: 13,
    imageUrl: placehold('MD-HD-402'),
    taxRate: 0.08
  },
  {
    id: 'p-sale-003',
    name: 'Discounted Running Cap',
    sku: 'DR-CP-403',
    category: 'sale',
    price: 9.75,
    stock: 0,
    imageUrl: placehold('DR-CP-403'),
    taxRate: 0.08
  },
  {
    id: 'p-sale-004',
    name: 'Clearance Belt Pack',
    sku: 'CB-BP-404',
    category: 'sale',
    price: 14.25,
    stock: 6,
    imageUrl: placehold('CB-BP-404'),
    taxRate: 0.08
  }
];
