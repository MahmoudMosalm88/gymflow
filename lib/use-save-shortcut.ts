'use client';

import { RefObject, useEffect, useRef } from 'react';

type EnterMode = 'form' | 'all';

type UseSaveShortcutOptions = {
  scopeRef: RefObject<HTMLElement | null>;
  onSave: () => void;
  enabled?: boolean;
  disabled?: boolean;
  enterMode?: EnterMode;
};

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'submit',
  'reset',
  'checkbox',
  'radio',
  'file',
  'range',
  'color',
  'image',
]);

function isIgnoredTarget(target: HTMLElement) {
  return Boolean(target.closest('[data-save-shortcut-ignore="true"]'));
}

function isTextEntryTarget(target: HTMLElement) {
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) {
    const type = (target.type || 'text').toLowerCase();
    return !NON_TEXT_INPUT_TYPES.has(type);
  }
  if (target.isContentEditable) return true;
  return target.getAttribute('role') === 'textbox';
}

function isMultilineTarget(target: HTMLElement) {
  if (target instanceof HTMLTextAreaElement) return true;
  if (target.isContentEditable) return true;
  return target.getAttribute('aria-multiline') === 'true';
}

export function useSaveShortcut({
  scopeRef,
  onSave,
  enabled = true,
  disabled = false,
  enterMode = 'all',
}: UseSaveShortcutOptions) {
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || disabled) return;

      const scope = scopeRef.current;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const focusTarget = activeElement && scope?.contains(activeElement) ? activeElement : target;

      if (!scope || !focusTarget || !scope.contains(focusTarget) || isIgnoredTarget(focusTarget)) {
        return;
      }

      const isSaveChord =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.key.toLowerCase() === 's';
      const isPlainEnter =
        event.key === 'Enter' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey;

      if (!isSaveChord && !isPlainEnter) return;

      if (isPlainEnter) {
        if (enterMode === 'form') {
          if (!isMultilineTarget(focusTarget)) return;
        } else if (!isTextEntryTarget(focusTarget)) {
          return;
        }
      }

      event.preventDefault();
      event.stopPropagation();
      onSaveRef.current();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [disabled, enabled, enterMode, scopeRef]);
}
