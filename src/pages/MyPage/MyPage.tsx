import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../stores/useUserStore';
import { supabase } from '../../lib/supabase';
import ProfileSection from './components/ProfileSection';
import ReviewsList from './components/ReviewsList';
import styles from './MyPage.module.css';
import BookmarksList from './components/BookmarkList';
/* eslint-disable @typescript-eslint/no-explicit-any */

type TabType = 'profile' | 'bookmarks' | 'reviews';

interface UserProfile {
  id: string;
  email: string;
  nickname: string;
  bio: string;
  profile_image_url: string | null;
}

interface Restaurant {
  id: number;
  name: string;
  address: string;
  category: string;
  phone: string | null;
  latitude: number;
  longitude: number;
}

interface Bookmark {
  id: number;
  restaurant: Restaurant;
  created_at: string;
}

interface Review {
  id: number;
  restaurant: Restaurant;
  rating: number;
  content: string;
  image_url: string | null;
  created_at: string;
}

const MyPage = () => {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);
  
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    
    if (!user) {
      console.log('[MyPage] No user found, redirecting to login');
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    
    fetchUserData();
  }, [user, navigate]);

  const fetchUserData = async () => {
    if (!user) {
      console.log('[fetchUserData] No user');
      return;
    }
    
    setLoading(true);
    
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[Profile Error]:', profileError);
        throw profileError;
      }
      
      setProfile(profileData);

      const { data: bookmarksData, error: bookmarksError } = await supabase
        .from('bookmarks')
        .select(`
          id,
          created_at,
          restaurant:restaurants (
            id,
            name,
            address,
            category,
            phone,
            latitude,
            longitude
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (bookmarksError) {
        setBookmarks([]);
      } else {
        setBookmarks((bookmarksData as any) || []);
      }

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          content,
          image_url,
          created_at,
          restaurant:restaurants (
            id,
            name,
            address,
            category,
            phone,
            latitude,
            longitude
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        setReviews([]);
      } else {
        setReviews((reviewsData as any) || []);
      }

    } catch (error) {
      console.error('[fetchUserData] Critical error:', error);
      alert('데이터를 불러오는데 실패했습니다. 콘솔을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updatedProfile: Partial<UserProfile>) => {
    if (!user) return;

    try {
      
      const { error } = await supabase
        .from('users')
        .update(updatedProfile)
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
      alert('프로필이 수정되었습니다.');
    } catch (error) {
      console.error('[handleProfileUpdate] Error:', error);
      alert('프로필 수정에 실패했습니다.');
    }
  };

  const handleRemoveBookmark = async (bookmarkId: number) => {
    if (!confirm('즐겨찾기를 해제하시겠습니까?')) return;

    try {
      
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('[Bookmark Delete Error]:', error);
        throw error;
      }

      setBookmarks(prev => prev.filter(bookmark => bookmark.id !== bookmarkId));
      alert('즐겨찾기가 해제되었습니다.');
    } catch (error) {
      console.error('[handleRemoveBookmark] Error:', error);
      alert('즐겨찾기 해제에 실패했습니다.');
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('리뷰를 삭제하시겠습니까?')) return;

    try {
      
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('[Review Delete Error]:', error);
        throw error;
      }

      setReviews(prev => prev.filter(review => review.id !== reviewId));
      alert('리뷰가 삭제되었습니다.');
    } catch (error) {
      console.error('[handleDeleteReview] Error:', error);
      alert('리뷰 삭제에 실패했습니다.');
    }
  };

  const handleUpdateReview = async (reviewId: number, updatedContent: string) => {
    try {
      
      const { error } = await supabase
        .from('reviews')
        .update({ content: updatedContent })
        .eq('id', reviewId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('[Review Update Error]:', error);
        throw error;
      }

      setReviews(prev => 
        prev.map(review => 
          review.id === reviewId 
            ? { ...review, content: updatedContent }
            : review
        )
      );
      alert('리뷰가 수정되었습니다.');
    } catch (error) {
      console.error('[handleUpdateReview] Error:', error);
      alert('리뷰 수정에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.errorContainer}>
        <p>프로필 정보를 불러올 수 없습니다.</p>
        <button onClick={() => {
          fetchUserData();
        }}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>마이페이지</h1>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'profile' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className={styles.tabIcon}>👤</span>
            프로필
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'bookmarks' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('bookmarks')}
          >
            <span className={styles.tabIcon}>⭐</span>
            즐겨찾기 <span className={styles.badge}>{bookmarks.length}</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'reviews' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            <span className={styles.tabIcon}>💬</span>
            내 리뷰 <span className={styles.badge}>{reviews.length}</span>
          </button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'profile' && (
            <ProfileSection
              profile={profile}
              onUpdate={handleProfileUpdate}
            />
          )}
          
          {activeTab === 'bookmarks' && (
            <BookmarksList
              bookmarks={bookmarks}
              onRemove={handleRemoveBookmark}
            />
          )}
          
          {activeTab === 'reviews' && (
            <ReviewsList
              reviews={reviews}
              onDelete={handleDeleteReview}
              onUpdate={handleUpdateReview}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPage;