import { useRef, useState } from 'react';
import type { SelectedImageFile } from '../utils/folderLoader';
import { FILE_INPUT_ACCEPT } from '../utils/formatHelpers';
import {
  extractImageFilesFromDataTransfer,
  filterImageFilesFromList,
} from '../utils/folderLoader';

interface DropZoneProps {
  onFilesSelected: (result: {
    imageFiles: SelectedImageFile[];
    skippedCount: number;
    sourceLabel: 'file' | 'folder' | 'drop';
  }) => void;
  disabled?: boolean;
}

export function DropZone({ onFilesSelected, disabled = false }: DropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingDrop, setIsProcessingDrop] = useState(false);

  const emitSelection = (
    imageFiles: SelectedImageFile[],
    skippedCount: number,
    sourceLabel: 'file' | 'folder' | 'drop',
  ) => {
    if (imageFiles.length === 0 && skippedCount === 0) {
      return;
    }

    onFilesSelected({ imageFiles, skippedCount, sourceLabel });
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || disabled) {
      return;
    }

    const { imageFiles, skippedCount } = filterImageFilesFromList(fileList);
    emitSelection(imageFiles, skippedCount, 'file');
    event.target.value = '';
  };

  const handleFolderInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || disabled) {
      return;
    }

    const { imageFiles, skippedCount } = filterImageFilesFromList(fileList);
    emitSelection(imageFiles, skippedCount, 'folder');
    event.target.value = '';
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    if (disabled || isProcessingDrop) {
      return;
    }

    setIsProcessingDrop(true);

    try {
      const { imageFiles, skippedCount } = await extractImageFilesFromDataTransfer(
        event.dataTransfer,
      );
      emitSelection(imageFiles, skippedCount, 'drop');
    } finally {
      setIsProcessingDrop(false);
    }
  };

  const handleSelectFilesClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleSelectFolderClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!disabled) {
      folderInputRef.current?.click();
    }
  };

  return (
    <div
      className={`drop-zone ${isDragging ? 'drop-zone--dragging' : ''} ${disabled ? 'drop-zone--disabled' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(event) => {
        void handleDrop(event);
      }}
      aria-label="画像またはフォルダをドロップ"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        multiple
        onChange={handleFileInputChange}
        className="drop-zone__input"
        disabled={disabled}
      />
      <input
        ref={folderInputRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        multiple
        onChange={handleFolderInputChange}
        className="drop-zone__input"
        disabled={disabled}
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
      />

      <div className="drop-zone__icon" aria-hidden="true">
        📁
      </div>
      <p className="drop-zone__title">
        {isProcessingDrop ? 'フォルダを読み込んでいます...' : '画像またはフォルダをドラッグ＆ドロップ'}
      </p>
      <p className="drop-zone__subtitle">サブフォルダ内の画像も読み込めます</p>
      <p className="drop-zone__hint">
        対応形式: JPG / JPEG / JPE / JFIF / PNG / WebP / BMP / AVIF / ICO（1回最大500枚・1ファイル最大25MB）
      </p>

      <div className="drop-zone__actions">
        <button
          type="button"
          className="button button--secondary button--small"
          onClick={handleSelectFilesClick}
          disabled={disabled}
        >
          画像ファイルを選択
        </button>
        <button
          type="button"
          className="button button--secondary button--small"
          onClick={handleSelectFolderClick}
          disabled={disabled}
        >
          フォルダを選択
        </button>
      </div>
    </div>
  );
}
