import { useState, useRef, useEffect } from 'react';

/**
 * Tooltip reutilizável — aparece ao hover (desktop) e ao toque (mobile).
 * Design consistente com o sistema visual do Salão Secreto.
 *
 * Uso:
 *   <Tooltip content="Explicação aqui">
 *     <HelpCircle size={12} />
 *   </Tooltip>
 */
export default function Tooltip({ content, children, position = 'top' }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const show = () => {
    clearTimeout(timeoutRef.current);
    setVisible(true);
  };

  const hide = () => {
    timeoutRef.current = setTimeout(() => setVisible(false), 150);
  };

  const toggle = (e) => {
    e.stopPropagation();
    setVisible(prev => !prev);
  };

  // Posicionar o tooltip
  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top, left;

    switch (position) {
      case 'bottom':
        top = trigger.bottom + scrollY + 8;
        left = trigger.left + scrollX + trigger.width / 2 - tooltip.width / 2;
        break;
      case 'left':
        top = trigger.top + scrollY + trigger.height / 2 - tooltip.height / 2;
        left = trigger.left + scrollX - tooltip.width - 8;
        break;
      case 'right':
        top = trigger.top + scrollY + trigger.height / 2 - tooltip.height / 2;
        left = trigger.right + scrollX + 8;
        break;
      default: // top
        top = trigger.top + scrollY - tooltip.height - 8;
        left = trigger.left + scrollX + trigger.width / 2 - tooltip.width / 2;
    }

    // Evitar overflow horizontal
    const maxLeft = window.innerWidth - tooltip.width - 8;
    left = Math.max(8, Math.min(left, maxLeft));

    setCoords({ top, left });
  }, [visible, position]);

  // Fechar ao clicar fora (mobile)
  useEffect(() => {
    if (!visible) return;
    const handler = () => setVisible(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [visible]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={toggle}
        className="inline-flex items-center cursor-help"
      >
        {children}
      </span>

      {visible && (
        <div
          ref={tooltipRef}
          style={{ position: 'absolute', top: coords.top, left: coords.left, zIndex: 9999 }}
          onMouseEnter={show}
          onMouseLeave={hide}
          className="px-3 py-2 bg-gray-800 text-white text-[11px] leading-relaxed rounded-lg shadow-xl max-w-[260px] animate-fadeIn pointer-events-auto"
        >
          {content}
          <div
            className={`absolute w-2 h-2 bg-gray-800 rotate-45 ${
              position === 'top' ? '-bottom-1 left-1/2 -translate-x-1/2' :
              position === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2' :
              position === 'left' ? '-right-1 top-1/2 -translate-y-1/2' :
              '-left-1 top-1/2 -translate-y-1/2'
            }`}
          />
        </div>
      )}
    </>
  );
}
