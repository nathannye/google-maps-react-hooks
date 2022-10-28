import React, {useState, useEffect, PropsWithChildren} from 'react';

// https://developers.google.com/maps/documentation/javascript/url-params
export interface GoogleMapsAPIUrlParameters {
  googleMapsAPIKey: string;
  libraries?: string[];
  language?: string;
  region?: string;
  version?: string;
  authReferrerPolicy?: string;
}

export interface GoogleMapsConfiguration {
  mapContainer?: HTMLElement | null;
  mapOptions?: google.maps.MapOptions;
}

export interface GoogleMapsProviderProps
  extends GoogleMapsAPIUrlParameters,
    GoogleMapsConfiguration {
  onLoadScript?: () => void;
  onLoadMap?: (map: google.maps.Map) => void;
}

export interface GoogleMapsContextType {
  googleMapsAPIIsLoaded: boolean;
  map?: google.maps.Map;
}

/**
 * The Google Maps context
 */
export const GoogleMapsContext = React.createContext<GoogleMapsContextType>({
  googleMapsAPIIsLoaded: false
});

/**
 * The global Google Maps provider
 */
export const GoogleMapsProvider: React.FunctionComponent<
  PropsWithChildren<GoogleMapsProviderProps>
> = props => {
  const {
    children,
    googleMapsAPIKey,
    mapContainer,
    mapOptions,
    libraries,
    language,
    region,
    version,
    authReferrerPolicy,
    onLoadScript,
    onLoadMap
  } = props;

  const [isLoadingAPI, setIsLoadingAPI] = useState<boolean>(true);
  const [map, setMap] = useState<google.maps.Map>();

  // Load Google Maps API
  // eslint-disable-next-line complexity
  useEffect(() => {
    if (typeof google === 'object' && typeof google.maps === 'object') {
      setIsLoadingAPI(false);
      return () => {};
    }

    const scriptTag = document.createElement('script');
    const defaultLanguage = navigator.language.slice(0, 2);
    const defaultRegion = navigator.language.slice(3, 5);

    /* eslint-disable camelcase */
    const params = new URLSearchParams({
      key: googleMapsAPIKey,
      language: language || defaultLanguage,
      region: region || defaultRegion,
      ...(libraries?.length && {libraries: libraries.join(',')}),
      ...(version && {version}),
      ...(authReferrerPolicy && {auth_referrer_policy: authReferrerPolicy})
    });
    /* eslint-enable camelcase */

    scriptTag.type = 'text/javascript';
    scriptTag.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    scriptTag.onload = (): void => {
      setIsLoadingAPI(false);
      onLoadScript && onLoadScript();
    };
    document.getElementsByTagName('head')[0].appendChild(scriptTag);

    // Clean up Google Maps API
    return () => {
      // Remove all loaded Google Maps API scripts
      document
        .querySelectorAll('script[src^="https://maps.googleapis.com"]')
        .forEach(script => {
          script.remove();
        });

      // Remove google.maps global
      if (typeof google === 'object' && typeof google.maps === 'object') {
        // @ts-ignore: The operand of a 'delete' operator must be optional.
        delete google.maps;
      }
    };
  }, [
    googleMapsAPIKey,
    JSON.stringify(libraries),
    language,
    region,
    version,
    authReferrerPolicy
  ]);

  // Handle Google Maps map instance
  useEffect(() => {
    let newMap: google.maps.Map | undefined;

    if (!isLoadingAPI && mapContainer) {
      newMap = new google.maps.Map(mapContainer, mapOptions);

      google.maps.event.addListenerOnce(newMap, 'idle', () => {
        if (onLoadMap && newMap) {
          onLoadMap(newMap);
        }
      });

      setMap(newMap);
    }

    // Remove all map related event listeners
    return () => {
      if (
        newMap &&
        typeof google === 'object' &&
        typeof google.maps === 'object'
      ) {
        google.maps.event.clearInstanceListeners(newMap);
      }
    };
  }, [
    isLoadingAPI,
    mapContainer,
    googleMapsAPIKey,
    JSON.stringify(libraries),
    language,
    region,
    version,
    authReferrerPolicy
  ]);

  return (
    <GoogleMapsContext.Provider
      value={{map, googleMapsAPIIsLoaded: !isLoadingAPI}}>
      {children}
    </GoogleMapsContext.Provider>
  );
};