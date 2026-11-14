import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, Clock3, FilePenLine, FolderKanban, Link2 } from 'lucide-react';
import { useWorkspace } from '../content/context';

export default function Dashboard() {
  const { snapshot } = useWorkspace();
  const hasDraft = JSON.stringify(snapshot.draft) !== JSON.stringify(snapshot.published);
  const counts = [
    {
      label: 'Projects',
      path: 'projects',
      draft: snapshot.draft.projects.length,
      public: snapshot.published.projects.filter((item) => item.status === 'published').length,
    },
    {
      label: 'Skills',
      path: 'skills',
      draft: snapshot.draft.skills.flatMap((group) => group.items).length,
      public: snapshot.published.skills.flatMap((group) => group.items).length,
    },
    {
      label: 'Research',
      path: 'research',
      draft: snapshot.draft.research.length,
      public: snapshot.published.research.filter((item) => item.status === 'published').length,
    },
    {
      label: 'Social links',
      path: 'social',
      draft: snapshot.draft.socialLinks.length,
      public: snapshot.published.socialLinks.filter((item) => item.enabled).length,
    },
  ];
  return (
    <>
      <header className="admin-page-heading">
        <div>
          <h1>Overview</h1>
          <p>Your portfolio, ready for its next update.</p>
        </div>
        <span className="admin-owner-name">{snapshot.draft.profile.name}</span>
      </header>
      <section className="admin-publication-panel" aria-labelledby="publication-title">
        <div className="admin-publication-icon">
          {hasDraft ? (
            <FilePenLine size={24} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={24} aria-hidden="true" />
          )}
        </div>
        <div>
          <h2 id="publication-title">
            {hasDraft
              ? 'Saved changes are waiting to be published.'
              : 'Your saved draft matches the public portfolio.'}
          </h2>
          <p>
            {hasDraft
              ? 'Review the complete saved draft in Preview. Publish makes that version public in one step.'
              : 'Start an update below. Saving keeps your edits in the draft until you choose Publish.'}
          </p>
          <Link className="button secondary" to="/admin/preview">
            Preview saved draft <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-directory-panel">
          <div className="admin-section-heading">
            <h2>Content at a glance</h2>
            <span>Saved content</span>
          </div>
          <table className="admin-content-counts">
            <thead>
              <tr>
                <th scope="col">Content</th>
                <th scope="col">In draft</th>
                <th scope="col">Public</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((row) => (
                <tr key={row.path}>
                  <th scope="row">
                    <Link to={`/admin/${row.path}`}>
                      {row.label}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  </th>
                  <td>{row.draft}</td>
                  <td>{row.public}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="admin-panel-footnote">
            Draft items and disabled social links stay hidden from visitors.
          </p>
        </section>
        <section className="admin-panel admin-quick-panel">
          <h2>Make an update</h2>
          <div className="admin-quick-links">
            <Link to="/admin/profile">
              <FilePenLine size={20} aria-hidden="true" />
              <span>
                <strong>Update your introduction</strong>
                <small>Profile, portrait and availability</small>
              </span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link to="/admin/projects">
              <FolderKanban size={20} aria-hidden="true" />
              <span>
                <strong>Manage your projects</strong>
                <small>Stories, links and public visibility</small>
              </span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link to="/admin/social">
              <Link2 size={20} aria-hidden="true" />
              <span>
                <strong>Connect your social profiles</strong>
                <small>Choose which links visitors can see</small>
              </span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
      <section className="admin-panel admin-activity-panel">
        <div className="admin-section-heading">
          <h2>Recent activity</h2>
          <Clock3 size={18} aria-hidden="true" />
        </div>
        {snapshot.activity.length ? (
          <ol className="admin-activity">
            {snapshot.activity.slice(0, 8).map((item) => (
              <li key={item.id}>
                <span>{item.label}</span>
                <time dateTime={item.at}>
                  {new Date(item.at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="admin-empty-copy">
            Your first saved update will appear here. Open an editor to get started.
          </p>
        )}
      </section>
    </>
  );
}
