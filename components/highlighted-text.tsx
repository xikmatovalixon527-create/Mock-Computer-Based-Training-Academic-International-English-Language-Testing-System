import React from 'react';

export function HighlightedText({ text, comments, taskIndex, focusedCommentIndex, setFocusedCommentIndex }: any) {
  if (!text) return <p className="whitespace-pre-wrap font-sans text-xl text-zinc-200">{text}</p>;
  if (!comments || comments.length === 0) return <p className="whitespace-pre-wrap font-sans text-xl text-zinc-200 leading-relaxed">{text}</p>;
  
  const relevantCommentsWithIndex = (comments || [])
    .map((c: any, originalIndex: number) => ({ ...c, originalIndex }))
    .filter((c: any) => c.task_number === taskIndex + 1);
    
  const alignedComments = relevantCommentsWithIndex.map((c: any) => {
    if (c.start_index >= 0 && c.end_index <= text.length && c.start_index < c.end_index && text.substring(c.start_index, c.end_index) === c.selected_text) {
      return c;
    }
    if (c.selected_text && c.selected_text.trim()) {
      const idx = text.indexOf(c.selected_text);
      if (idx !== -1) return { ...c, start_index: idx, end_index: idx + c.selected_text.length };
    }
    return { ...c, invalid: true };
  }).filter((c: any) => !c.invalid && c.start_index >= 0 && c.end_index <= text.length && c.start_index < c.end_index);

  const nonOverlappingComments: any[] = [];
  let currentLast = 0;
  
  const sortedAligned = [...alignedComments].sort((a, b) => a.start_index - b.start_index);
  sortedAligned.forEach(c => {
    if (c.start_index >= currentLast) {
      nonOverlappingComments.push(c);
      currentLast = c.end_index;
    }
  });

  let lastIndex = 0;
  const elements = [];
  
  nonOverlappingComments.forEach((c, i) => {
    if (c.start_index > lastIndex) {
      elements.push(<span key={`text-${i}`}>{text.substring(lastIndex, c.start_index)}</span>);
    }
    const isFocused = focusedCommentIndex === c.originalIndex;
    elements.push(
      <span 
        key={`mark-${i}`} 
        onClick={() => setFocusedCommentIndex(isFocused ? null : c.originalIndex)}
        className={`relative transition-all duration-150 cursor-pointer inline px-2 py-1 rounded border-b-2 ${
          isFocused 
            ? 'bg-blue-600 text-white font-semibold border-solid border-blue-500 shadow-lg shadow-blue-500/20 scale-105 mx-0.5' 
            : 'bg-zinc-800 text-zinc-100 border-dashed border-zinc-600 hover:bg-zinc-700/80 hover:text-white'
        }`}
      >
        {text.substring(c.start_index, c.end_index)}
      </span>
    );
    lastIndex = c.end_index;
  });

  if (lastIndex < text.length) {
    elements.push(<span key={`text-end`}>{text.substring(lastIndex)}</span>);
  }
  
  return (
    <div className="whitespace-pre-wrap leading-loose font-sans text-xl text-zinc-200 select-text">
      {elements}
    </div>
  );
}