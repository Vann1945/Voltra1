/**
 * Design system: Kebun Terukur — input rating yang tenang, presisi, dan mobile-first.
 */
import { Star } from "lucide-react";

type RatingInputProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function RatingInput({ value, onChange, error }: RatingInputProps) {
  return (
    <div className="rating-input-wrap">
      <label className="rating-label" htmlFor="rating-score">
        Skor Anda
      </label>
      <div className={`rating-input-shell ${error ? "has-error" : ""}`}>
        <Star aria-hidden="true" size={19} strokeWidth={2.1} />
        <input
          id="rating-score"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby="rating-help rating-error"
          placeholder="4,8"
        />
        <span>/ 5,00</span>
      </div>
      <p id="rating-help" className="rating-help">
        Gunakan koma untuk desimal, misalnya <strong>4,8</strong>. Titik juga diterima.
      </p>
      {error ? (
        <p id="rating-error" className="rating-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
