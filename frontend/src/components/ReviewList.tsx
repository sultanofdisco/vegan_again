import { useState, type MouseEvent } from 'react'; 
import { useNavigate } from 'react-router-dom';
import type { Review } from '../types/review';
import styles from './ReviewList.module.css';

interface ReviewListProps {
  reviews: Review[];
  isLoggedIn: boolean;
  onSubmitReview: (content: string, image: File | null, rating: number) => Promise<void>;  // ✅ 수정
}

function ReviewList({ reviews, isLoggedIn, onSubmitReview }: ReviewListProps) {
  
  const navigate = useNavigate(); 

  const [visibleCount, setVisibleCount] = useState(3);
  const [reviewContent, setReviewContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);      // ✅ 수정
  const [previewUrl, setPreviewUrl] = useState<string>('');                   // ✅ 수정
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 3);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedImage(null);
    setPreviewUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reviewContent.trim()) {
      alert('리뷰 내용을 입력해주세요.');
      return;
    }

    if (reviewContent.length > 500) {
      alert('리뷰는 500자 이하로 작성해주세요.');
      return;
    }

    if (rating === 0) {
      alert('별점을 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitReview(reviewContent, selectedImage, rating);  // ✅ 수정
      
      // 초기화
      setReviewContent('');
      setSelectedImage(null);                                       // ✅ 수정
      if (previewUrl) {                                            // ✅ 수정
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl('');                                           // ✅ 수정
      setRating(0);
      
      alert('리뷰가 등록되었습니다!');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      alert('리뷰 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); 

    navigate('/login'); 
  };
  
  const visibleReviews = reviews.slice(0, visibleCount);
  const hasMore = visibleCount < reviews.length;

  return (
    <div className={styles.container}>
      {reviews.length === 0 ? (
        <div className={styles.empty}>
          <p>아직 작성된 리뷰가 없습니다.</p>
          <p className={styles.emptySubtext}>첫 번째 리뷰를 작성해보세요!</p>
        </div>
      ) : (
        <>
          <div className={styles.reviewList}>
            {visibleReviews.map((review) => (
              <div key={review.id} className={styles.reviewItem}>
                <div className={styles.reviewHeader}>
                  <div className={styles.userInfo}>
                    {review.userProfileImage ? (
                      <img
                        src={review.userProfileImage}
                        alt={review.userName}
                        className={styles.userAvatar}
                      />
                    ) : (
                      <div className={styles.userAvatarDefault}>
                        {review.userName[0]}
                      </div>
                    )}
                    <div>
                      <div className={styles.userName}>{review.userName}</div>
                      <div className={styles.reviewDate}>
                        {formatDate(review.createdAt)}
                      </div>
                    </div>
                  </div>
                  {review.rating && (
                    <div className={styles.rating}>
                      {'⭐'.repeat(review.rating)}
                    </div>
                  )}
                </div>

                {review.images && review.images.length > 0 && (
                  <div className={styles.images}>
                    <img
                      src={review.images[0]}
                      alt="리뷰 이미지"
                      className={styles.image}
                    />
                  </div>
                )}

                <p className={styles.content}>{review.content}</p>
              </div>
            ))}
          </div>

          {hasMore && (
            <button 
              className={styles.loadMoreButton}
              onClick={handleLoadMore}
            >
              더보기 ({reviews.length - visibleCount}개 더 있음)
            </button>
          )}
        </>
      )}

      {isLoggedIn ? (
        <form className={styles.reviewForm} onSubmit={handleSubmit}>
          <h3 className={styles.formTitle}>리뷰 작성하기</h3>
          
          <div className={styles.ratingSection}>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={styles.starButton}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <span className={
                    star <= (hoverRating || rating) 
                      ? styles.starFilled 
                      : styles.starEmpty
                  }>
                    {star <= (hoverRating || rating) ? '⭐' : '◼️'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.imageUploadSection}>
            <label htmlFor="imageUpload" className={styles.imageUploadLabel}>
              <span>사진 추가</span>
              {selectedImage && <span className={styles.imageCount}>(1/1)</span>}
            </label>
            <input
              id="imageUpload"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className={styles.imageUploadInput}
              disabled={!!selectedImage} 
            />
            
            {previewUrl && (
              <div className={styles.imagePreviews}>
                <div className={styles.imagePreview}>
                  <img src={previewUrl} alt="미리보기" />
                  <button
                    type="button"
                    className={styles.removeImageButton}
                    onClick={handleRemoveImage}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.textInputSection}>
            <textarea
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              placeholder="이 식당에 대한 솔직한 후기를 남겨주세요. (최대 500자)"
              maxLength={500}
              className={styles.textarea}
              rows={4}
            />
            <div className={styles.charCount}>
              {reviewContent.length}/500
            </div>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting || !reviewContent.trim() || rating === 0}
          >
            {isSubmitting ? '등록 중...' : '리뷰 등록'}
          </button>
        </form>
      ) : (
        <div className={styles.loginPrompt}>
          <p>리뷰를 작성하려면 로그인이 필요합니다.</p>
          <button 
            className={styles.loginButton}
            onClick={handleLoginClick}
          >
            로그인하기
          </button>
        </div>
      )}
    </div>
  );
}

export default ReviewList;