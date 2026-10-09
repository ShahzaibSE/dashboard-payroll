import { Outlet } from 'react-router'

export default function AppLayout() {
  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold">PayrollOps</h1>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
