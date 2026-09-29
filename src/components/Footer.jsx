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
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">

      {/* =====================================================
          MAIN FOOTER
          ===================================================== */}
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">

        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">

          {/* =================================================
              BRAND
              ================================================= */}
          <div>
            <Link
              href="/"
              className="group inline-flex items-center gap-3"
            >
              {/* DCC MARK */}
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/40 bg-blue-500/10 text-lg font-bold text-blue-400 transition duration-300 group-hover:border-blue-400 group-hover:bg-blue-500/20 group-hover:text-blue-300">
                &lt;/&gt;
              </div>

              {/* BRAND NAME */}
              <div>
                <h2 className="text-lg font-extrabold tracking-wide text-white">
                  DODOO
                </h2>

                <p className="text-sm font-bold tracking-[0.18em] text-blue-400">
                  CODING CLUB
                </p>
              </div>
            </Link>

            <p className="mt-6 max-w-md text-sm leading-7 text-slate-400">
              Supporting students in developing practical technology
              and software-development skills through learning,
              projects, mentorship, and real-world experience.
            </p>

            {/* WEBSITE LINK */}
            <a
              href="https://dodoocodingclub.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-400 transition hover:text-blue-300"
            >
              Visit Dodoo Coding Club
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          {/* =================================================
              PLATFORM
              ================================================= */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
              Platform
            </h3>

            <ul className="mt-5 space-y-3 text-sm">

              <li>
                <Link
                  href="/"
                  className="transition hover:text-white"
                >
                  Dashboard
                </Link>
              </li>

              <li>
                <Link
                  href="/resources"
                  className="transition hover:text-white"
                >
                  Learning Resources
                </Link>
              </li>

              <li>
                <Link
                  href="/projects"
                  className="transition hover:text-white"
                >
                  Student Projects
                </Link>
              </li>

              <li>
                <Link
                  href="/progress"
                  className="transition hover:text-white"
                >
                  Progress Tracking
                </Link>
              </li>

            </ul>
          </div>

          {/* =================================================
              ORGANIZATION
              ================================================= */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
              Dodoo Coding Club
            </h3>

            <ul className="mt-5 space-y-3 text-sm">

              <li>
                <a
                  href="https://dodoocodingclub.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-white"
                >
                  About DCC
                </a>
              </li>

              <li>
                <a
                  href="https://dodoocodingclub.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-white"
                >
                  Our Website
                </a>
              </li>

              <li>
                <a
                  href="https://dodoocodingclub.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-white"
                >
                  Support DCC
                </a>
              </li>

              <li>
                <Link
                  href="/register"
                  className="transition hover:text-white"
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
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
              Contact
            </h3>

            <div className="mt-5 space-y-4">

              {/* LOCATION */}
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

                <p className="text-sm leading-6 text-slate-400">
                  Pokuase Community Library,
                  <br />
                  Pokuase, Ghana
                  <br />
                  Ghana Post GPS: GW-0080-2132
                </p>
              </div>

              {/* PHONE */}
              <a
                href="tel:+233558446017"
                className="flex items-center gap-3 text-sm text-slate-400 transition hover:text-white"
              >
                <Phone className="h-5 w-5 shrink-0 text-blue-400" />
                +233 55 844 6017
              </a>

              {/* EMAIL */}
              <a
                href="mailto:info@dodoocodingclub.com"
                className="flex items-center gap-3 text-sm text-slate-400 transition hover:text-white"
              >
                <Mail className="h-5 w-5 shrink-0 text-blue-400" />
                info@dodoocodingclub.com
              </a>

            </div>
          </div>

        </div>

        {/* ===================================================
            DIVIDER
            =================================================== */}
        <div className="my-10 h-px bg-slate-800" />

        {/* ===================================================
            LOWER FOOTER
            =================================================== */}
        <div className="flex flex-col gap-5 text-sm md:flex-row md:items-center md:justify-between">

          {/* COPYRIGHT */}
          <p className="text-slate-500">
            © {currentYear} Dodoo Coding Club. All rights reserved.
          </p>

          {/* PLATFORM NAME */}
          <div className="flex items-center gap-2 text-slate-500">
            <Code2 className="h-4 w-4 text-blue-400" />

            <span>
              Student Success & Impact Platform
            </span>
          </div>

          {/* DEVELOPER */}
          <p className="text-slate-500">
            Developed by{" "}
            <span className="font-semibold text-slate-300">
              Godfred Sefa Aboagye
            </span>
          </p>

        </div>

      </div>

      {/* =====================================================
          BOTTOM BRAND BAR
          ===================================================== */}
      <div className="border-t border-slate-800 bg-slate-950/80">

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-4 text-xs text-slate-600 sm:flex-row lg:px-8">

          <span>
            Built for student growth, learning, and impact.
          </span>

          <span>
            Dodoo Coding Club · Ghana
          </span>

        </div>

      </div>

    </footer>
  );
}