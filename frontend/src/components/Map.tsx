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
  const initialCenterSet = useRef(false); // 최초 center 설정 여부

  // 지도 초기화 (한 번만)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    window.kakao.maps.load(() => {
      const options = {
        center: new window.kakao.maps.LatLng(
          center?.lat || 37.5665,
          center?.lng || 126.9780
        ),
        level: 5,
      };

      const map = new window.kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;
      console.log('🗺️ Map initialized with center:', center);
      
      // 초기화 시 center가 있으면 설정 완료로 표시
      if (center) {
        initialCenterSet.current = true;
      }
    });
  }, []);

  // 지도 초기화 (한 번만)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    window.kakao.maps.load(() => {
      const options = {
        center: new window.kakao.maps.LatLng(
          center?.lat || 37.5665,
          center?.lng || 126.9780
        ),
        level: 2, // 5 → 3으로 변경 (더 확대)
      };

      const map = new window.kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;
      console.log('🗺️ Map initialized with center:', center);
      
      // 초기화 시 center가 있으면 설정 완료로 표시
      if (center) {
        initialCenterSet.current = true;
      }
    });
  }, []);

  // center가 변경되면 최초 1회만 지도 중심 이동
  useEffect(() => {
    console.log('🎯 Map center changed:', center);
    if (!mapRef.current || !center || initialCenterSet.current) return;

    const moveLatLng = new window.kakao.maps.LatLng(center.lat, center.lng);
    mapRef.current.setCenter(moveLatLng);
    mapRef.current.setLevel(2); // 3 → 2로 변경 (더 확대)
    initialCenterSet.current = true; // 최초 1회 이동 완료
    console.log('✅ Map moved to user location:', center);
  }, [center]);

  // 마커 표시 + 마커 영역에 맞게 자동 조정
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

      if (onMarkerClick) {
        window.kakao.maps.event.addListener(marker, 'click', () => {
          onMarkerClick(restaurant);
        });
      }

      return marker;
    });

    markersRef.current = newMarkers;

    // 🎯 마커들이 모두 보이도록 지도 범위 자동 조정
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
    console.log('📍 Map adjusted to show all markers');
  }, [restaurants, onMarkerClick]);

  return <div ref={mapContainerRef} className={styles.mapContainer} />;
}

export default Map;