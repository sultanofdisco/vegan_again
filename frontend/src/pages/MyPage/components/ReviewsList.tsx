import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ReviewsList.module.css';

interface Review {
  id: number;
  restaurantId: number;
  restaurantName: string;
  content: string;
  rating: number;
  images: string[];
  createdAt: string;
  updatedAt: string | null;
}

interface ReviewsListProps {
  reviews: Review[];
  onDelete: (reviewId: number) => void;
  onUpdate: (reviewId: number, updatedContent: string) => void;
}

const ReviewsList = ({ reviews, onDelete, onUpdate }: ReviewsListProps) => {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString || dateString === 'null' || dateString === '') {
      return '';
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }
      if (date.getFullYear() < 1970) {
        return '';
      }
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const getDisplayDate = (review: Review): string => {
    if (review.updatedAt && review.updatedAt !== 'null' && review.updatedAt !== '') {
      const updatedDate = formatDate(review.updatedAt);
      if (updatedDate) {
        return updatedDate;
      }
    }
    return formatDate(review.createdAt);
  };

  const handleEdit = (review: Review) => {
    setEditingId(review.id);
    setEditContent(review.content);
  };

  const handleSaveEdit = (reviewId: number) => {
    if (editContent.trim().length === 0) {
      alert('리뷰 내용을 입력해주세요.');
      return;
    }
    if (editContent.length > 2000) {
      alert('리뷰는 최대 2000자까지 입력 가능합니다.');
      return;
    }
    onUpdate(reviewId, editContent);
    setEditingId(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleRestaurantClick = (restaurantId: number) => {
    navigate(`/?restaurant=${restaurantId}`);
  };

  if (reviews.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>💬</span>
        <p className={styles.emptyText}>아직 작성한 리뷰가 없습니다.</p>
        <p className={styles.emptySubtext}>
          방문한 식당에 리뷰를 남겨보세요!
        </p>
        <button
          onClick={() => navigate('/')}
          className={styles.goToMainButton}
        >
          식당 찾아보기
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>내가 작성한 리뷰 ({reviews.length})</h2>
      </div>

      <div className={styles.list}>
        {reviews.map((review) => (
          <div key={review.id} className={styles.card}>
            <div
              className={styles.restaurantInfo}
              onClick={() => handleRestaurantClick(review.restaurantId)}
            >
              <div className={styles.restaurantHeader}>
                <h3 className={styles.restaurantName}>{review.restaurantName}</h3>
              </div>
            </div>

            <div className={styles.reviewContent}>
              {review.rating && (
                <div className={styles.rating}>
                  {'⭐'.repeat(review.rating)}
                </div>
              )}

              {editingId === review.id ? (
                <div className={styles.editForm}>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className={styles.textarea}
                    maxLength={2000}
                    rows={4}
                    placeholder="리뷰 내용을 입력하세요..."
                  />
                  <div className={styles.charCount}>{editContent.length}/2000</div>
                  <div className={styles.editButtons}>
                    <button
                      onClick={() => handleSaveEdit(review.id)}
                      className={styles.saveButton}
                    >
                      저장
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className={styles.cancelButton}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <p className={styles.content}>{review.content}</p>
              )}

              {review.images && review.images.length > 0 && (
                <div className={styles.imageWrapper}>
                  {review.images.map((imageUrl, index) => (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`리뷰 이미지 ${index + 1}`}
                      className={styles.reviewImage}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className={styles.footer}>
              <span className={styles.date}>
                {getDisplayDate(review)}
              </span>
              {editingId !== review.id && (
                <div className={styles.actions}>
                  <button
                    onClick={() => handleEdit(review)}
                    className={styles.editButton}
                  >
                    수정
                  </button>
                  <button
                    onClick={() => onDelete(review.id)}
                    className={styles.deleteButton}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsList;
