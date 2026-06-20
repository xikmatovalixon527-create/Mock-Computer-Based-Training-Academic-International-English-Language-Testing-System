import React from 'react';

interface CommentType {
  id: string;
  review_id: string;
  task_number: number;
  start_index: number;
  end_index: number;
  selected_text: string;
  comment_text: string;
  originalIndex?: number;
  invalid?: boolean;
}

interface HighlightedTextProps {
  text: string | null;
  comments: CommentType[];
  taskIndex: number;
  focusedCommentIndex: number | null;
  setFocusedCommentIndex: (index: number | null) => void;
}

export function HighlightedText({
  text,
  comments,
  taskIndex,
  focusedCommentIndex,
  setFocusedCommentIndex
}: HighlightedTextProps) {
  if (!text) {
    return <p className="whitespace-pre-wrap font-sans text-base text-[#f5f5f7]">No content provided.</p>;
  }

  if (!comments || comments.length === 0) {
    return <p className="whitespace-pre-wrap font-sans text-base text-[#f5f5f7] leading-relaxed">{text}</p>;
  }

  // Привязываем оригинальный индекс для сохранения фокуса на активном комментарии
  const relevantCommentsWithIndex = comments
    .map((c, originalIndex) => ({ ...c, originalIndex }))
    .filter((c) => c.task_number === taskIndex + 1);

  // Выравниваем индексы выделения на случай расхождения переноса строк (\r\n)
  const alignedComments = relevantCommentsWithIndex
    .map((c) => {
      const { start_index, end_index, selected_text } = c;

      if (
        start_index >= 0 &&
        end_index <= text.length &&
        start_index < end_index &&
        text.substring(start_index, end_index) === selected_text
      ) {
        return c;
      }

      // Если индексы сбились, ищем прямое текстовое совпадение
      if (selected_text && selected_text.trim()) {
        const idx = text.indexOf(selected_text);
        if (idx !== -1) {
          return { ...c, start_index: idx, end_index: idx + selected_text.length };
        }
      }

      return { ...c, invalid: true };
    })
    .filter((c) => !c.invalid && c.start_index >= 0 && c.end_index <= text.length && c.start_index < c.end_index);

  // Очищаем пересекающиеся комментарии (приоритет отдается более ранним)
  const nonOverlappingComments: typeof alignedComments = [];
  let currentLastIndex = 0;

  const sortedAligned = [...alignedComments].sort((a, b) => a.start_index - b.start_index);
  sortedAligned.forEach((c) => {
    if (c.start_index >= currentLastIndex) {
      nonOverlappingComments.push(c);
      currentLastIndex = c.end_index;
    }
  });

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  nonOverlappingComments.forEach((c, i) => {
    // Добавляем обычный текст перед выделенным фрагментом
    if (c.start_index > lastIndex) {
      elements.push(
        <span key={`text-before-${i}`}>{text.substring(lastIndex, c.start_index)}</span>
      );
    }

    const isFocused = focusedCommentIndex === c.originalIndex;

    elements.push(
      <span
        key={`highlight-${i}`}
        onClick={() => setFocusedCommentIndex(isFocused ? null : (c.originalIndex ?? null))}
        className={`relative transition-all duration-200 cursor-pointer inline px-1.5 py-0.5 rounded ${
          isFocused
            ? 'bg-blue-600 text-white font-medium border-b-2 border-solid border-white mx-0.5 shadow-[0_0_10px_rgba(37,99,235,0.6)]'
            : 'bg-sky-500/20 text-[#f5f5f7] border-b-2 border-sky-400/60 hover:bg-sky-500/35 hover:border-sky-400'
        }`}
      >
        {text.substring(c.start_index, c.end_index)}
      </span>
    );
    lastIndex = c.end_index;
  });

  // Добавляем оставшийся текст в конце
  if (lastIndex < text.length) {
    elements.push(<span key="text-end">{text.substring(lastIndex)}</span>);
  }

  return (
    <div className="whitespace-pre-wrap leading-relaxed font-sans text-base text-[#f5f5f7] select-text">
      {elements}
    </div>
  );
}