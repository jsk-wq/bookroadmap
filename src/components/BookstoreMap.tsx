"use client";

import { useEffect, useRef, useState } from "react";
import type { Bookstore } from "@/types/bookstore";
import type { KakaoInfoWindow, KakaoMap, KakaoMarker } from "@/types/kakao";

interface BookstoreMapProps {
  bookstores: Bookstore[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const DEFAULT_CENTER = { lat: 36.5, lng: 127.8 };
const DEFAULT_LEVEL = 13;

function loadKakaoMapScript(appKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      resolve();
      return;
    }

    const existing = document.getElementById("kakao-map-sdk");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("카카오맵 SDK 로드 실패")));
      return;
    }

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.async = true;
    script.defer = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey,
    )}&autoload=false`;
    script.onload = () => {
      if (window.kakao?.maps) {
        resolve();
        return;
      }

      reject(new Error("카카오맵 SDK가 로드됐지만 window.kakao.maps를 찾을 수 없습니다."));
    };
    script.onerror = () => {
      reject(
        new Error(
          "카카오맵 SDK 로드 실패: JavaScript 키, Web 도메인 등록, 지도 API 사용 설정을 확인하세요.",
        ),
      );
    };
    document.head.appendChild(script);
  });
}

export default function BookstoreMap({
  bookstores,
  selectedId,
  onSelect,
}: BookstoreMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);
  const infoWindowRef = useRef<KakaoInfoWindow | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

    if (!appKey) {
      setMapError("NEXT_PUBLIC_KAKAO_MAP_APP_KEY가 설정되지 않았습니다.");
      return;
    }

    let cancelled = false;

    loadKakaoMapScript(appKey)
      .then(() => {
        if (cancelled || !mapContainerRef.current || !window.kakao) return;

        window.kakao.maps.load(() => {
          if (cancelled || !mapContainerRef.current) return;

          const center = new window.kakao!.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
          mapRef.current = new window.kakao!.maps.Map(mapContainerRef.current, {
            center,
            level: DEFAULT_LEVEL,
          });
          setMapReady(true);
        });
      })
      .catch((error: Error) => {
        if (!cancelled) setMapError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.kakao) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    infoWindowRef.current?.close();

    const bounds = new window.kakao.maps.LatLngBounds();

    bookstores.forEach((store) => {
      const position = new window.kakao!.maps.LatLng(store.lat, store.lng);
      const marker = new window.kakao!.maps.Marker({
        map: mapRef.current!,
        position,
        title: store.name,
      });

      const content = `
        <div style="padding:10px 12px;min-width:180px;font-size:13px;line-height:1.5;">
          <strong style="display:block;margin-bottom:4px;">${store.name}</strong>
          <span style="color:#555;">${store.address}</span>
          ${store.phone ? `<div style="margin-top:4px;color:#666;">${store.phone}</div>` : ""}
        </div>
      `;

      const infoWindow = new window.kakao!.maps.InfoWindow({
        content,
        removable: true,
      });

      window.kakao!.maps.event.addListener(marker, "click", () => {
        infoWindowRef.current?.close();
        infoWindow.open(mapRef.current!, marker);
        infoWindowRef.current = infoWindow;
        onSelect(store.id);
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (bookstores.length === 1) {
      mapRef.current.setCenter(new window.kakao.maps.LatLng(bookstores[0].lat, bookstores[0].lng));
      mapRef.current.setLevel(5);
    } else if (bookstores.length > 1) {
      mapRef.current.setBounds(bounds);
    }
  }, [bookstores, mapReady, onSelect]);

  useEffect(() => {
    if (!selectedId || !mapRef.current || !window.kakao) return;

    const store = bookstores.find((item) => item.id === selectedId);
    if (!store) return;

    const position = new window.kakao.maps.LatLng(store.lat, store.lng);
    mapRef.current.setCenter(position);
    mapRef.current.setLevel(4);
  }, [selectedId, bookstores]);

  if (mapError) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-ink-50 p-8 text-center">
        <div>
          <p className="text-sm font-medium text-ink-800">지도를 불러올 수 없습니다</p>
          <p className="mt-2 text-sm text-ink-600">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-2xl border border-ink-200 shadow-sm">
      {!mapReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-ink-50">
          <p className="text-sm text-ink-600">지도를 불러오는 중...</p>
        </div>
      )}
      <div ref={mapContainerRef} className="h-full w-full" />
    </div>
  );
}
