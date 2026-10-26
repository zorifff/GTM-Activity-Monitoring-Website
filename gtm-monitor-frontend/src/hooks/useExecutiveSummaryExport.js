import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';

// Unduh tabel Executive Summary (#executive-summary-wrapper) sebagai gambar PNG
export function useExecutiveSummaryExport() {
  const [isExportingPng, setIsExportingPng] = useState(false);

  const handleDownloadPNG = useCallback(async () => {
    const tableWrapper = document.getElementById('executive-summary-wrapper');
    if (!tableWrapper || isExportingPng) return;

    try {
      setIsExportingPng(true);

      const canvas = await html2canvas(tableWrapper, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedWrapper = clonedDoc.getElementById('executive-summary-wrapper');
          if (clonedWrapper) {
            const clonedTable = clonedWrapper.querySelector('table');
            const totalScrollWidth = Math.max(clonedTable?.scrollWidth || 0, clonedWrapper.scrollWidth || 0, 1250) + 60;

            clonedWrapper.style.maxHeight = 'none';
            clonedWrapper.style.overflowY = 'visible';
            clonedWrapper.style.overflowX = 'visible';
            clonedWrapper.style.width = `${totalScrollWidth}px`;
            clonedWrapper.style.maxWidth = 'none';

            if (clonedTable) {
              clonedTable.style.width = `${totalScrollWidth}px`;
              clonedTable.style.minWidth = `${totalScrollWidth}px`;
            }

            const stickyEls = clonedWrapper.querySelectorAll('[style*="sticky"]');
            stickyEls.forEach(el => {
              el.style.position = 'static';
            });
          }
        }
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Executive_Summary_GTM_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export PNG:', err);
    } finally {
      setIsExportingPng(false);
    }
  }, [isExportingPng]);

  return { isExportingPng, handleDownloadPNG };
}
