import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

/** Keep previews inside the viewport and below the masthead using their real size. */
export function useMapPreviewPosition(
  position: { x: number; y: number } | null,
  width: number,
) {
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{
    anchor: typeof position;
    left: number;
    top: number;
  } | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!position || !element) return;
    const place = () => {
      const { width: actualWidth, height } =
        element.getBoundingClientRect();
      const padding = 16;
      const maxTop = Math.max(
        padding,
        window.innerHeight - height - padding,
      );
      const headerBottom =
        document.querySelector('header')?.getBoundingClientRect().bottom ||
        0;
      const minTop = Math.min(
        maxTop,
        Math.max(padding, headerBottom + 12),
      );
      const above = position.y - height - 12;
      const below = position.y + 24;
      const ideal = above < minTop && below <= maxTop ? below : above;
      const next = {
        anchor: position,
        left: Math.max(
          padding,
          Math.min(
            position.x - actualWidth / 2,
            window.innerWidth - actualWidth - padding,
          ),
        ),
        top: Math.max(minTop, Math.min(ideal, maxTop)),
      };
      setPlacement((previous) =>
        previous?.anchor === position &&
        previous.left === next.left &&
        previous.top === next.top
          ? previous
          : next,
      );
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    window.addEventListener('resize', place);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [position, width]);
  const style: CSSProperties = {
    width: `min(${width}px, calc(100vw - 32px))`,
    maxHeight: 'calc(100dvh - 32px)',
    overflowY: 'auto',
    left: placement?.left || 0,
    top: placement?.top || 0,
    visibility: placement?.anchor === position ? 'visible' : 'hidden',
  };
  return { ref, style };
}
