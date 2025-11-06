import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import styles from './ProfileSection.module.css';

interface UserProfile {
  user_id: number;
  email: string;
  nickname: string;
  bio: string | null;
  profile_image_url: string | null;
}

interface ProfileSectionProps {
  profile: UserProfile;
  onUpdate: (updatedProfile: Partial<UserProfile>) => Promise<void>;
}

const ProfileSection = ({ profile, onUpdate }: ProfileSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(profile.nickname);
  const [bio, setBio] = useState(profile.bio || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 프로필이 변경될 때마다 상태 업데이트
  useEffect(() => {
    setNickname(profile.nickname);
    setBio(profile.bio || '');
  }, [profile]);

  const validateNickname = (value: string): boolean => {
    // 2-20자, 한글/영문/숫자만 허용
    const regex = /^[가-힣a-zA-Z0-9]{2,20}$/;
    return regex.test(value);
  };

  const validateBio = (value: string): boolean => {
    // 최대 200자
    return value.length <= 200;
  };

  const handleImageClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 검증
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      alert('JPG, PNG, WEBP 이미지만 업로드 가능합니다.');
      return;
    }

    if (file.size > maxSize) {
      alert('이미지 크기는 5MB 이하여야 합니다.');
      return;
    }

    setUploading(true);
    try {
      // 기존 이미지가 있으면 삭제
      if (profile.profile_image_url) {
        const oldPath = profile.profile_image_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('profile-images')
            .remove([`${profile.user_id}/${oldPath}`]);
        }
      }

      // 새 이미지 업로드
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${profile.user_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      await onUpdate({ profile_image_url: urlData.publicUrl });
      alert('프로필 이미지가 변경되었습니다.');
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      alert('이미지 업로드에 실패했습니다.');
      setUploading(false);
    }
  };

  const handleSave = async () => {
    // 유효성 검사
    if (!validateNickname(nickname)) {
      alert('닉네임은 2-20자의 한글, 영문, 숫자만 사용 가능합니다.');
      return;
    }

    if (!validateBio(bio)) {
      alert('자기소개는 최대 200자까지 입력 가능합니다.');
      return;
    }

    await onUpdate({ nickname, bio: bio || null });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setNickname(profile.nickname);
    setBio(profile.bio || '');
    setIsEditing(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.profileHeader}>
        <div className={styles.imageWrapper} onClick={handleImageClick}>
          {profile.profile_image_url ? (
            <img 
              src={profile.profile_image_url} 
              alt="프로필" 
              className={styles.profileImage}
            />
          ) : (
            <div className={styles.defaultImage}>
              <span className={styles.defaultIcon}>👤</span>
            </div>
          )}
          {isEditing && (
            <div className={styles.imageOverlay}>
              {uploading ? '업로드 중...' : '이미지 변경'}
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
      </div>

      <div className={styles.infoSection}>
        <div className={styles.infoItem}>
          <label className={styles.label}>이메일</label>
          <div className={styles.value}>{profile.email}</div>
        </div>

        <div className={styles.infoItem}>
          <label className={styles.label}>닉네임</label>
          {isEditing ? (
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={styles.input}
              placeholder="닉네임을 입력하세요"
              maxLength={20}
            />
          ) : (
            <div className={styles.value}>{profile.nickname}</div>
          )}
        </div>

        <div className={styles.infoItem}>
          <label className={styles.label}>자기소개</label>
          {isEditing ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={styles.textarea}
              placeholder="자기소개를 입력하세요"
              maxLength={200}
              rows={4}
            />
          ) : (
            <div className={styles.value}>
              {profile.bio || '자기소개가 없습니다.'}
            </div>
          )}
          {isEditing && (
            <div className={styles.charCount}>{bio.length}/200</div>
          )}
        </div>

        <div className={styles.buttonGroup}>
          {isEditing ? (
            <>
              <button 
                onClick={handleSave} 
                className={styles.saveButton}
                disabled={uploading}
              >
                저장
              </button>
              <button 
                onClick={handleCancel} 
                className={styles.cancelButton}
                disabled={uploading}
              >
                취소
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)} 
              className={styles.editButton}
            >
              프로필 수정
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSection;