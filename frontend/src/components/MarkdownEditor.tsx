import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { useEffect } from "react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: number;
}

export default function MarkdownEditor({
  value,
  onChange,
  height = 400,
}: MarkdownEditorProps) {
  // Ensure body overflow is reset when component unmounts
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="markdown-editor">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        height={height}
        preview="edit"
        hideToolbar={false}
        data-color-mode="light"
        onFocus={() => {
          // Ensure scrolling works when editor is focused
          document.body.style.overflow = "";
        }}
        onBlur={() => {
          // Reset overflow when editor loses focus
          document.body.style.overflow = "";
        }}
      />
    </div>
  );
}
