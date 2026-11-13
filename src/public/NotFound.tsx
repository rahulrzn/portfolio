import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePublicPath } from '../content/context';
import { Seo } from '../components/Seo';
export default function NotFound() {
  const path = usePublicPath();
  return (
    <section className="container not-found">
      <Seo title="Page not found" noindex />
      <span className="not-found-code">404</span>
      <h1>This page took a different path.</h1>
      <p>The page may have moved, or the project may not be published.</p>
      <Link className="button" to={path('/')}>
        <ArrowLeft size={17} /> Back to portfolio
      </Link>
    </section>
  );
}
