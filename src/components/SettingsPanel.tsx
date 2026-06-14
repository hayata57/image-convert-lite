import type { ConversionSettings, OutputFormat } from '../types';
import { isWebPSupported } from '../utils/imageConverter';

interface SettingsPanelProps {
  settings: ConversionSettings;
  onChange: (settings: ConversionSettings) => void;
  disabled?: boolean;
}

const OUTPUT_FORMATS: { value: OutputFormat; label: string; disabled?: boolean }[] = [
  { value: 'jpeg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP', disabled: !isWebPSupported() },
];

export function SettingsPanel({
  settings,
  onChange,
  disabled = false,
}: SettingsPanelProps) {
  const isQualityEnabled = settings.outputFormat === 'jpeg' || settings.outputFormat === 'webp';

  const updateSettings = (partial: Partial<ConversionSettings>) => {
    onChange({ ...settings, ...partial });
  };

  return (
    <section className="settings-panel" aria-label="変換設定">
      <h2 className="section-title">変換設定</h2>

      <div className="settings-grid">
        <div className="field">
          <label htmlFor="output-format" className="field__label">
            出力形式
          </label>
          <select
            id="output-format"
            className="field__control"
            value={settings.outputFormat}
            disabled={disabled}
            onChange={(event) => {
              updateSettings({ outputFormat: event.target.value as OutputFormat });
            }}
          >
            {OUTPUT_FORMATS.map((format) => (
              <option key={format.value} value={format.value} disabled={format.disabled}>
                {format.label}
                {format.disabled ? '（非対応）' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="quality" className="field__label">
            画質（1〜100）
          </label>
          <input
            id="quality"
            type="number"
            className="field__control"
            min={1}
            max={100}
            value={settings.quality}
            disabled={disabled || !isQualityEnabled}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isNaN(value)) {
                updateSettings({ quality: Math.min(100, Math.max(1, value)) });
              }
            }}
          />
          {!isQualityEnabled && (
            <p className="field__hint">PNG 出力時は画質設定は使用されません。</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="target-width" className="field__label">
            横幅リサイズ（px）
          </label>
          <input
            id="target-width"
            type="number"
            className="field__control"
            min={1}
            placeholder="空欄で元サイズのまま"
            value={settings.targetWidth ?? ''}
            disabled={disabled}
            onChange={(event) => {
              const rawValue = event.target.value.trim();
              if (rawValue === '') {
                updateSettings({ targetWidth: null });
                return;
              }

              const value = Number(rawValue);
              if (!Number.isNaN(value) && value > 0) {
                updateSettings({ targetWidth: Math.round(value) });
              }
            }}
          />
          <p className="field__hint">指定した場合、縦横比を維持してリサイズします。</p>
        </div>

        <div className="field field--checkbox">
          <label className="field__checkbox-label">
            <input
              type="checkbox"
              className="field__checkbox"
              checked={settings.zipAsciiFileNames ?? false}
              disabled={disabled}
              onChange={(event) => {
                updateSettings({ zipAsciiFileNames: event.target.checked });
              }}
            />
            ZIP内のファイル名を英数字にする（文字化け対策）
          </label>
          <p className="field__hint">
            有効にすると ZIP 内は image_001.jpg 形式になります。画面上の表示名は変わりません。
          </p>
        </div>
      </div>
    </section>
  );
}
