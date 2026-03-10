import AuthClient from './AuthClient'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  return (
    <main className="min-h-screen bg-[#0d0a07] relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Background magical elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-600/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-red-900/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      <AuthClient message={searchParams?.message} />
    </main>
  )
}
