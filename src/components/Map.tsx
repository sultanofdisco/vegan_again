import { useEffect, useRef } from 'react';
import styles from './Map.module.css';
import type { Restaurant } from '../types/restaurant';
/* eslint-disable @typescript-eslint/no-explicit-any */

interface MapProps {
  restaurants: Restaurant[];
  center?: { lat: number; lng: number };
  onMarkerClick?: (restaurant: Restaurant) => void;
}

function Map({ restaurants, center, onMarkerClick }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // 지도 초기화
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 카카오맵 SDK 로드 대기
    window.kakao.maps.load(() => {
      const options = {
        center: new window.kakao.maps.LatLng(
          center?.lat || 37.5665, // 기본값
          center?.lng || 126.9780
        ),
        level: 5,
      };

      // 지도 생성
      const map = new window.kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;
    });
  }, [center]);

  // 마커 표시
  useEffect(() => {
    if (!mapRef.current || restaurants.length === 0) return;

    // 기존 마커 제거
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // 새 마커 생성
    const newMarkers = restaurants.map(restaurant => {
      const markerPosition = new window.kakao.maps.LatLng(
        restaurant.location.lat,
        restaurant.location.lng
      );

      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        title: restaurant.name,
      });

      marker.setMap(mapRef.current);

      // 마커 클릭 이벤트
      if (onMarkerClick) {
        window.kakao.maps.event.addListener(marker, 'click', () => {
          onMarkerClick(restaurant);
        });
      }

      return marker;
    });

    markersRef.current = newMarkers;

    if (newMarkers.length > 0) {
      const bounds = new window.kakao.maps.LatLngBounds();
      restaurants.forEach(restaurant => {
        bounds.extend(
          new window.kakao.maps.LatLng(
            restaurant.location.lat,
            restaurant.location.lng
          )
        );
      });
      mapRef.current.setBounds(bounds);
    }
  }, [restaurants, onMarkerClick]);

  return <div ref={mapContainerRef} className={styles.mapContainer} />;
}

export default Map;