"use client";

import {
  ArrowUpRight,
  Code2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

function FacebookIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M14 8h3V4h-3c-3.31 0-5 1.69-5 5v3H6v4h3v8h4v-8h3l1-4h-4V9c0-.67.33-1 1-1Z" />
    </svg>
  );
}

function InstagramIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle
        cx="17.5"
        cy="6.5"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function LinkedInIcon({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M5.2 3.5A2.2 2.2 0 1 1 5.2 7.9a2.2 2.2 0 0 1 0-4.4ZM3.3 9.3h3.8V21H3.3V9.3Zm6.2 0h3.6v1.6h.1c.5-.9 1.8-2 3.8-2 4.1 0 4.8 2.7 4.8 6.2V21H18v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21H9.5V9.3Z" />
    </svg>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-200 bg-white">
      {/* =====================================================
          MAIN FOOTER
      ====================================================== */}
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">

          {/* =================================================
              BRAND
          ================================================== */}
          <div className="max-w-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-blue-700 text-lg font-bold text-blue-700">
                &lt;/&gt;
              </div>

              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-blue-700">
                  DODOO
                </h2>

                <p className="text-sm font-bold tracking-wide text-blue-700">
                  CODING CLUB
                </p>
              </div>
            </div>

            <p className="text-sm leading-6 text-slate-500">
              Empowering students through technology, practical learning,
              mentorship, and real-world software development opportunities.
            </p>

            {/* Visit DCC Website */}
            <a
              href="https://dodoocodingclub.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Visit DCC Website
              <ArrowUpRight size={16} />
            </a>

            {/* Social Media */}
            <div className="mt-7">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Follow Dodoo Coding Club
              </p>

              <div className="flex items-center gap-2">
                {/* Facebook */}
                <a
                  href="https://web.facebook.com/dodoocodingclub/?_rdc=1&_rdr#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  <FacebookIcon />
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/dodoocodingclub/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  <InstagramIcon />
                </a>

                {/* LinkedIn */}
                <a
                  href="https://www.linkedin.com/company/dodoo-coding-club/posts/?feedView=all"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  <LinkedInIcon />
                </a>
              </div>
            </div>
          </div>

          {/* =================================================
              DCC LINKS
          ================================================== */}
          <div>
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-900">
              Dodoo Coding Club
            </h3>

            <ul className="space-y-4">
              <li>
                <a
                  href="https://dodoocodingclub.com/about/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-blue-700"
                >
                  About DCC

                  <ArrowUpRight
                    size={14}
                    className="opacity-0 transition group-hover:opacity-100"
                  />
                </a>
              </li>

              <li>
                <a
                  href="https://dodoocodingclub.com/founders-board/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-blue-700"
                >
                  Founders of the Club

                  <ArrowUpRight
                    size={14}
                    className="opacity-0 transition group-hover:opacity-100"
                  />
                </a>
              </li>

              <li>
                <a
                  href="https://dodoocodingclub.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-blue-700"
                >
                  Official Website

                  <ArrowUpRight
                    size={14}
                    className="opacity-0 transition group-hover:opacity-100"
                  />
                </a>
              </li>
            </ul>

            {/* Brand Statement */}
            <div className="mt-8 border-l-2 border-blue-700 pl-4">
              <p className="text-sm font-semibold text-slate-700">
                Learn. Build. Grow.
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Building the next generation of technology professionals.
              </p>
            </div>
          </div>

          {/* =================================================
              CONTACT
          ================================================== */}
          <div>
            <h3 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-900">
              Contact
            </h3>

            <div className="space-y-4">
              {/* Location */}
              <div className="flex items-start gap-3">
                <MapPin
                  size={19}
                  className="mt-0.5 shrink-0 text-blue-700"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Ghana
                  </p>

                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Pokuase Community Library
                    <br />
                    Pokuase, Ghana
                    <br />
                    Ghana Post GPS: GW-0080-2132
                  </p>
                </div>
              </div>

              {/* Phone */}
              <a
                href="tel:+233558446017"
                className="flex items-center gap-3 text-sm text-slate-500 transition hover:text-blue-700"
              >
                <Phone
                  size={18}
                  className="shrink-0 text-blue-700"
                />

                <span>+233 55 844 6017</span>
              </a>

              {/* Email */}
              <a
                href="mailto:info@dodoocodingclub.com"
                className="flex items-center gap-3 text-sm text-slate-500 transition hover:text-blue-700"
              >
                <Mail
                  size={18}
                  className="shrink-0 text-blue-700"
                />

                <span>info@dodoocodingclub.com</span>
              </a>
            </div>

            {/* Support DCC */}
            <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-sm font-bold text-slate-900">
                Support DCC
              </h4>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Help support technology education and opportunities for
                students.
              </p>

              <a
                href="https://www.paypal.com/donate/?hosted_button_id=D385MY7AE8QR6"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-yellow-400 px-5 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-yellow-500 hover:shadow-md"
              >
                Support DCC
              </a>
            </div>
          </div>
        </div>

        {/* =================================================
            DIVIDER
        ================================================== */}
        <div className="my-10 border-t border-slate-200" />

        {/* =================================================
            PLATFORM INFO
        ================================================== */}
        <div className="flex flex-col gap-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Code2
              size={15}
              className="text-blue-700"
            />

            <span>
              DCC Student Success &amp; Impact Platform
            </span>
          </div>

          <span>
            Built to support student learning, progress, and impact.
          </span>
        </div>
      </div>

      {/* =====================================================
          COPYRIGHT BAR
      ====================================================== */}
      <div className="bg-blue-700">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-center text-sm text-blue-100 sm:flex-row sm:items-center sm:justify-between sm:text-left lg:px-8">
          <p>
            © {currentYear} Dodoo Coding Club. All rights reserved.
          </p>

          <p>
            Developed by{" "}
            <span className="font-semibold text-white">
              Godfred Sefa Aboagye
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}