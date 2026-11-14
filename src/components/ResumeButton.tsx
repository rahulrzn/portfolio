import { Download, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useContent, usePublicPath } from '../content/context';
export function ResumeButton({ small = false, showPreview = true }: { small?: boolean; showPreview?: boolean }) {
  const content = useContent();
  const path = usePublicPath();
  async function download() {
    const { createResume } = await import('../content/resume');
    const url = URL.createObjectURL(createResume(content));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rahul-reji-resume.pdf';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  const downloadAction = content.settings.resumeUrl ? (
    <a
      className={`button secondary ${small ? 'small' : ''}`}
      href={content.settings.resumeUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open résumé"
    >
      {small ? 'Résumé' : 'Open résumé'} <Download size={15} aria-hidden="true" />
    </a>
  ) : (
    <button
      className={`button secondary ${small ? 'small' : ''}`}
      onClick={download}
      type="button"
      aria-label="Download résumé"
    >
      {small ? 'Résumé' : 'Download résumé'} <Download size={15} aria-hidden="true" />
    </button>
  );
  return (
    <div className={`resume-actions ${small ? 'resume-actions-small' : ''}`}>
      {downloadAction}
      {showPreview ? (
        <Link
          className={`button secondary ${small ? 'small resume-preview-icon' : ''}`}
          to={path('/resume')}
          aria-label="Preview résumé"
          title={small ? 'Preview résumé' : undefined}
        >
          {small ? null : 'Preview résumé'} <Eye size={16} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
