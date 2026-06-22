import { Bold, Italic, List, ListOrdered, Underline } from 'lucide-react';
import { useRef } from 'react';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

const controls = [
  { command: 'bold', label: 'Bold', icon: Bold },
  { command: 'italic', label: 'Italic', icon: Italic },
  { command: 'underline', label: 'Underline', icon: Underline },
  { command: 'insertUnorderedList', label: 'Bullet list', icon: List },
  { command: 'insertOrderedList', label: 'Numbered list', icon: ListOrdered },
] as const;

export const RichTextEditor = ({ value, onChange }: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const runCommand = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command);
    onChange(editorRef.current?.innerHTML ?? '');
  };

  return (
    <div>
      <p className='mb-2 text-xs font-bold tracking-widest text-black/50 uppercase'>
        Terms and conditions
      </p>
      <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white'>
        <div className='flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2'>
          {controls.map(({ command, label, icon: Icon }) => (
            <button
              key={command}
              type='button'
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runCommand(command)}
              className='rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900'
              aria-label={label}
              title={label}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(event) => onChange(event.currentTarget.innerHTML)}
          className='min-h-44 p-4 text-sm leading-6 text-slate-700 outline-none'
          dangerouslySetInnerHTML={{ __html: value }}
        />
      </div>
    </div>
  );
};
