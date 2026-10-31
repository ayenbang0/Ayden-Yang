import { useRef, useEffect, useCallback } from 'react';

/**
 * PixelTransition — canvas-based pixelated page transition.
 *
 * The animation has two phases:
 * 1. Pixelate in (0–50%): black pixel blocks progressively fill the screen
 * 2. Pixelate out (50–100%): blocks progressively disappear
 *
 * The onHalfway callback fires at 50% so the parent can switch page content.
 */
export default function PixelTransition({ onHalfway, onComplete }) {
  const canvasRef = useRef(null);
  const halfTriggered = useRef(false);
  const frameRef = useRef(0);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pixelSize = Math.max(12, Math.min(24, Math.floor(canvas.width / 80)));
    const cols = Math.ceil(canvas.width / pixelSize);
    const rows = Math.ceil(canvas.height / pixelSize);
    const totalPixels = cols * rows;

    // Generate a shuffled order for deterministic pixel appearance
    const indices = Array.from({ length: totalPixels }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const duration = 900; // ms total
    const startTime = performance.now();
    let completed = false;

    const render = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.97)';

      // Number of active pixels based on progress
      // Phase 1 (0–0.5): pixels appear
      // Phase 2 (0.5–1.0): pixels disappear
      let activeCount;
      if (progress < 0.5) {
        activeCount = Math.floor((progress / 0.5) * totalPixels);
      } else {
        activeCount = Math.floor((1 - (progress - 0.5) / 0.5) * totalPixels);
      }

      // Draw active pixels
      for (let i = 0; i < activeCount; i++) {
        const idx = indices[i];
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize - 1, pixelSize - 1);
      }

      // Trigger halfway callback once
      if (progress >= 0.5 && !halfTriggered.current) {
        halfTriggered.current = true;
        onHalfway?.();
      }

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(render);
      } else if (!completed) {
        completed = true;
        onComplete?.();
      }
    };

    frameRef.current = requestAnimationFrame(render);
  }, [onHalfway, onComplete]);

  useEffect(() => {
    halfTriggered.current = false;
    animate();
    return () => cancelAnimationFrame(frameRef.current);
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50"
      style={{ imageRendering: 'pixelated', pointerEvents: 'none' }}
    />
  );
}
