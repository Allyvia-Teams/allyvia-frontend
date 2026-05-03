import { useEffect, useRef } from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export interface PlaceSelection {
  formattedAddress: string;
  lat: number;
  lng: number;
  // Parsed from Google Places address_components. Any of these may be empty
  // strings when Google didn't return that part (e.g. rural address with no
  // street_number, non-US address without a postal code, etc).
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface PlaceAutocompleteProps extends Omit<TextFieldProps, 'onChange' | 'value' | 'onBlur'> {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: PlaceSelection) => void;
  onValidationError?: (hasError: boolean) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

const componentByType = (
  components: google.maps.GeocoderAddressComponent[] | undefined,
  type: string,
  useShortName = false
): string => {
  if (!components) return '';
  const found = components.find((c) => c.types.includes(type));
  if (!found) return '';
  return (useShortName ? found.short_name : found.long_name) || '';
};

const buildAddressLine1 = (components: google.maps.GeocoderAddressComponent[] | undefined): string => {
  const number = componentByType(components, 'street_number');
  const route = componentByType(components, 'route');
  return [number, route].filter(Boolean).join(' ');
};

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

  // Stash the latest callbacks in refs so the place_changed listener (set up
  // exactly once on mount) can reach the freshest closures without forcing
  // the listener to be torn down and recreated on every render. The earlier
  // version put these callbacks in the useEffect deps, which destroyed the
  // listener on every keystroke; clicking a Google suggestion would blur the
  // input -> form re-render -> listener gone -> place_changed never fires.
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const onValidationErrorRef = useRef(onValidationError);
  onChangeRef.current = onChange;
  onPlaceSelectRef.current = onPlaceSelect;
  onValidationErrorRef.current = onValidationError;

  useEffect(() => {
    if (!places || !inputRef.current || !window.google?.maps?.places) return;
    if (autocompleteRef.current) return;
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
    });
    autocomplete.setFields(['formatted_address', 'geometry', 'address_components']);
    autocompleteRef.current = autocomplete;

    const placeChangedListener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const formattedAddress = place.formatted_address;
      const location = place.geometry?.location;
      if (!formattedAddress || !location) return;

      const components = place.address_components;
      const selection: PlaceSelection = {
        formattedAddress,
        lat: location.lat(),
        lng: location.lng(),
        address_line1: buildAddressLine1(components),
        // Some addresses (parts of NYC, certain rural areas) don't return
        // `locality` — fall back to sublocality_level_1 then postal_town.
        city:
          componentByType(components, 'locality') ||
          componentByType(components, 'sublocality_level_1') ||
          componentByType(components, 'postal_town'),
        // State / region. Use short_name so we get "CA" not "California".
        state: componentByType(components, 'administrative_area_level_1', true),
        postal_code: componentByType(components, 'postal_code'),
        // ISO short code, e.g. "US"
        country: componentByType(components, 'country', true)
      };

      isSelectedFromDropdownRef.current = true;
      onChangeRef.current(formattedAddress);
      onPlaceSelectRef.current?.(selection);
      onValidationErrorRef.current?.(false);
    });

    return () => {
      if (placeChangedListener) {
        window.google.maps.event.removeListener(placeChangedListener);
      }
      autocompleteRef.current = null;
    };
    // Depend ONLY on `places` (stable). The callback refs above keep the
    // listener pointing at the latest functions without re-running this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

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
        // Defer the dropdown-selection check so Google's `place_changed`
        // event has a chance to fire first. Clicking a suggestion blurs
        // the input synchronously (~0ms) but `place_changed` arrives a
        // moment later (~50-150ms). Without this delay the validator runs
        // before the ref is set and incorrectly shows "Please select a
        // location from the dropdown".
        const localOnBlur = onBlur;
        window.setTimeout(() => {
          const currentValue = valueRef.current;
          if (currentValue && currentValue.trim() !== '' && !isSelectedFromDropdownRef.current) {
            onValidationError?.(true);
          } else if (isSelectedFromDropdownRef.current) {
            onValidationError?.(false);
          }
        }, 200);
        // The native blur callback still fires immediately so anything
        // hooked to onBlur (Formik's handleBlur, etc.) sees no delay.
        localOnBlur?.(e);
      }}
    />
  );
}
