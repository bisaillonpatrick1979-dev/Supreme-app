import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'rgb(var(--color-bg))' }}>
      <div className="text-center max-w-md">
        <p className="text-8xl font-black mb-4" style={{
          background: 'linear-gradient(135deg, rgb(var(--color-primary)), rgb(var(--color-accent)))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>404</p>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'rgb(var(--color-text))' }}>
          Page introuvable
        </h1>
        <p className="mb-8" style={{ color: 'rgb(var(--color-text-muted))' }}>
          {"Cette page n'existe pas ou a été déplacée."}
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/admin/dashboard"
            className="hm-btn-primary px-4 py-2 rounded-lg text-sm font-medium">
            Tableau de bord
          </Link>
          <Link href="/"
            className="hm-btn-secondary px-4 py-2 rounded-lg text-sm font-medium">
            Accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
