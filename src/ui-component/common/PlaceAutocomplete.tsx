import { useEffect, useRef, useState } from 'react';
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
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isSelectedFromDropdown, setIsSelectedFromDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isUpdatingFromAutocomplete = useRef(false);
  const places = useMapsLibrary('places');

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options: google.maps.places.AutocompleteOptions = {
      fields: ['geometry', 'name', 'formatted_address'],
      types: ['establishment', 'geocode']
    };

    const autocompleteInstance = new places.Autocomplete(inputRef.current, options);
    setAutocomplete(autocompleteInstance);

    return () => {
      if (typeof google !== 'undefined' && google.maps?.event) {
        google.maps.event.clearInstanceListeners(autocompleteInstance);
      }
    };
  }, [places]);

  useEffect(() => {
    if (!autocomplete) return;

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      if (place.geometry?.location && place.formatted_address) {
        const lat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat;
        const lng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng;

        const formattedAddress = place.formatted_address;

        // Mark that we're updating from autocomplete
        isUpdatingFromAutocomplete.current = true;

        // Mark as selected from dropdown
        setIsSelectedFromDropdown(true);
        onChange(formattedAddress);

        if (onPlaceSelect) {
          onPlaceSelect({
            formattedAddress,
            lat,
            lng
          });
        }

        // Clear validation error
        if (onValidationError) {
          onValidationError(false);
        }

        // Reset the flag after a delay to allow onChange and any input updates to process
        setTimeout(() => {
          isUpdatingFromAutocomplete.current = false;
        }, 100);
      }
    });

    return () => {
      if (listener && typeof google !== 'undefined' && google.maps?.event) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [autocomplete, onChange, onPlaceSelect, onValidationError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // If user is typing manually (not from autocomplete), mark as not selected
    if (newValue !== value && !isUpdatingFromAutocomplete.current) {
      setIsSelectedFromDropdown(false);
    }

    onChange(newValue);

    // Clear validation error when user starts typing or clears the field
    if (onValidationError && newValue.trim() === '') {
      onValidationError(false);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Check if user typed manually without selecting from dropdown
    if (value && value.trim() !== '' && !isSelectedFromDropdown) {
      if (onValidationError) {
        onValidationError(true);
      }
    } else if (isSelectedFromDropdown && onValidationError) {
      onValidationError(false);
    }

    if (onBlur) {
      onBlur(e);
    }
  };

  // Reset selection flag when value is cleared
  useEffect(() => {
    if (!value || value.trim() === '') {
      setIsSelectedFromDropdown(false);
    }
  }, [value]);

  return <TextField {...textFieldProps} inputRef={inputRef} value={value} onChange={handleChange} onBlur={handleBlur} />;
}
