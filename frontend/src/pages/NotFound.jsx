import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="grid min-h-[50vh] place-items-center px-4">
      <div className="max-w-sm text-center">
        <p className="text-5xl font-extrabold text-marigold-500">404</p>
        <h1 className="mt-2 text-lg font-extrabold text-ink">Ye page maujood nahi</h1>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-lagoon-700 underline">
          Home par jayein
        </Link>
      </div>
    </div>
  );
}