export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="flex h-20 items-center justify-between px-6 md:px-8">
        
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-blue-700 text-2xl font-bold text-blue-700">
            &lt;/&gt;
          </div>

          <div>
            <h1 className="text-lg font-extrabold leading-tight text-blue-700">
              DODOO
            </h1>
            <p className="text-sm font-bold leading-tight text-blue-700">
              CODING CLUB
            </p>
          </div>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="/" className="font-semibold text-gray-900 hover:text-blue-700">
            Dashboard
          </a>

          <a href="/students" className="font-semibold text-gray-900 hover:text-blue-700">
            Students
          </a>

          <a href="/attendance" className="font-semibold text-gray-900 hover:text-blue-700">
            Attendance
          </a>

          <a href="/projects" className="font-semibold text-gray-900 hover:text-blue-700">
            Projects
          </a>

          <a href="/resources" className="font-semibold text-gray-900 hover:text-blue-700">
            Resources
          </a>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <div className="h-10 w-10 rounded-full bg-blue-700 text-center leading-10 font-bold text-white">
            G
          </div>

          <div className="hidden lg:block">
            <p className="text-sm font-bold text-gray-900">
              Facilitator
            </p>
            <p className="text-xs text-gray-500">
              Admin
            </p>
          </div>
        </div>

      </div>
    </header>
  );
}