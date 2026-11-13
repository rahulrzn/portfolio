import { Download } from 'lucide-react';
import { useContent } from '../content/context';
export function ResumeButton({ small = false }: { small?: boolean }) {
  const content = useContent();
  async function download() {
    const { createResume } = await import('../content/resume');
    const url = URL.createObjectURL(createResume(content));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rahul-reji-resume.pdf';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  return content.settings.resumeUrl ? (
    <a
      className={`button secondary ${small ? 'small' : ''}`}
      href={content.settings.resumeUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      Résumé <Download size={15} />
    </a>
  ) : (
    <button
      className={`button secondary ${small ? 'small' : ''}`}
      onClick={download}
      type="button"
      aria-label="Download résumé"
    >
      {small ? 'Résumé' : 'Download résumé'} <Download size={15} />
    </button>
  );
}
