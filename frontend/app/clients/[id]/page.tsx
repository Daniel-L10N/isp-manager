import ClientPage from './ClientPage';

// Static export (output: 'export') requires a server wrapper for the dynamic
// segment [id]. The page is fully client-side: useParams reads the URL segment
// at runtime. With generateStaticParams()==[] and the core SPA fallback serving
// index.html for any non-/api path, /clients/{id} hydrates client-side without
// needing pre-rendered HTML per client id.
export function generateStaticParams() {
  return [];
}

export default function Page() {
  return <ClientPage />;
}
