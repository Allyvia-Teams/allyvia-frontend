import { useEffect, useRef } from 'react';
import { TextField, TextFieldProps } from '@mui/material';
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
  ...textFieldProps
}: PlaceAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const isSelectedFromDropdownRef = useRef(false);
  const valueRef = useRef(value);
  const places = useMapsLibrary('places');

  // Keep value ref current so blur validation sees the latest content.
  valueRef.current = value;

  useEffect(() => {
    if (!places || !inputRef.current || !window.google?.maps?.places) return;
    if (autocompleteRef.current) return;
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
    });
    autocomplete.setFields(['formatted_address', 'geometry']);
    autocompleteRef.current = autocomplete;

    const placeChangedListener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const formattedAddress = place.formatted_address;
      const location = place.geometry?.location;
      if (!formattedAddress || !location) return;

      isSelectedFromDropdownRef.current = true;
      onChange(formattedAddress);
      onPlaceSelect?.({ formattedAddress, lat: location.lat(), lng: location.lng() });
      onValidationError?.(false);
    });

    return () => {
      if (placeChangedListener) {
        window.google.maps.event.removeListener(placeChangedListener);
      }
      autocompleteRef.current = null;
    };
  }, [places, onChange, onPlaceSelect, onValidationError]);

  return (
    <TextField
      {...textFieldProps}
      value={value}
      inputRef={inputRef}
      onChange={(e) => {
        const nextValue = e.target.value;
        isSelectedFromDropdownRef.current = false;
        onChange(nextValue);
        if (nextValue.trim() === '') onValidationError?.(false);
      }}
      onBlur={(e) => {
        const currentValue = valueRef.current;
        if (currentValue && currentValue.trim() !== '' && !isSelectedFromDropdownRef.current) {
          onValidationError?.(true);
        } else if (isSelectedFromDropdownRef.current) {
          onValidationError?.(false);
        }
        onBlur?.(e);
      }}
    />
  );
}
