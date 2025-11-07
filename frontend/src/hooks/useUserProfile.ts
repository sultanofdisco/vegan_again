/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/axios';
import type { UserProfile } from '../types/mypage';

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updatedProfile: Partial<UserProfile>) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useUserProfile(userId: string | null): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/users/profile');
      
      if (response.data.success && response.data.data) {
        const profileData = response.data.data;
        setProfile({
          user_id: profileData.userId,
          email: profileData.email,
          nickname: profileData.nickname,
          bio: profileData.bio || null,
          profile_image_url: profileData.profileImage || null,
        });
      } else {
        throw new Error('프로필을 불러올 수 없습니다.');
      }
    } catch (err) {
      setError('프로필을 불러오는데 실패했습니다.');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateProfile = async (updatedProfile: Partial<UserProfile>): Promise<boolean> => {
    if (!userId) return false;

    try {
      const updateData: Record<string, any> = {};
      
      if (updatedProfile.nickname !== undefined) {
        updateData.nickname = updatedProfile.nickname;
      }
      if (updatedProfile.bio !== undefined) {
        updateData.bio = updatedProfile.bio;
      }
      if (updatedProfile.profile_image_url !== undefined) {
        updateData.profileImage = updatedProfile.profile_image_url;
      }

      const response = await apiClient.put('/users/profile', updateData);
      
      if (response.data.success && response.data.data) {
        const profileData = response.data.data;
        setProfile({
          user_id: profileData.userId,
          email: profileData.email,
          nickname: profileData.nickname,
          bio: profileData.bio || null,
          profile_image_url: profileData.profileImage || null,
        });
        return true;
      }
      
      return false;
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
}