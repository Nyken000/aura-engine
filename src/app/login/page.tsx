import AuthClient from './AuthClient'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams

  return (
    <main className="min-h-screen bg-[#0d0a07] relative overflow-hidden flex flex-col items-center justify-center p-6">
      <div className="absolute top-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full bg-amber-600/10 blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[60%] w-[60%] rounded-full bg-red-900/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      <AuthClient message={params?.message} />
    </main>
  )
}
