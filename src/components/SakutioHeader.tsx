import { LayoutGrid, Mail, Sparkles } from 'lucide-react';
import {
  SAKUTIO_ABOUT_URL,
  SAKUTIO_CONTACT_URL,
  SAKUTIO_HOME_URL,
  SAKUTIO_TOOLS_URL,
} from '../constants/sakutioLinks';
import { SakutioBrandMark } from './SakutioBrandMark';

export function SakutioHeader() {
  return (
    <header className="sakutio-header">
      <div className="sakutio-header__inner">
        <a href={SAKUTIO_HOME_URL} className="sakutio-logo">
          <SakutioBrandMark />
        </a>
        <nav className="sakutio-nav" aria-label="Sakutio共通ナビゲーション">
          <a href={SAKUTIO_TOOLS_URL} className="sakutio-nav__link">
            <LayoutGrid size={15} strokeWidth={2} aria-hidden="true" />
            ツール一覧
          </a>
          <a href={SAKUTIO_ABOUT_URL} className="sakutio-nav__link">
            <Sparkles size={15} strokeWidth={2} aria-hidden="true" />
            Sakutioについて
          </a>
          <a href={SAKUTIO_CONTACT_URL} className="sakutio-nav__link">
            <Mail size={15} strokeWidth={2} aria-hidden="true" />
            お問い合わせ
          </a>
        </nav>
      </div>
    </header>
  );
}
