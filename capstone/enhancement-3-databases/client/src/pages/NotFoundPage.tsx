import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container-narrow text-center" style={{ paddingTop: 100 }}>
      <h1>404</h1>
      <p>That page doesn't exist.</p>
      <Link to="/" className="btn btn-primary">
        Back home
      </Link>
    </div>
  );
}
