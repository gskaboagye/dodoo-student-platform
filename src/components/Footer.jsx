"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Code2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-300 bg-white">

      {/* =====================================================
          MAIN FOOTER
          ===================================================== */}
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">

        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">

          {/* =================================================
              DODOO CODING CLUB
              ================================================= */}
          <div className="lg:col-span-1">

            <Link
              href="/"
              className="group inline-flex items-center gap-3"
            >
              {/* DCC LOGO MARK */}
              <div
                className="
                  flex
                  h-14
                  w-14
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border-2
                  border-blue-700
                  bg-white
                  text-2xl
                  font-bold
                  text-blue-700
                  transition
                  duration-300
                  group-hover:bg-blue-700
                  group-hover:text-white
                "
              >
                &lt;/&gt;
              </div>

              {/* DCC NAME */}
              <div>
                <h2 className="text-xl font-extrabold leading-tight text-blue-700">
                  DODOO
                </h2>

                <p className="font-bold leading-tight text-blue-700">
                  CODING CLUB
                </p>
              </div>
            </Link>

            <p className="mt-6 max-w-sm text-sm leading-7 text-gray-600">
              Supporting students in developing practical technology
              and software-development skills through learning,
              projects, mentorship, and real-world experience.
            </p>

            {/* VISIT DCC */}
            <a
              href="https://dodoocodingclub.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="
                mt-6
                inline-flex
                items-center
                gap-2
                rounded-lg
                bg-blue-700
                px-5
                py-2.5
                text-sm
                font-bold
                text-white
                shadow-sm
                transition
                duration-200
                hover:bg-blue-800
                hover:shadow-md
              "
            >
              Visit DCC
              <ArrowUpRight className="h-4 w-4" />
            </a>

          </div>

          {/* =================================================
              PLATFORM
              ================================================= */}
          <div>

            <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-900">
              Platform
            </h3>

            <ul className="mt-5 space-y-3 text-sm">

              <li>
                <Link
                  href="/"
                  className="text-gray-600 transition hover:text-blue-700"
                >
                  Dashboard
                </Link>
              </li>

              <li>
                <Link
                  href="/resources"
                  className="text-gray-600 transition hover:text-blue-700"
                >
                  Learning Resources
                </Link>
              </li>

              <li>
                <Link
                  href="/projects"
                  className="text-gray-600 transition hover:text-blue-700"
                >
                  Student Projects
                </Link>
              </li>

              <li>
                <Link
                  href="/progress"
                  className="text-gray-600 transition hover:text-blue-700"
                >
                  Progress Tracking
                </Link>
              </li>

              <li>
                <Link
                  href="/reports"
                  className="text-gray-600 transition hover:text-blue-700"
                >
                  Reports
                </Link>
              </li>

            </ul>

          </div>

          {/* =================================================
              DCC
              ================================================= */}
          <div>

            <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-900">
              Dodoo Coding Club
            </h3>

            <ul className="mt-5 space-y-3 text-sm">

              <li>
                <a
                  href="https://dodoocodingclub.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 transition hover:text-blue-700"
                >
                  About DCC
                </a>
              </li>

              <li>
                <a
                  href="https://dodoocodingclub.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 transition hover:text-blue-700"
                >
                  Official Website
                </a>
              </li>

              <li>
                <a
                  href="https://dodoocodingclub.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 transition hover:text-blue-700"
                >
                  Support DCC
                </a>
              </li>

              <li>
                <Link
                  href="/register"
                  className="text-gray-600 transition hover:text-blue-700"
                >
                  Join the Platform
                </Link>
              </li>

            </ul>

          </div>

          {/* =================================================
              CONTACT
              ================================================= */}
          <div>

            <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-900">
              Contact
            </h3>

            <div className="mt-5 space-y-5">

              {/* LOCATION */}
              <div className="flex items-start gap-3">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <MapPin className="h-5 w-5 text-blue-700" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Ghana
                  </p>

                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Pokuase Community Library,
                    <br />
                    Pokuase, Ghana
                    <br />
                    Ghana Post GPS:
                    <br />
                    GW-0080-2132
                  </p>
                </div>

              </div>

              {/* PHONE */}
              <a
                href="tel:+233558446017"
                className="group flex items-center gap-3"
              >

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <Phone className="h-4 w-4 text-blue-700" />
                </div>

                <span className="text-sm text-gray-600 transition group-hover:text-blue-700">
                  +233 55 844 6017
                </span>

              </a>

              {/* EMAIL */}
              <a
                href="mailto:info@dodoocodingclub.com"
                className="group flex items-center gap-3"
              >

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <Mail className="h-4 w-4 text-blue-700" />
                </div>

                <span className="break-all text-sm text-gray-600 transition group-hover:text-blue-700">
                  info@dodoocodingclub.com
                </span>

              </a>

              {/* SUPPORT BUTTON */}
              <a
                href="https://dodoocodingclub.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-lg
                  bg-yellow-400
                  px-5
                  py-2.5
                  text-sm
                  font-bold
                  text-gray-900
                  shadow-sm
                  transition
                  duration-200
                  hover:bg-yellow-500
                  hover:shadow-md
                "
              >
                Support DCC
              </a>

            </div>

          </div>

        </div>

        {/* =====================================================
            DIVIDER
            ===================================================== */}
        <div className="my-10 h-px bg-gray-200" />

        {/* =====================================================
            PLATFORM INFORMATION
            ===================================================== */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div className="flex items-center gap-2 text-sm text-gray-500">

            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50">
              <Code2 className="h-4 w-4 text-blue-700" />
            </div>

            <span>
              Student Success &amp; Impact Platform
            </span>

          </div>

          <p className="text-sm text-gray-500">
            Built to support learning, growth, and impact.
          </p>

        </div>

      </div>

      {/* =====================================================
          BLUE COPYRIGHT BAR
          Matches Official DCC Website
          ===================================================== */}
      <div className="bg-blue-700">

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 text-center sm:flex-row sm:text-left lg:px-8">

          <p className="text-sm font-medium text-white">
            © {currentYear} - Dodoo Coding Club
          </p>

          <p className="text-xs text-blue-100 sm:text-sm">
            Student Success &amp; Impact Platform
          </p>

          <p className="text-xs text-blue-100 sm:text-sm">
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