export default function Footer() {
  return (
    <footer className="bg-gray-200">
      <div className="grid gap-10 px-8 py-12 md:grid-cols-3">
        
        {/* DODOO CODING CLUB */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-blue-700 text-xl font-bold text-blue-700">
              &lt;/&gt;
            </div>

            <div>
              <h2 className="font-extrabold text-blue-700">
                DODOO
              </h2>
              <p className="font-bold text-blue-700">
                CODING CLUB
              </p>
            </div>
          </div>

          <p className="mt-5 max-w-sm text-sm leading-6 text-gray-600">
            Supporting students in developing practical technology
            and software-development skills.
          </p>
        </div>

        {/* LOCATION */}
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            GHANA
          </h3>

          <p className="mt-4 text-sm leading-7 text-gray-600">
            Dodoo Coding Club
            <br />
            Pokuase Community Library, Pokuase
            <br />
            Ghana Post GPS: GW-0080-2132
            <br />
            Ghana
          </p>
        </div>

        {/* CONTACT */}
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            CONTACT
          </h3>

          <p className="mt-4 text-sm leading-7 text-gray-600">
            +233 54 338 7880
            <br />
            +233 24 060 5684
            <br />
            info@dodoocodingclub.com
          </p>

          <div className="mt-5 flex gap-3">
            <a
              href="https://dodoocodingclub.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-700 hover:text-white"
            >
              Visit DCC
            </a>

            <a
              href="https://dodoocodingclub.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-gray-900 shadow-sm transition hover:bg-yellow-500"
            >
              Support DCC
            </a>
          </div>
        </div>
      </div>

      {/* COPYRIGHT & DEVELOPER CREDIT */}
      <div className="border-t border-gray-300 px-8 py-5 text-center">
        <p className="text-sm text-gray-500">
          © 2026 Dodoo Coding Club. Student Success & Impact Platform.
        </p>

        <p className="mt-1 text-xs text-gray-400">
          Developed by{" "}
          <span className="font-semibold text-gray-600">
            Godfred Sefa Aboagye
          </span>{" "}
          — Software Developer
        </p>
      </div>
    </footer>
  );
}