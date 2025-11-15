let scriptLoadingPromise: Promise<void> | null = null;

export function loadGoogleMapsScript(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).google?.maps) {
    return Promise.resolve();
  }

  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise<void>((resolve, reject) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) {
      reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps-loader="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google Maps script failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = '1';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps script failed to load'));
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  await loadGoogleMapsScript();
  const gm = (window as any).google?.maps;
  if (!gm?.Geocoder) throw new Error('Google Maps Geocoder unavailable');
  const geocoder = new gm.Geocoder();
  return new Promise<string>((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
      if (status === 'OK' && results && results[0]) {
        resolve(results[0].formatted_address as string);
      } else {
        reject(new Error(`Reverse geocode failed: ${status}`));
      }
    });
  });
}
