import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Autocomplete,
  Collapse,
  Link,
  Stack
} from '@mui/material';
import { IconX, IconPackage, IconAlertTriangle, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { fieldValue, integerOrNull, numberOrNull } from 'utils/numericField';

import { InventoryItem, InventoryFormData } from '../../../types/inventory';
import { useDispatch, useSelector } from '../../../store';
import {
  createInventoryItem,
  updateInventoryItem,
  clearError,
  fetchInventoryItems,
  fetchInventorySummary
} from '../../../store/slices/inventory';
import { getCategoriesByItemType } from '../../../utils/inventoryUtils';
import { checkSkuAvailability } from '../../../api/inventory.api';
import {
  getAttributeVocabulary,
  listProducts,
  resolveSizeScale,
  type AttributeKey,
  type Product,
  type ResolvedSizeScale
} from '../../../api/inventoryStock.api';
import { suggestSku } from '../../../views/inventory/matrix';
import { styleLink } from '../../../views/inventory/garmentFields';
import {
  ATTRIBUTE_KEYS,
  buildItemUpdatePayload,
  derivedVariantName,
  distinctColors,
  mintStyleCode,
  planItemSubmission,
  sizeControlFor,
  type GarmentFormState
} from '../../../views/inventory/itemForm';
import { submitItem } from '../../../views/inventory/itemSubmit';

interface InventoryModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  item?: InventoryItem | null; // Required for edit mode
  prefilledBarcode?: string; // Optional for add mode
  /**
   * Accepted and inert, deliberately.
   *
   * It used to do two jobs: hide the Quantity on Hand field, and drop
   * `quantity_on_hand` from the PATCH. Both are now unconditional in edit mode
   * — there is no quantity field, and buildItemUpdatePayload never sends the
   * key — so nothing is left for the flag to switch.
   *
   * Being opt-in is precisely what made it unsafe: BarcodeScannerModal opens
   * this modal in edit mode WITHOUT it, so that door went on PATCHing the
   * column ALL-81 exists to stop. The prop stays so existing callers compile,
   * and because ALL-178 is in flight on this same file.
   */
  metadataOnly?: boolean;
}

/** The Garment section's own state, empty. */
const emptyGarment = (): GarmentFormState => ({
  styleId: null,
  brand: '',
  season: '',
  composition: '',
  care: '',
  origin: '',
  fitNotes: '',
  attributes: {},
  size: '',
  sizeValues: [],
  color: '',
  takenStyleCodes: []
});

