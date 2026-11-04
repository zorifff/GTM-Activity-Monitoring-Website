import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_THUMB_WIDTH = 64;
const ARROW_STEP = 120;

// Slider geser horizontal untuk wadah tabel yang lebih lebar dari layar.
// Tampil hanya bila isi tabel benar-benar meluap; posisinya selalu mengikuti scrollLeft wadah.
export default function TableScrollSlider({ scrollRef, label = 'Geser tabel ke kanan dan kiri' }) {
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const [metrics, setMetrics] = useState({ overflowing: false, ratio: 0, visibleRatio: 1 });
  const [trackWidth, setTrackWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    const update = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      setMetrics({
        overflowing: maxScroll > 1,
        ratio: maxScroll > 1 ? el.scrollLeft / maxScroll : 0,
        visibleRatio: el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1
      });
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);

    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [scrollRef]);

  // Trek baru ada di DOM setelah tabel terdeteksi meluap
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const observer = new ResizeObserver(() => setTrackWidth(track.clientWidth));
    observer.observe(track);
    setTrackWidth(track.clientWidth);
    return () => observer.disconnect();
  }, [metrics.overflowing]);

  const thumbWidth = Math.min(trackWidth, Math.max(MIN_THUMB_WIDTH, trackWidth * metrics.visibleRatio));
  const thumbRange = Math.max(0, trackWidth - thumbWidth);

  const scrollToThumbLeft = useCallback((thumbLeft) => {
    const el = scrollRef.current;
    if (!el || thumbRange <= 0) return;
    const clamped = Math.min(thumbRange, Math.max(0, thumbLeft));
    el.scrollLeft = (clamped / thumbRange) * (el.scrollWidth - el.clientWidth);
  }, [scrollRef, thumbRange]);

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const track = trackRef.current;
    const trackLeft = track.getBoundingClientRect().left;
    const thumbLeft = metrics.ratio * thumbRange;
    const pointerX = e.clientX - trackLeft;
    const isOnThumb = pointerX >= thumbLeft && pointerX <= thumbLeft + thumbWidth;
    // Klik di luar tombol: tombol langsung berpusat di titik klik, lalu tetap bisa diseret
    const grabOffset = isOnThumb ? pointerX - thumbLeft : thumbWidth / 2;

    dragRef.current = { grabOffset, trackLeft };
    track.setPointerCapture(e.pointerId);
    setIsDragging(true);
    if (!isOnThumb) scrollToThumbLeft(pointerX - grabOffset);
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current) return;
    const { grabOffset, trackLeft } = dragRef.current;
    scrollToThumbLeft(e.clientX - trackLeft - grabOffset);
  };

  const endDrag = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  const handleKeyDown = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    const targets = {
      ArrowLeft: el.scrollLeft - ARROW_STEP,
      ArrowRight: el.scrollLeft + ARROW_STEP,
      PageUp: el.scrollLeft - el.clientWidth,
      PageDown: el.scrollLeft + el.clientWidth,
      Home: 0,
      End: el.scrollWidth
    };
    if (targets[e.key] === undefined) return;
    e.preventDefault();
    el.scrollLeft = targets[e.key];
  };

  if (!metrics.overflowing) return null;

  return (
    <div className="table-scroll-slider">
      <div
        ref={trackRef}
        className={`table-scroll-track ${isDragging ? 'dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="table-scroll-rail" aria-hidden="true" />
        <div
          className="table-scroll-thumb"
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(metrics.ratio * 100)}
          onKeyDown={handleKeyDown}
          style={{ width: `${thumbWidth}px`, transform: `translateX(${metrics.ratio * thumbRange}px)` }}
        />
      </div>
    </div>
  );
}
