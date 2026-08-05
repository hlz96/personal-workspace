import { useEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { MarkdownView } from '@/components/ui/MarkdownView';

interface Props {
  open: boolean;
  title: string;
  content: string; // markdown
  filename?: string;
  onClose: () => void;
}

// 复用 MarkdownView 渲染内容 → html2pdf 光栅化为 PDF → iframe 内嵌预览。
// 离屏容器固定浅色背景 + 固定宽度,保证导出的 PDF 版式稳定、中文不乱码。
export function PdfPreviewModal({ open, title, content, filename = 'document', onClose }: Props) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let createdUrl: string | null = null;
    setLoading(true);
    setUrl(null);

    // 等待离屏 DOM 完成渲染再截图
    const timer = setTimeout(async () => {
      if (!sourceRef.current) return;
      try {
        const { default: html2pdf } = await import('html2pdf.js');
        const bloburl = await html2pdf()
          .set({
            margin: [10, 10, 10, 10],
            filename: `${filename}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
          })
          .from(sourceRef.current)
          .outputPdf('bloburl');
        if (cancelled) return;
        createdUrl = bloburl;
        setUrl(bloburl);
      } catch (e) {
        console.error('[PdfPreviewModal] 生成 PDF 失败', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 60);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [open, content, filename]);

  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.pdf`;
    a.click();
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      className="max-w-3xl"
      footer={
        <button className="btn-primary" onClick={download} disabled={!url}>
          <Download className="h-4 w-4" />
          下载 PDF
        </button>
      }
    >
      {/* 离屏渲染源:固定浅色 + 固定宽度,不随主题变化 */}
      <div className="fixed -left-[9999px] top-0" aria-hidden>
        <div
          ref={sourceRef}
          style={{ width: '760px', padding: '24px', background: '#ffffff', color: '#1f2937' }}
        >
          <MarkdownView content={content} />
        </div>
      </div>

      {loading && (
        <div className="h-[60vh] grid place-items-center text-[rgb(var(--muted))]">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> 正在生成 PDF 预览...
          </div>
        </div>
      )}
      {!loading && url && (
        <iframe title={title} src={url} className="w-full h-[60vh] rounded-lg border-0" />
      )}
      {!loading && !url && (
        <div className="h-[60vh] grid place-items-center text-sm text-[rgb(var(--muted))]">
          生成失败,请重试。
        </div>
      )}
    </Modal>
  );
}
