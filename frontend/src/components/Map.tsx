import { useEffect, useRef, useState } from 'react';
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
  const [userMarker, setUserMarker] = useState<any>(null);
  const isInitialized = useRef(false); 

  useEffect(() => {
    if (!mapContainerRef.current || isInitialized.current) return;

    window.kakao.maps.load(() => {
      const options = {
        center: new window.kakao.maps.LatLng(
          center?.lat || 37.5665,
          center?.lng || 126.9780
        ),
        level: 3,
      };

      const map = new window.kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;
      isInitialized.current = true; 

    });
  }, []); 

  useEffect(() => {
    if (!mapRef.current || !center || !isInitialized.current) return;

    const moveLatLon = new window.kakao.maps.LatLng(center.lat, center.lng);
    
    mapRef.current.setCenter(moveLatLon);
    mapRef.current.setLevel(3);
    
    if (userMarker) {
      userMarker.setMap(null);
    }

    if (center.lat !== 37.5665 || center.lng !== 126.9780) {
      const imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png';
      const imageSize = new window.kakao.maps.Size(24, 35);
      const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize);

      const marker = new window.kakao.maps.Marker({
        position: moveLatLon,
        map: mapRef.current,
        image: markerImage,
        title: '내 위치',
      });

      setUserMarker(marker);
      console.log('[Map] 사용자 위치 마커 표시');
    }
    
    console.log('[Map] 지도 중심 이동 완료:', center, 'level: 3');
  }, [center]);

  useEffect(() => {
    if (!mapRef.current || restaurants.length === 0 || !isInitialized.current) return;

    console.log(`[Map] ${restaurants.length}개 마커 표시 시작...`);

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

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
        
    console.log(`[Map] ${newMarkers.length}개 마커 표시 완료`);
  }, [restaurants, onMarkerClick]);

  return <div ref={mapContainerRef} className={styles.mapContainer} />;
}

export default Map;