'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
}

const ToolbarButton = ({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    title={title}
    className={`p-1.5 rounded text-sm font-medium transition-colors ${
      active
        ? 'bg-brand-green text-white'
        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
    }`}
  >
    {children}
  </button>
);

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  minHeight = '120px',
  disabled = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
    ],
    content: value || '',
    editable: !disabled,
    onUpdate({ editor }) {
      const html = editor.isEmpty ? '' : editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2',
        style: `min-height: ${minHeight}`,
      },
    },
  });

  if (!editor) return null;

  return (
    <div
      className={`border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-green focus-within:border-transparent transition-shadow ${
        disabled ? 'bg-neutral-50 opacity-70 cursor-not-allowed' : 'bg-white border-neutral-300'
      }`}
    >
      {/* Toolbar */}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-neutral-200 bg-neutral-50">
          {/* Text style */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <span style={{ textDecoration: 'underline' }}>U</span>
          </ToolbarButton>

          <div className="w-px h-5 bg-neutral-300 mx-1" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              <circle cx="2" cy="6" r="1" fill="currentColor" />
              <circle cx="2" cy="12" r="1" fill="currentColor" />
              <circle cx="2" cy="18" r="1" fill="currentColor" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h11M9 12h11M9 18h11" />
              <text x="1" y="7" fontSize="5" fill="currentColor">1</text>
              <text x="1" y="13" fontSize="5" fill="currentColor">2</text>
              <text x="1" y="19" fontSize="5" fill="currentColor">3</text>
            </svg>
          </ToolbarButton>

          <div className="w-px h-5 bg-neutral-300 mx-1" />

          {/* Heading toggle */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading"
          >
            <span className="text-xs font-bold">H</span>
          </ToolbarButton>

          <div className="w-px h-5 bg-neutral-300 mx-1" />

          {/* Clear formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            title="Clear formatting"
            active={false}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </ToolbarButton>
        </div>
      )}

      {/* Editor area */}
      <div className="relative">
        {editor.isEmpty && (
          <p className="absolute top-2 left-3 text-neutral-400 text-sm pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* Prose styles scoped to editor */}
      <style>{`
        .ProseMirror ul { list-style-type: disc; padding-left: 1.25rem; margin: 0.25rem 0; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.25rem; margin: 0.25rem 0; }
        .ProseMirror li { margin: 0.1rem 0; }
        .ProseMirror h3 { font-size: 0.95rem; font-weight: 600; margin: 0.4rem 0 0.2rem; }
        .ProseMirror p { margin: 0.15rem 0; }
        .ProseMirror strong { font-weight: 700; }
        .ProseMirror em { font-style: italic; }
        .ProseMirror u { text-decoration: underline; }
      `}</style>
    </div>
  );
}
