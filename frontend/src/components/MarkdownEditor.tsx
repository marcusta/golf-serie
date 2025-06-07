import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";

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
  return (
    <div className="markdown-editor">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || "")}
        height={height}
        preview="edit"
        hideToolbar={false}
        data-color-mode="light"
      />
    </div>
  );
}
