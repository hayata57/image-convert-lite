import { Boxes } from 'lucide-react';

export function SakutioBrandMark() {
  return (
    <span className="sakutio-brand-mark">
      <span className="sakutio-brand-mark__icon" aria-hidden="true">
        <Boxes size={18} strokeWidth={2} />
      </span>
      <span className="sakutio-brand-mark__text">Sakutio</span>
    </span>
  );
}
