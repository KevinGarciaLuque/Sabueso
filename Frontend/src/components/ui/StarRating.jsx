import { useState } from 'react';
import { Star } from 'lucide-react';

export function StarRating({ value, onChange, size = 'md', readOnly = false }) {
  const [hover, setHover] = useState(0);
  const sz = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => {
        const filled = n <= (readOnly ? value : (hover || value));
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange?.(n)}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(0)}
            className={`transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
          >
            <Star
              className={`${sz} ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            />
          </button>
        );
      })}
    </div>
  );
}
