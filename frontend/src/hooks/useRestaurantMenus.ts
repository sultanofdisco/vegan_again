import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Menu } from '../types/menu';
import { parseRestaurantId } from '../utils/restaurantHelpers';

interface UseRestaurantMenusReturn {
  menus: Menu[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRestaurantMenus(restaurantId: number | string): UseRestaurantMenusReturn {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenus = async () => {
    setLoading(true);
    setError(null);

    try {
      const parsedId = parseRestaurantId(restaurantId);
      
      if (parsedId === null) {
        setMenus([]);
        return;
      }

      const { data, error: supabaseError } = await supabase
        .from('menus')
        .select(`
          menu_id,
          restaurant_id,
          menu_name,
          price,
          description,
          vegetarian_level,
          confidence_score,
          ingredients,
          analyzed_at,
          created_at,
          updated_at
        `)
        .eq('restaurant_id', parsedId);

      if (supabaseError) throw supabaseError;
      
      const formattedMenus: Menu[] = (data || []).map(menu => ({
        id: menu.menu_id,
        name: menu.menu_name,
        price: menu.price,
        description: menu.description,
        vegetarianLevel: menu.vegetarian_level,
        confidenceScore: menu.confidence_score,
        analyzedAt: menu.analyzed_at,
      }));
      
      setMenus(formattedMenus);
    } catch (err) {
      console.error('[useRestaurantMenus] Fetch Failed:', err);
      setError('메뉴를 불러오는데 실패했습니다.');
      setMenus([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  return {
    menus,
    loading,
    error,
    refetch: fetchMenus,
  };
}