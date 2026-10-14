import { cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { RichTextEditor } from './RichTextEditor';

afterEach(cleanup);

const ControlledEditor = () => {
  const [value, setValue] = useState('<p>Terms</p>');
  return <RichTextEditor value={value} onChange={setValue} />;
};

it('preserves the text node and cursor when local edits update the value', () => {
  const { container } = render(<ControlledEditor />);
  const editor = container.querySelector('[contenteditable]')!;
  const text = editor.querySelector('p')!.firstChild!;
  const selection = window.getSelection()!;

  for (const character of 'abc') {
    text.textContent += character;
    selection.collapse(text, text.textContent!.length);
    const offset = selection.anchorOffset;
    fireEvent.input(editor);

    expect(editor.querySelector('p')!.firstChild).toBe(text);
    expect(selection.anchorNode).toBe(text);
    expect(selection.anchorOffset).toBe(offset);
  }
  expect(editor.innerHTML).toBe('<p>Termsabc</p>');
});

it('loads initial content and applies external value changes', () => {
  const onChange = vi.fn();
  const { container, rerender } = render(
    <RichTextEditor value='<p>Original</p>' onChange={onChange} />,
  );
  const editor = container.querySelector('[contenteditable]')!;
  expect(editor.innerHTML).toBe('<p>Original</p>');

  rerender(<RichTextEditor value='<p>Updated</p>' onChange={onChange} />);
  expect(editor.innerHTML).toBe('<p>Updated</p>');
  rerender(<RichTextEditor value='' onChange={onChange} />);
  expect(editor.innerHTML).toBe('');
  expect(onChange).not.toHaveBeenCalled();
});
