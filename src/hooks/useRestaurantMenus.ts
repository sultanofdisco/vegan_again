import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Menu } from '../types/menu';

export function useRestaurantMenus(restaurantId: number | string) {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMenus = async () => {
      setLoading(true);
      try {
        let queryValue: number | string = restaurantId;
                    
        if (typeof restaurantId === 'string') {
          if (restaurantId.includes('rest-')) {
            queryValue = parseInt(restaurantId.replace('rest-', ''));
          } else {
            queryValue = parseInt(restaurantId);
          }
          
          if (isNaN(queryValue as number)) {
            setMenus([]);
            setLoading(false);
            return;
          }
        }
                    
        const { data, error } = await supabase
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
          .eq('restaurant_id', queryValue);

        if (error) throw error;
        
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
        
      } catch (error) {
        console.error('[Fetch Menus Failed]:', error);
        setMenus([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenus();
  }, [restaurantId]);

  return { menus, loading };
}