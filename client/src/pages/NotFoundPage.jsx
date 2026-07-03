import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div>
        <p className="font-display text-6xl font-extrabold text-gradient">404</p>
        <p className="mt-2 text-muted">This page has drifted off the path.</p>
      </div>
      <Link to="/">
        <Button variant="outline">Back to safety</Button>
      </Link>
    </div>
  );
}
