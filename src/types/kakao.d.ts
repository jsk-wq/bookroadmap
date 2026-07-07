export interface KakaoLatLngBounds {
  extend: (latlng: KakaoLatLng) => void;
}

export interface KakaoMaps {
  maps: {
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    LatLngBounds: new () => KakaoLatLngBounds;
    Map: new (container: HTMLElement, options: KakaoMapOptions) => KakaoMap;
    Marker: new (options: KakaoMarkerOptions) => KakaoMarker;
    InfoWindow: new (options: { content: string; removable?: boolean }) => KakaoInfoWindow;
    load: (callback: () => void) => void;
    event: {
      addListener: (
        target: KakaoMarker | KakaoMap,
        type: string,
        handler: () => void,
      ) => void;
    };
  };
}

export interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}

export interface KakaoMapOptions {
  center: KakaoLatLng;
  level: number;
}

export interface KakaoMap {
  setCenter: (latlng: KakaoLatLng) => void;
  setBounds: (bounds: KakaoLatLngBounds) => void;
  setLevel: (level: number) => void;
}

export interface KakaoMarkerOptions {
  map?: KakaoMap;
  position: KakaoLatLng;
  title?: string;
}

export interface KakaoMarker {
  setMap: (map: KakaoMap | null) => void;
  getPosition: () => KakaoLatLng;
}

export interface KakaoInfoWindow {
  open: (map: KakaoMap, marker: KakaoMarker) => void;
  close: () => void;
}

declare global {
  interface Window {
    kakao?: KakaoMaps;
  }
}

export {};
