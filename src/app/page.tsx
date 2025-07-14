import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">
            FacturaSaaS
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Sistema de facturación para PYMES
          </p>
          <div className="space-x-4">
            <Link href="/dashboard">
              <button className="bg-primary text-white px-6 py-3 rounded-2xl hover:bg-blue-900 transition-colors">
                Ir al Dashboard
              </button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}