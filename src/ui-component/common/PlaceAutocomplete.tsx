import { useEffect, useRef } from 'react';
import { Box, FormControl, FormHelperText, InputLabel, TextFieldProps } from '@mui/material';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

interface PlaceAutocompleteProps extends Omit<TextFieldProps, 'onChange' | 'value' | 'onBlur'> {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: { formattedAddress: string; lat: number; lng: number }) => void;
  onValidationError?: (hasError: boolean) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

export default function PlaceAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onValidationError,
  onBlur,
  label,
  error,
  helperText,
  fullWidth,
  disabled,
  required,
  placeholder,
  size,
  sx,
}: PlaceAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const isSelectedFromDropdownRef = useRef(false);
  const valueRef = useRef(value);
  const callbacksRef = useRef({ onChange, onPlaceSelect, onValidationError, onBlur });
  const places = useMapsLibrary('places');

  // Keep callback/value refs current so event handlers always see latest values
  valueRef.current = value;
  callbacksRef.current = { onChange, onPlaceSelect, onValidationError, onBlur };

  useEffect(() => {
    if (!places || !containerRef.current) return;

    const element = new places.PlaceAutocompleteElement({
      types: ['establishment', 'geocode'],
    });

    if (disabled) element.setAttribute('disabled', '');
    if (placeholder) element.setAttribute('placeholder', placeholder);

    elementRef.current = element;
    containerRef.current.appendChild(element);

    const handlePlaceSelect = async (event: Event) => {
      const { place } = event as google.maps.places.PlaceAutocompletePlaceSelectEvent;
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });

      if (!place.formattedAddress || !place.location) return;

      const formattedAddress = place.formattedAddress;
      const lat = place.location.lat();
      const lng = place.location.lng();

      isSelectedFromDropdownRef.current = true;
      callbacksRef.current.onChange(formattedAddress);
      callbacksRef.current.onPlaceSelect?.({ formattedAddress, lat, lng });
      callbacksRef.current.onValidationError?.(false);
    };

    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      isSelectedFromDropdownRef.current = false;
      callbacksRef.current.onChange(target.value);
      if (target.value.trim() === '') {
        callbacksRef.current.onValidationError?.(false);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      const currentValue = valueRef.current;
      if (currentValue && currentValue.trim() !== '' && !isSelectedFromDropdownRef.current) {
        callbacksRef.current.onValidationError?.(true);
      } else if (isSelectedFromDropdownRef.current) {
        callbacksRef.current.onValidationError?.(false);
      }
      callbacksRef.current.onBlur?.(e as unknown as React.FocusEvent<HTMLInputElement>);
    };

    element.addEventListener('gmp-placeselect', handlePlaceSelect);
    element.addEventListener('input', handleInput);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('gmp-placeselect', handlePlaceSelect);
      element.removeEventListener('input', handleInput);
      element.removeEventListener('blur', handleBlur);
      if (containerRef.current?.contains(element)) {
        containerRef.current.removeChild(element);
      }
      elementRef.current = null;
    };
  }, [places]);

  // Sync external value changes into the element's shadow DOM input
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const internalInput = element.shadowRoot?.querySelector('input');
    if (internalInput && internalInput.value !== value) {
      internalInput.value = value;
    }
    // Reset selection flag when value is cleared externally
    if (!value || value.trim() === '') {
      isSelectedFromDropdownRef.current = false;
    }
  }, [value]);

  return (
    <FormControl fullWidth={fullWidth} error={error} disabled={disabled} required={required} sx={sx}>
      {label && (
        <InputLabel shrink sx={{ bgcolor: 'background.paper', px: 0.5 }}>
          {label}
        </InputLabel>
      )}
      <Box
        ref={containerRef}
        sx={{
          mt: label ? 2 : 0,
          '& gmp-place-autocomplete': {
            width: '100%',
            '--gmp-mat-combobox-height': size === 'small' ? '40px' : '56px',
            '--gmp-mat-font-size': '1rem',
          },
        }}
      />
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
