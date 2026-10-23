import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxStars = 5,
  size = 'sm',
  showCount = false,
  count,
  interactive = false,
  onRatingChange,
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  return (
    <div className="inline-flex items-center gap-1">
      <div className="flex items-center">
        {Array.from({ length: maxStars }).map((_, i) => {
          const starValue = i + 1;
          const isFilled = rating >= starValue;
          const isHalf = !isFilled && rating >= starValue - 0.5;

          const starIcon = (
            <Star
              className={`${sizeClasses} ${
                isFilled
                  ? 'text-amber-400 fill-amber-400'
                  : isHalf
                  ? 'text-amber-400 fill-amber-400/50'
                  : 'text-slate-300 fill-slate-100'
              }`}
            />
          );

          if (interactive) {
            return (
              <button
                type="button"
                key={i}
                onClick={() => onRatingChange && onRatingChange(starValue)}
                className="cursor-pointer hover:scale-110 transition-transform p-0.5"
                aria-label={`${starValue} stars`}
              >
                {starIcon}
              </button>
            );
          }

          return (
            <span key={i} className="inline-flex items-center" aria-hidden="true">
              {starIcon}
            </span>
          );
        })}
      </div>
      {showCount && (
        <span className="text-xs font-semibold text-slate-700 ml-0.5">
          {count === 0 ? (
            <span className="text-slate-400 font-normal">No reviews</span>
          ) : (
            <>
              {rating.toFixed(1)}
              {count !== undefined && <span className="text-slate-400 font-normal"> ({count})</span>}
            </>
          )}
        </span>
      )}
    </div>
  );
};
