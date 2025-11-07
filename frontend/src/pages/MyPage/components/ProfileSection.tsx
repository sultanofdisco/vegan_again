import { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    setNickname(profile.nickname);
    setBio(profile.bio || '');
  }, [profile]);

  const validateNickname = (value: string): boolean => {
    const regex = /^[가-힣a-zA-Z0-9]{2,20}$/;
    return regex.test(value);
  };

  const validateBio = (value: string): boolean => {
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

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

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
      console.log('📤 프로필 이미지 변환 시작:', file.name);

      // base64로 변환
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      console.log('✅ Base64 변환 완료, 백엔드 전송 시작');

      // 백엔드 API로 프로필 이미지 업데이트
      const apiClient = (await import('../../../lib/axios')).default;
      const response = await apiClient.patch('/users/profile', {
        profileImage: base64Image,
      });

      console.log('✅ 백엔드 응답:', response.data);

      if (response.data.success) {
        // 백엔드에서 반환한 이미지 URL로 업데이트
        const imageUrl = response.data.data?.profile_image_url || response.data.profile_image_url;
        await onUpdate({ profile_image_url: imageUrl });
        alert('프로필 이미지가 변경되었습니다.');
      } else {
        throw new Error(response.data.error || '이미지 업로드 실패');
      }
      
    } catch (error: unknown) {
      console.error('💥 이미지 업로드 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`이미지 업로드에 실패했습니다: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
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
        <div 
          className={styles.imageWrapper} 
          onClick={handleImageClick}
          style={{ cursor: isEditing ? 'pointer' : 'default' }}
        >
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
          disabled={uploading}
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
          {isEditing && <div className={styles.charCount}>{bio.length}/200</div>}
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