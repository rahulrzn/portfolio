import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './Layout';
const Home = lazy(() => import('./Home'));
const About = lazy(() => import('./About'));
const Skills = lazy(() => import('./Skills'));
const Projects = lazy(() => import('./Projects'));
const ProjectDetail = lazy(() => import('./ProjectDetail'));
const Research = lazy(() => import('./Research'));
const Contact = lazy(() => import('./Contact'));
const Resume = lazy(() => import('./Resume'));
const NotFound = lazy(() => import('./NotFound'));
export default function PublicRoutes() {
  return (
    <Suspense
      fallback={
        <div className="page-loading" role="status">
          Loading portfolio…
        </div>
      }
    >
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="skills" element={<Skills />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:slug" element={<ProjectDetail />} />
          <Route path="research" element={<Research />} />
          <Route path="contact" element={<Contact />} />
          <Route path="resume" element={<Resume />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
