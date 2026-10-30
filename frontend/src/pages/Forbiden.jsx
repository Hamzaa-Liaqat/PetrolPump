import { Link } from 'react-router';

export default function Forbidden() {
  return (
    <div className="grid min-h-[50vh] place-items-center px-4">
      <div className="max-w-sm rounded-3xl bg-coral-100 p-6 text-center ring-1 ring-coral-500/30">
        <h1 className="text-lg font-extrabold text-coral-800">Is page ki ijazat nahi</h1>
        <p className="mt-2 text-sm text-coral-800">
          Aap ke role ko ye hissa dekhne ki ijazat nahi. Zaroorat ho to owner se rabta karein.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-xl bg-card px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-sand-100"
        >
          Wapas jayein
        </Link>
      </div>
    </div>
  );
}