const InventoryModal: React.FC<InventoryModalProps> = ({ open, onClose, mode, item, prefilledBarcode }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.inventory);

  const [formData, setFormData] = useState<InventoryFormData>({
    name: '',
    sku: '',
    description: '',
    quantity_on_hand: 0,
    unit_price: 0,
    cost_price: 0,
    category: '',
    reorder_point: 0,
    barcode: '',
    max_stock_level: 0,
    item_type: 'Inventory',
    status: 'active',
    is_taxable: false,
    weight: 0,
    dimensions_length: 0,
    dimensions_width: 0,
    dimensions_height: 0,
    location: '',
    bin_location: '',
    size: '',
    color: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [savedItem, setSavedItem] = useState<InventoryItem | null>(item || null);

  // --- Garment ------------------------------------------------------------
  const [garment, setGarment] = useState<GarmentFormState>(emptyGarment);
  /** Opening stock, which lands as a ledger movement (`opening_qty`) rather
   * than the flat `quantity_on_hand` column write the legacy door did. */
  const [openingQty, setOpeningQty] = useState<number | null>(0);
  const [styles, setStyles] = useState<Product[]>([]);
  const [scale, setScale] = useState<ResolvedSizeScale | null>(null);
  const [vocabulary, setVocabulary] = useState<Partial<Record<AttributeKey, string[]>>>({});
  const [garmentDetailsOpen, setGarmentDetailsOpen] = useState(false);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  /** Once a human edits the SKU, stop regenerating it: a supplier's own code
   * wins over ours (the same rule matrix.ts applies to the grid). */
  const [skuEdited, setSkuEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Get categories based on current item type
  const categories = getCategoriesByItemType(formData.item_type || 'Inventory');

  // Helper functions to determine field visibility based on item type and mode
  const isInventory = formData.item_type === 'Inventory';
  const isNonInventory = formData.item_type === 'NonInventory';

  const chosenStyle = styles.find((style) => style.id === garment.styleId) || null;
  /** The style the item already belongs to, in edit mode. */
  const existingStyle = item?.product || null;
  const sizeControl = sizeControlFor(scale);
  const colorOptions = distinctColors(styles);

  useEffect(() => {
    const sku = (formData.sku || '').trim();
    if (!sku || mode !== 'edit') return;
    const timer = window.setTimeout(async () => {
      try {
        const available = await checkSkuAvailability(sku, item?.id);
        setValidationErrors((prev) => ({ ...prev, sku: available ? '' : 'This SKU is already in use.' }));
      } catch {
        // Availability checks should not block editing when the endpoint is unavailable.
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [formData.sku, mode, item?.id]);

  // Inventory fields visibility
  const showInventoryFields = isInventory;
  const showOpeningQty = isInventory && mode === 'add'; // Opening stock, ledger-backed
  /**
   * The Garment section, and with it the two style-aware creation doors, is for
   * Inventory items only. `_create_variant` hardcodes `item_type="Inventory"`,
   * so a Service routed through `create_style` would come back mis-typed — the
   * two non-stock types keep the legacy item endpoint, which is the only door
   * that can express them.
   */
  const showGarment = isInventory;

  // Physical fields visibility (Inventory and NonInventory only)
  const showPhysicalFields = isInventory || isNonInventory;

  // Initialize form data based on mode
  useEffect(() => {
    if (open) {
      // Clear any previous errors and reset form when modal opens
      dispatch(clearError());
      setValidationErrors({});
      setSubmitError(null);
      setSkuEdited(mode === 'edit');
      setGarmentDetailsOpen(false);
      setMoreDetailsOpen(false);
      setOpeningQty(0);

      if (mode === 'edit' && item) {
        setSavedItem(item);
        setGarment({
          ...emptyGarment(),
          // Read-only in edit mode: moving a variant to another style is out of
          // scope, and InventoryItemUpdateSerializer refuses `product`.
          styleId: item.product?.id || null,
          size: item.size || '',
          color: item.color || ''
        });
        // Edit mode: populate form with existing item data
        setFormData({
          name: item.name || '',
          sku: item.sku || '',
          description: item.description || '',
          quantity_on_hand: item.quantity_on_hand || 0,
          unit_price: item.unit_price || 0,
          cost_price: item.cost_price || 0,
          category: item.category || '',
          reorder_point: item.reorder_point || 0,
          barcode: item.barcode || '',
          max_stock_level: (item as any).max_stock_level || 0,
          item_type: (item as any).item_type || 'Inventory',
          status: (item as any).status || 'active',
          is_taxable: (item as any).is_taxable ?? false,
          weight: (item as any).weight || 0,
          dimensions_length: (item as any).dimensions_length || 0,
          dimensions_width: (item as any).dimensions_width || 0,
          dimensions_height: (item as any).dimensions_height || 0,
          location: (item as any).location || '',
          bin_location: (item as any).bin_location || '',
          size: item.size || '',
          color: item.color || ''
        });
      } else {
        setSavedItem(null);
        setGarment(emptyGarment());
        // Add mode: reset to default values
        setFormData({
          name: '',
          sku: '',
          description: '',
          quantity_on_hand: 0,
          unit_price: 0,
          cost_price: 0,
          category: '',
          reorder_point: 0,
          barcode: prefilledBarcode || '',
          max_stock_level: 0,
          item_type: 'Inventory',
          status: 'active',
          is_taxable: false,
          weight: 0,
          dimensions_length: 0,
          dimensions_width: 0,
          dimensions_height: 0,
          location: '',
          bin_location: '',
          size: '',
          color: ''
        });
      }
    }
  }, [open, mode, item, prefilledBarcode, dispatch]);

  // The company's styles: the Style picker's options, the Color suggestions,
  // and the style codes a minted one has to step around — one request, because
  // ALL-189 is explicit that the colour list needs no new endpoint.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listProducts()
      .then((loaded) => {
        if (cancelled) return;
        setStyles(loaded);
        setGarment((prev) => ({ ...prev, takenStyleCodes: loaded.map((style) => style.style_code).filter(Boolean) }));
      })
      .catch(() => {
        // A style is optional — without the list the operator can still create
        // a new one, they just get no suggestions.
        if (!cancelled) setStyles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getAttributeVocabulary()
      .then((loaded) => {
        if (!cancelled) setVocabulary(loaded);
      })
      .catch(() => {
        // Suggestions only: every attribute field is free-solo, so an empty
        // vocabulary costs the operator autocomplete, not the field.
        if (!cancelled) setVocabulary({});
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Which scale governs the sizes, resolved by the SERVER as the style or the
  // category changes — resolution is a server rule (style override, then
  // category binding, then none) and re-implementing it here would be a second
  // opinion. Debounced because Category is a free-solo field being typed into.
  const resolveTarget = garment.styleId || item?.product?.id || null;
  const resolveCategory = (formData.category || '').trim();

  useEffect(() => {
    if (!open || !showGarment) {
      setScale(null);
      return;
    }
    if (!resolveTarget && !resolveCategory) {
      setScale(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      resolveSizeScale(resolveTarget ? { product: resolveTarget } : { category: resolveCategory })
        .then((resolved) => {
          if (!cancelled) setScale(resolved);
        })
        .catch(() => {
          // No scale is a real answer here, and so is a failed lookup: both
          // leave the operator a text box rather than a blocked form.
          if (!cancelled) setScale(null);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, showGarment, resolveTarget, resolveCategory]);

  // A value picked off the old scale is not on the new one.
  const scaleId = scale?.id || '';
  useEffect(() => {
    if (mode !== 'add') return;
    setGarment((prev) => (prev.sizeValues.length === 0 ? prev : { ...prev, sizeValues: [] }));
  }, [scaleId, mode]);

  /** The style code the SKU is suggested from: the chosen style's, or the one
   * "New style from this item" is going to mint. */
  const effectiveStyleCode =
    chosenStyle?.style_code || mintStyleCode({ brand: garment.brand, name: formData.name, taken: garment.takenStyleCodes });

  const chosenSize = garment.sizeValues.filter(Boolean).join('-') || garment.size;

  // Suggest, never impose: the field stays editable and regeneration stops the
  // moment a human touches it.
  useEffect(() => {
    if (mode !== 'add' || !showGarment || skuEdited) return;
    setFormData((prev) => ({ ...prev, sku: suggestSku(effectiveStyleCode, garment.color, chosenSize) }));
  }, [mode, showGarment, skuEdited, effectiveStyleCode, garment.color, chosenSize]);

  const pickStyle = (style: Product | null) => {
    if (!style) {
      setGarment((prev) => ({ ...prev, styleId: null }));
      return;
    }
    // Picking an existing style prefills its description — read-only here,
    // because the catalogue is where a style is edited.
    setGarment((prev) => ({
      ...prev,
      styleId: style.id,
      brand: style.brand || '',
      season: style.season || '',
      composition: style.composition || '',
      care: style.care || '',
      origin: style.origin || '',
      fitNotes: style.fit_notes || '',
      attributes: { ...(style.attributes || {}) } as Record<string, string>,
      sizeValues: []
    }));
    setFormData((prev) => ({ ...prev, category: style.category || prev.category }));
  };

  const setGarmentField = (field: keyof GarmentFormState, value: any) => setGarment((prev) => ({ ...prev, [field]: value }));

  const setSizeAxis = (index: number, value: string) =>
    setGarment((prev) => {
      const next = [...prev.sizeValues];
      while (next.length < index) next.push('');
      next[index] = value;
      return { ...prev, sizeValues: next, size: '' };
    });

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Always required fields
    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    }

    if (!formData.item_type) {
      errors.item_type = 'Item type is required';
    }
    if (validationErrors.sku) errors.sku = validationErrors.sku;

    // Both style doors require a SKU and refuse a blank one, so the form asks
    // for it rather than letting the operator collect a 400. It is suggested
    // for them, so this only bites if they clear it.
    if (mode === 'add' && showGarment && !(formData.sku || '').trim()) {
      errors.sku = 'SKU is required — clear the style or size to regenerate one';
    }

    // A composite scale takes both axes; one of two is a 400 listing blockers.
    if (mode === 'add' && sizeControl.kind === 'composite') {
      const [first, second] = garment.sizeValues;
      if (Boolean(first) !== Boolean(second)) {
        errors.size = `${sizeControl.axes[0].label} and ${sizeControl.axes[1].label} are both required`;
      }
    }

    if (showOpeningQty && openingQty !== null && openingQty < 0) {
      errors.opening_qty = 'Opening quantity cannot be negative';
    }

    if (showInventoryFields) {
      if ((formData.reorder_point || 0) < 0) {
        errors.reorder_point = 'Reorder point cannot be negative';
      }

      if ((formData.max_stock_level || 0) < 0) {
        errors.max_stock_level = 'Max stock level cannot be negative';
      }

      // Reorder point should be less than max stock level
      if ((formData.reorder_point || 0) >= (formData.max_stock_level || 0) && (formData.max_stock_level || 0) > 0) {
        errors.reorder_point = 'Reorder point must be less than max stock level';
      }
    }

    // General validation (always applies)
    if (formData.unit_price < 0) {
      errors.unit_price = 'Unit price cannot be negative';
    }

    if (formData.cost_price && formData.cost_price < 0) {
      errors.cost_price = 'Cost price cannot be negative';
    }

    if (showPhysicalFields && (formData.weight || 0) < 0) {
      errors.weight = 'Weight cannot be negative';
    }

    // Dimensions validation: all three dimensions are necessary or none
    if (showPhysicalFields) {
      const hasLength = (formData.dimensions_length || 0) > 0;
      const hasWidth = (formData.dimensions_width || 0) > 0;
      const hasHeight = (formData.dimensions_height || 0) > 0;

      const dimensionCount = [hasLength, hasWidth, hasHeight].filter(Boolean).length;

      if (dimensionCount > 0 && dimensionCount < 3) {
        errors.dimensions_length = 'All three dimensions (Length, Width, Height) are required together';
        errors.dimensions_width = 'All three dimensions (Length, Width, Height) are required together';
        errors.dimensions_height = 'All three dimensions (Length, Width, Height) are required together';
      }
    }

    setValidationErrors(errors);
    // A dimension error lives below the fold; open it so the operator can see
    // what the form is complaining about.
    if (errors.dimensions_length || errors.weight) setMoreDetailsOpen(true);
    return Object.keys(errors).length === 0;
  };

  /**
   * ALL-108 — clearing a numeric field must not mean zero.
   *
   * Every numeric input here was `parseFloat(e.target.value) || 0`, so
   * backspacing the last digit of a price set it to 0 rather than leaving the
   * box empty — and `|| 0` cannot tell an empty field from a typed zero, a
   * NaN, or a lone minus sign.
   *
   * `numericText` is what the box literally shows while it is being edited;
   * `formData` keeps the last value that actually parsed. An empty box stays
   * empty, commits nothing, and snaps back to the committed value on blur.
   */
  const [numericText, setNumericText] = useState<Record<string, string>>({});

  const numericFieldProps = (field: keyof InventoryFormData, parse: (raw: string) => number | null) => ({
    value: numericText[field as string] ?? (formData[field] as number),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setNumericText((prev) => ({ ...prev, [field as string]: e.target.value }));
      const parsed = parse(e.target.value);
      if (parsed !== null) handleInputChange(field, parsed);
    },
    onBlur: () =>
      setNumericText((prev) => {
        const { [field as string]: _dropped, ...rest } = prev;
        return rest;
      })
  });

  const handleInputChange = (field: keyof InventoryFormData, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Auto-reset fields based on item type selection
      if (field === 'item_type') {
        switch (value) {
          case 'NonInventory':
            // Clear inventory-specific fields
            newData.quantity_on_hand = 0;
            newData.reorder_point = 0;
            newData.max_stock_level = 0;
            newData.bin_location = '';
            break;
          case 'Service':
            // Clear inventory and physical fields
            newData.quantity_on_hand = 0;
            newData.reorder_point = 0;
            newData.max_stock_level = 0;
            newData.weight = 0;
            newData.dimensions_length = 0;
            newData.dimensions_width = 0;
            newData.dimensions_height = 0;
            newData.bin_location = '';
            break;
          case 'Inventory':
            // Keep all fields as they are
            break;
        }
      }

      return newData;
    });

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  /** The one place a server refusal becomes something the operator can read. */
  const describeError = (err: unknown): string => {
    const response = (err as { response?: { status?: number; data?: any } })?.response;
    const data = response?.data ?? {};

    if (response?.status === 409) {
      const existing = data?.detail?.existing_sku;
      return existing
        ? `That size and colour already exist on this style (${existing}).`
        : 'That size and colour already exist on this style.';
    }
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail) && data.detail.length) return String(data.detail[0]);
    const firstField = Object.values(data).find((value) => Array.isArray(value) && value.length);
    if (Array.isArray(firstField)) return String(firstField[0]);
    return `Could not ${mode === 'add' ? 'add' : 'update'} the item.`;
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (mode === 'add' && showGarment) {
        // The two style doors. Never the legacy item-create endpoint: it knows
        // nothing about styles, and its opening quantity is a column write that
        // skips the stock ledger.
        await submitItem(
          planItemSubmission(
            {
              name: formData.name,
              sku: formData.sku,
              barcode: formData.barcode,
              description: formData.description,
              category: formData.category,
              unit_price: formData.unit_price,
              cost_price: formData.cost_price,
              opening_qty: openingQty ?? 0
            },
            garment
          )
        );
        // The doors return the style, not the flat item list this screen reads.
        await Promise.all([dispatch(fetchInventoryItems() as any), dispatch(fetchInventorySummary() as any)]);
      } else if (mode === 'add') {
        // Service and NonInventory: the style doors hardcode
        // item_type="Inventory", so these two keep the only endpoint that can
        // express them. No garment, no size, no opening ledger movement.
        const result = await dispatch(createInventoryItem(formData) as any).unwrap();
        setSavedItem(result.item);
      } else if (mode === 'edit' && item) {
        // quantity_on_hand is stripped for every caller, not just metadataOnly
        // ones — see buildItemUpdatePayload and ALL-81.
        const result = await dispatch(
          updateInventoryItem({
            itemId: item.id,
            itemData: buildItemUpdatePayload(formData as unknown as Record<string, unknown>, {
              size: garment.size,
              sizeValues: garment.sizeValues,
              color: garment.color
            }) as any
          }) as any
        ).unwrap();
        setSavedItem(result.item);
      }

      onClose();
    } catch (err) {
      console.error(`Failed to ${mode} item:`, err);
      setSubmitError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Clear errors and reset form state when closing
    dispatch(clearError());
    setValidationErrors({});
    setSubmitError(null);
    setGarment(emptyGarment());
    setOpeningQty(0);
    setScale(null);
    setFormData({
      name: '',
      sku: '',
      description: '',
      quantity_on_hand: 0,
      unit_price: 0,
      cost_price: 0,
      category: '',
      reorder_point: 0,
      barcode: '',
      max_stock_level: 0,
      item_type: 'Inventory',
      status: 'active',
      is_taxable: false,
      weight: 0,
      dimensions_length: 0,
      dimensions_width: 0,
      dimensions_height: 0,
      location: '',
      bin_location: ''
    });
    onClose();
  };

  // Check stock status (only for edit mode and Inventory items)
  const isLowStock =
    mode === 'edit' && isInventory && formData.quantity_on_hand <= (formData.reorder_point ?? 0) && formData.quantity_on_hand > 0;
  const isOutOfStock = mode === 'edit' && isInventory && formData.quantity_on_hand === 0;

  // Modal configuration based on mode
  const modalConfig = {
    title: mode === 'add' ? 'Add Inventory Item' : 'Edit Inventory Item',
    icon: IconPackage,
    iconColor: '#1976d2',
    buttonText: mode === 'add' ? 'Add Item' : 'Update Item',
    buttonLoadingText: mode === 'add' ? 'Adding Item...' : 'Updating Item...',
    subtitle:
      mode === 'add'
        ? 'Create a new inventory item with all necessary details'
        : `${item?.name || 'Unknown Product'} • ${item?.sku || 'No SKU'} • ${item?.category || 'No Category'}`
  };

  const busy = loading || submitting;
  const styleLocked = mode === 'edit';
  /** On an existing style the server names the variant itself. */
  const nameIsDerived = mode === 'add' && Boolean(chosenStyle);

  const renderSizeControl = () => {
    if (sizeControl.kind === 'text') {
      return (
        <Grid size={6}>
          <TextField
            label="Size"
            value={garment.size}
            onChange={(e) => setGarmentField('size', e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g., M"
            error={!!validationErrors.size}
            helperText={validationErrors.size || sizeControl.helper}
          />
        </Grid>
      );
    }

    return (
      <>
        {sizeControl.axes.map((axis, index) => (
          <Grid size={sizeControl.kind === 'composite' ? 3 : 6} key={axis.label}>
            <FormControl fullWidth size="small" error={!!validationErrors.size}>
              <InputLabel>{axis.label}</InputLabel>
              <Select
                value={garment.sizeValues[index] || ''}
                onChange={(e) => setSizeAxis(index, e.target.value)}
                label={axis.label}
                disabled={styleLocked && !axis.values.length}
              >
                <MenuItem value="">
                  <em>Not set</em>
                </MenuItem>
                {/* Scale order, not alphabetical: XS, S, M, L is a size run. */}
                {axis.values.map((value) => (
                  <MenuItem value={value} key={value}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
              {(validationErrors.size || scale?.name) && (
                <Typography variant="caption" color={validationErrors.size ? 'error' : 'text.secondary'} sx={{ mt: 0.5, ml: 1.5 }}>
                  {validationErrors.size || scale?.name}
                </Typography>
              )}
            </FormControl>
          </Grid>
        ))}
      </>
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ p: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <modalConfig.icon size={24} color={modalConfig.iconColor} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {modalConfig.title}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {modalConfig.subtitle}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <IconX size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Stock Status Alert - Only show for edit mode and Inventory items */}
        {mode === 'edit' && isInventory && (isLowStock || isOutOfStock) && (
          <Alert severity={isOutOfStock ? 'error' : 'warning'} sx={{ mb: 3 }} icon={<IconAlertTriangle size={20} />}>
            <Typography variant="body1" fontWeight="600">
              {isOutOfStock ? 'Out of Stock' : 'Low Stock Alert'}
            </Typography>
            <Typography variant="body2">
              {isOutOfStock
                ? 'This item is currently out of stock. Consider restocking soon.'
                : `Stock level (${formData.quantity_on_hand}) is at or below reorder point (${formData.reorder_point}).`}
            </Typography>
          </Alert>
        )}

        {(error || submitError) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {submitError || error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Item Configuration Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Item Configuration
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <FormControl fullWidth size="small" error={!!validationErrors.item_type}>
                  <InputLabel>Item Type *</InputLabel>
                  <Select value={formData.item_type} onChange={(e) => handleInputChange('item_type', e.target.value)} label="Item Type *">
                    <MenuItem value="Inventory">Inventory</MenuItem>
                    <MenuItem value="NonInventory">Non-Inventory</MenuItem>
                    <MenuItem value="Service">Service</MenuItem>
                  </Select>
                  {validationErrors.item_type && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                      {validationErrors.item_type}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid size={6}>
                {savedItem?.id && savedItem.barcode ? (
                  <Typography variant="caption">Barcode image available after save.</Typography>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    Barcode is assigned on save.
                  </Typography>
                )}
              </Grid>

              <Grid size={6}>
                <Autocomplete
                  options={categories}
                  value={formData.category || ''}
                  onChange={(event, newValue) => {
                    handleInputChange('category', newValue || '');
                  }}
                  onInputChange={(event, newValue, reason) => {
                    // Typing is what drives the size-scale lookup, so the
                    // resolver needs the keystrokes and not only a selection.
                    if (reason === 'input') handleInputChange('category', newValue || '');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Category"
                      size="small"
                      error={!!validationErrors.category}
                      helperText={validationErrors.category || (showGarment ? 'Decides which size run this item is offered' : undefined)}
                      placeholder="e.g., Shirts, Dresses, Denim"
                    />
                  )}
                  freeSolo
                  disableClearable
                  fullWidth
                  disabled={Boolean(chosenStyle)}
                />
              </Grid>
            </Grid>
          </Grid>

          {/*
            Garment section, above Basic Information: a boutique records the
            style, the size and the colour before anything else, and this form
            had nowhere to put them. Inventory items only — see showGarment.
          */}
          {showGarment && (
            <Grid size={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Garment
              </Typography>
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={6}>
                  {styleLocked ? (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Style
                      </Typography>
                      {existingStyle ? (
                        <>
                          <Link href={styleLink(existingStyle.id)} variant="body1" fontWeight="medium" underline="hover">
                            {existingStyle.name || existingStyle.style_code}
                          </Link>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {existingStyle.style_code} — edit the style in the catalogue
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Not part of a style. Moving an item onto one is not supported yet.
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Autocomplete
                      options={styles}
                      value={chosenStyle}
                      onChange={(event, newValue) => pickStyle(newValue)}
                      getOptionLabel={(style) => (style ? `${style.name}${style.style_code ? ` (${style.style_code})` : ''}` : '')}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      filterOptions={(options, state) => {
                        // Search by name OR style code: a buyer knows one or the
                        // other, rarely both.
                        const needle = state.inputValue.trim().toLowerCase();
                        if (!needle) return options;
                        return options.filter(
                          (style) =>
                            (style.name || '').toLowerCase().includes(needle) || (style.style_code || '').toLowerCase().includes(needle)
                        );
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Style"
                          size="small"
                          placeholder="New style from this item"
                          helperText={
                            chosenStyle
                              ? 'Adds this item as a new size/colour of that style'
                              : `New style from this item — code ${effectiveStyleCode}`
                          }
                        />
                      )}
                      fullWidth
                    />
                  )}
                </Grid>

                <Grid size={6}>
                  <Autocomplete
                    options={colorOptions}
                    value={garment.color}
                    onChange={(event, newValue) => setGarmentField('color', newValue || '')}
                    onInputChange={(event, newValue, reason) => {
                      if (reason === 'input') setGarmentField('color', newValue || '');
                    }}
                    renderInput={(params) => <TextField {...params} label="Color" size="small" placeholder="e.g., Ivory" />}
                    freeSolo
                    fullWidth
                  />
                </Grid>

                {renderSizeControl()}

                {/* Garment details: style-level, and only writable while
                    creating a new style. On an existing one the catalogue is
                    the place to change them. */}
                <Grid size={12}>
                  <Button
                    size="small"
                    onClick={() => setGarmentDetailsOpen((prev) => !prev)}
                    startIcon={garmentDetailsOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                    sx={{ textTransform: 'none' }}
                  >
                    Garment details {chosenStyle ? '(from the style)' : '(brand, season, composition, care)'}
                  </Button>
                  <Collapse in={garmentDetailsOpen}>
                    <Box sx={{ pt: 2 }}>
                      {chosenStyle && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          These describe the style{' '}
                          <Link href={styleLink(chosenStyle.id)} underline="hover">
                            {chosenStyle.name}
                          </Link>
                          . Edit them from the catalogue.
                        </Alert>
                      )}
                      <Grid container spacing={2}>
                        <Grid size={6}>
                          <TextField
                            label="Brand"
                            value={garment.brand}
                            onChange={(e) => setGarmentField('brand', e.target.value)}
                            fullWidth
                            size="small"
                            placeholder="e.g., Everlane"
                            disabled={Boolean(chosenStyle)}
                          />
                        </Grid>
                        <Grid size={6}>
                          <TextField
                            label="Season"
                            value={garment.season}
                            onChange={(e) => setGarmentField('season', e.target.value)}
                            fullWidth
                            size="small"
                            placeholder="e.g., SS26"
                            disabled={Boolean(chosenStyle)}
                          />
                        </Grid>
                        <Grid size={6}>
                          <TextField
                            label="Composition"
                            value={garment.composition}
                            onChange={(e) => setGarmentField('composition', e.target.value)}
                            fullWidth
                            size="small"
                            placeholder="e.g., 100% linen"
                            disabled={Boolean(chosenStyle)}
                          />
                        </Grid>
                        <Grid size={6}>
                          <TextField
                            label="Care"
                            value={garment.care}
                            onChange={(e) => setGarmentField('care', e.target.value)}
                            fullWidth
                            size="small"
                            placeholder="e.g., Cold wash, line dry"
                            disabled={Boolean(chosenStyle)}
                          />
                        </Grid>
                        <Grid size={6}>
                          <TextField
                            label="Origin"
                            value={garment.origin}
                            onChange={(e) => setGarmentField('origin', e.target.value)}
                            fullWidth
                            size="small"
                            placeholder="e.g., Portugal"
                            disabled={Boolean(chosenStyle)}
                          />
                        </Grid>
                        <Grid size={6}>
                          <TextField
                            label="Fit notes"
                            value={garment.fitNotes}
                            onChange={(e) => setGarmentField('fitNotes', e.target.value)}
                            fullWidth
                            size="small"
                            placeholder="e.g., Boxy through the body"
                            disabled={Boolean(chosenStyle)}
                          />
                        </Grid>

                        {/* One free-solo autocomplete per governed key. The
                            KEYS are closed; the VALUES are the merchant's, so
                            the vocabulary is a suggestion list and not an
                            enum. */}
                        {ATTRIBUTE_KEYS.map((key) => (
                          <Grid size={4} key={key}>
                            <Autocomplete
                              options={vocabulary[key] || []}
                              value={garment.attributes[key] || ''}
                              onChange={(event, newValue) =>
                                setGarmentField('attributes', { ...garment.attributes, [key]: newValue || '' })
                              }
                              onInputChange={(event, newValue, reason) => {
                                if (reason === 'input') setGarmentField('attributes', { ...garment.attributes, [key]: newValue || '' });
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                                  size="small"
                                  slotProps={{ htmlInput: { ...params.inputProps, maxLength: 50 } }}
                                />
                              )}
                              freeSolo
                              fullWidth
                              disabled={Boolean(chosenStyle)}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Collapse>
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* Basic Information Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Basic Information
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label={nameIsDerived ? 'Product Name' : 'Product Name *'}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={!!validationErrors.name}
                  helperText={
                    validationErrors.name ||
                    (nameIsDerived
                      ? // _create_variant names the item itself, so say so
                        // rather than let the operator type something that
                        // gets replaced.
                        `Named from the style: ${derivedVariantName(chosenStyle?.name || '', garment.color, chosenSize)}`
                      : showGarment
                        ? 'Also names the new style'
                        : undefined)
                  }
                  fullWidth
                  size="small"
                  placeholder="e.g., Linen Camp Shirt"
                  disabled={nameIsDerived}
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label={mode === 'add' && showGarment ? 'SKU *' : 'SKU'}
                  value={formData.sku}
                  onChange={(e) => {
                    setSkuEdited(true);
                    handleInputChange('sku', e.target.value);
                  }}
                  error={!!validationErrors.sku}
                  helperText={
                    validationErrors.sku ||
                    (mode === 'add' && showGarment && !skuEdited ? 'Suggested — edit it to use your own' : undefined)
                  }
                  fullWidth
                  size="small"
                  placeholder="e.g., LIN-SHIRT-IVO-M"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Barcode"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="Optional barcode or product code"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Size"
                  value={formData.size || ''}
                  onChange={(e) => handleInputChange('size', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g., M or 32×34"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Colour"
                  value={formData.color || ''}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g., Ivory"
                />
              </Grid>

              <Grid size={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)} label="Status">
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="discontinued">Discontinued</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={12}>
                <TextField
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="Cut, fabric, styling notes..."
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Pricing Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Pricing
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Unit Price"
                  type="number"
                  {...numericFieldProps('unit_price', numberOrNull)}
                  error={!!validationErrors.unit_price}
                  helperText={validationErrors.unit_price}
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                  }}
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Cost Price"
                  type="number"
                  {...numericFieldProps('cost_price', numberOrNull)}
                  error={!!validationErrors.cost_price}
                  helperText={validationErrors.cost_price}
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                  }}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Inventory Management Section - Only show for Inventory items */}
          {showInventoryFields && (
            <Grid size={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Inventory Management
              </Typography>
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
              <Grid container spacing={2}>
                {mode === 'edit' && (
                  <Grid size={12}>
                    <Typography variant="caption" color="text.secondary">
                      Stock quantity is not edited here — use Add stock (scan) or Adjust stock, which record a ledger movement.
                    </Typography>
                  </Grid>
                )}
                {showOpeningQty && (
                  <Grid size={6}>
                    <TextField
                      label="Opening quantity"
                      type="number"
                      value={fieldValue(openingQty)}
                      // ALL-108: an emptied box stays empty (null) rather than
                      // snapping to 0; it is submitted as 0, "no opening stock".
                      onChange={(e) => setOpeningQty(integerOrNull(e.target.value))}
                      error={!!validationErrors.opening_qty}
                      // Not the flat quantity_on_hand column any more: this
                      // goes through the stock ledger as an initial movement,
                      // so a style created with stock is as auditable as one
                      // that received a delivery.
                      helperText={validationErrors.opening_qty || 'Recorded as an opening stock movement'}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                )}

                <Grid size={6}>
                  <TextField
                    label="Reorder Point"
                    type="number"
                    {...numericFieldProps('reorder_point', integerOrNull)}
                    error={!!validationErrors.reorder_point}
                    helperText={validationErrors.reorder_point}
                    fullWidth
                    size="small"
                  />
                </Grid>

                <Grid size={6}>
                  <TextField
                    label="Max Stock Level"
                    type="number"
                    {...numericFieldProps('max_stock_level', integerOrNull)}
                    error={!!validationErrors.max_stock_level}
                    helperText={validationErrors.max_stock_level}
                    fullWidth
                    size="small"
                  />
                </Grid>

                <Grid size={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tax Status</InputLabel>
                    <Select
                      value={formData.is_taxable ? 'taxable' : 'non-taxable'}
                      onChange={(e) => handleInputChange('is_taxable', e.target.value === 'taxable')}
                      label="Tax Status"
                    >
                      <MenuItem value="taxable">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main' }} />
                          <Typography>Taxable Item</Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="non-taxable">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'grey.400' }} />
                          <Typography>Non-Taxable Item</Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* Location & Organization Section. Bin has moved below the fold with
              weight and dimensions — a boutique rarely fills any of them. */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Location & Organization
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g., Shop Floor, Stockroom"
                />
              </Grid>
            </Grid>
          </Grid>

          {/*
            Below the fold: weight, dimensions and bin. Kept, because a shop
            that ships needs them, but collapsed — a boutique adding a shirt
            fills none of the three, and they were sitting between the operator
            and the Add button.
          */}
          {(showPhysicalFields || isInventory) && (
            <Grid size={12}>
              <Button
                size="small"
                onClick={() => setMoreDetailsOpen((prev) => !prev)}
                startIcon={moreDetailsOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                sx={{ textTransform: 'none' }}
              >
                Shipping &amp; storage (weight, dimensions, bin)
              </Button>
              <Collapse in={moreDetailsOpen}>
                <Box sx={{ pt: 2 }}>
                  <Grid container spacing={2}>
                    {showPhysicalFields && (
                      <>
                        <Grid size={6}>
                          <TextField
                            label="Weight (lbs)"
                            type="number"
                            {...numericFieldProps('weight', numberOrNull)}
                            error={!!validationErrors.weight}
                            helperText={validationErrors.weight}
                            fullWidth
                            size="small"
                            InputProps={{
                              endAdornment: <Typography sx={{ ml: 1 }}>lbs</Typography>
                            }}
                          />
                        </Grid>

                        <Grid size={6}>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Dimensions (Length × Width × Height)
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            All three dimensions must be provided together or left empty
                          </Typography>
                        </Grid>

                        <Grid size={4}>
                          <TextField
                            label="Length (in)"
                            type="number"
                            {...numericFieldProps('dimensions_length', numberOrNull)}
                            error={!!validationErrors.dimensions_length}
                            helperText={validationErrors.dimensions_length || 'Length in inches'}
                            fullWidth
                            size="small"
                            InputProps={{
                              endAdornment: <Typography sx={{ ml: 1 }}>in</Typography>
                            }}
                          />
                        </Grid>

                        <Grid size={4}>
                          <TextField
                            label="Width (in)"
                            type="number"
                            {...numericFieldProps('dimensions_width', numberOrNull)}
                            error={!!validationErrors.dimensions_width}
                            helperText={validationErrors.dimensions_width || 'Width in inches'}
                            fullWidth
                            size="small"
                            InputProps={{
                              endAdornment: <Typography sx={{ ml: 1 }}>in</Typography>
                            }}
                          />
                        </Grid>

                        <Grid size={4}>
                          <TextField
                            label="Height (in)"
                            type="number"
                            {...numericFieldProps('dimensions_height', numberOrNull)}
                            error={!!validationErrors.dimensions_height}
                            helperText={validationErrors.dimensions_height || 'Height in inches'}
                            fullWidth
                            size="small"
                            InputProps={{
                              endAdornment: <Typography sx={{ ml: 1 }}>in</Typography>
                            }}
                          />
                        </Grid>
                      </>
                    )}

                    {isInventory && (
                      <Grid size={6}>
                        <TextField
                          label="Bin Location"
                          value={formData.bin_location}
                          onChange={(e) => handleInputChange('bin_location', e.target.value)}
                          fullWidth
                          size="small"
                          placeholder="e.g., A1-5, B2-10"
                        />
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </Collapse>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Stack direction="row" spacing={1}>
          <Button onClick={handleClose} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={busy}>
            {busy ? modalConfig.buttonLoadingText : modalConfig.buttonText}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default InventoryModal;
