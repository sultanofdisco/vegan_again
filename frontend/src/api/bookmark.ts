import { supabase } from '../lib/supabase';
/* eslint-disable @typescript-eslint/no-explicit-any */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface BookmarkResponse {
  success: boolean;
  message?: string;
  error?: string;
}

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function addBookmark(restaurantId: number | string): Promise<BookmarkResponse> {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return {
        success: false,
        error: '로그인이 필요합니다.'
      };
    }

    const response = await fetch(`${API_BASE_URL}/bookmarks/${restaurantId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('[Add Bookmark API Error]:', error);
    return {
      success: false,
      error: '찜하기에 실패했습니다.'
    };
  }
}

export async function removeBookmark(restaurantId: number | string): Promise<BookmarkResponse> {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return {
        success: false,
        error: '로그인이 필요합니다.'
      };
    }

    const response = await fetch(`${API_BASE_URL}/bookmarks/${restaurantId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('[Remove Bookmark API Error]:', error);
    return {
      success: false,
      error: '찜 해제에 실패했습니다.'
    };
  }
}

export async function checkBookmarkStatus(restaurantId: number | string): Promise<boolean> {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/bookmarks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.success && data.data) {
      return data.data.some((bookmark: any) => 
        bookmark.restaurant_id === restaurantId || 
        bookmark.restaurant_id === parseInt(String(restaurantId))
      );
    }

    return false;

  } catch (error) {
    console.error('[Check Bookmark Status Error]:', error);
    return false;
  }
}

interface BookmarkData {
  id: number;
  restaurant_id: number;
  created_at: string;
  restaurants: {
    restaurant_id: number;
    restaurant_name: string;
    address: string;
    category: string;
    phone: string | null;
    latitude: number;
    longitude: number;
  };
}

interface GetBookmarksResponse {
  success: boolean;
  count: number;
  data: BookmarkData[];
  error?: string;
}

export async function getBookmarks(): Promise<GetBookmarksResponse> {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return {
        success: false,
        count: 0,
        data: [],
        error: '로그인이 필요합니다.'
      };
    }

    const response = await fetch(`${API_BASE_URL}/bookmarks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('[Get Bookmarks API Error]:', error);
    return {
      success: false,
      count: 0,
      data: [],
      error: '북마크 목록을 불러오는데 실패했습니다.'
    };
  }
}

export async function removeBookmarkById(bookmarkId: number): Promise<BookmarkResponse> {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return {
        success: false,
        error: '로그인이 필요합니다.'
      };
    }

    const bookmarks = await getBookmarks();
    const bookmark = bookmarks.data.find(b => b.id === bookmarkId);
    
    if (!bookmark) {
      return {
        success: false,
        error: '북마크를 찾을 수 없습니다.'
      };
    }

    return await removeBookmark(bookmark.restaurant_id);

  } catch (error) {
    console.error('[Remove Bookmark By ID Error]:', error);
    return {
      success: false,
      error: '찜 해제에 실패했습니다.'
    };
  }
}