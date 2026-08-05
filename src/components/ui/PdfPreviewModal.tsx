import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { MarkdownView } from '@/components/ui/MarkdownView';

interface Props {
  open: boolean;
  title: string;
  content: string; // markdown
  filename?: string;
  onClose: () => void;
}

// 打印窗口用的自包含样式(新窗口没有 app 的 Tailwind,需内联覆盖语义元素)。
const PRINT_STYLE = `
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
         color: #1f2937; line-height: 1.7; font-size: 14px; margin: 0; padding: 24px; }
  h1 { font-size: 22px; font-weight: 600; margin: 16px 0 8px; }
  h2 { font-size: 18px; font-weight: 600; margin: 16px 0 8px; }
  h3 { font-size: 15px; font-weight: 600; margin: 12px 0 6px; }
  p { margin: 8px 0; }
  ul, ol { padding-left: 24px; margin: 8px 0; }
  li { margin: 2px 0; }
  code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
  pre { background: #f1f5f9; padding: 12px; border-radius: 8px; overflow-x: auto; }
  blockquote { border-left: 4px solid #cbd5e1; padding-left: 12px; color: #64748b; margin: 8px 0; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; font-size: 13px; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
  a { color: #2563eb; }
`;

// 复用 MarkdownView 在模态内做屏幕预览;导出走浏览器原生「打印 → 另存为 PDF」,
// 零第三方依赖,中文渲染由系统字体保证,版式稳定。
export function PdfPreviewModal({ open, title, content, filename = 'document', onClose }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);

  const exportPdf = () => {
    const html = previewRef.current?.innerHTML;
    if (!html) return;
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) {
      alert('打印窗口被浏览器拦截,请允许弹窗后重试。');
      return;
    }
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${filename}</title>` +
        `<style>${PRINT_STYLE}</style></head><body>${html}` +
        `<script>window.onload=function(){window.focus();window.print();};<\/script>` +
        `</body></html>`,
    );
    w.document.close();
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      className="max-w-3xl"
      footer={
        <button className="btn-primary" onClick={exportPdf}>
          <Printer className="h-4 w-4" />
          导出 PDF
        </button>
      }
    >
      <div className="mb-3 text-xs text-[rgb(var(--muted))]">
        点「导出 PDF」会打开打印窗口,在打印目标里选「另存为 PDF」即可保存。
      </div>
      <div
        ref={previewRef}
        className="rounded-lg border p-4 max-h-[60vh] overflow-y-auto scrollbar-thin bg-white text-[#1f2937]"
      >
        <MarkdownView content={content} />
      </div>
    </Modal>
  );
}
