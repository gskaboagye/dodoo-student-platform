"use client";

import {
  ArrowUpRight,
  Code2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

function FacebookIcon({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 8h3V4h-3c-3.31 0-5 1.69-5 5v3H6v4h3v8h4v-8h3l1-4h-4V9c0-.67.33-1 1-1Z" />
    </svg>
  );
}

function InstagramIcon({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5.2 3.5A2.2 2.2 0 1 1 5.2 7.9a2.2 2.2 0 0 1 0-4.4ZM3.3 9.3h3.8V21H3.3V9.3Zm6.2 0h3.6v1.6h.1c.5-.9 1.8-2 3.8-2 4.1 0 4.8 2.7 4.8 6.2V21H18v-5.2c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21H9.5V9.3Z" />
    </svg>
  );
}

const socialLinks = [
  {
    label: "Facebook",
    href: "https://web.facebook.com/dodoocodingclub/?_rdc=1&_rdr#",
    Icon: FacebookIcon,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/dodoocodingclub/",
    Icon: InstagramIcon,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/dodoo-coding-club/posts/?feedView=all",
    Icon: LinkedInIcon,
  },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-blue-700 text-white">
      <div className="mx-auto max-w-7xl px-6 pb-10 pt-14 lg:px-8 lg:pt-16">
        <div className="grid grid-cols-1 gap-11 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
          {/* Brand and social links */}
          <div className="lg:col-span-5">
            <a href="https://dodoocodingclub.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/50 bg-white/10 text-lg font-extrabold text-white">
                &lt;/&gt;
              </span>
              <span className="leading-tight">
                <span className="block text-lg font-extrabold tracking-wide text-white">DODOO</span>
                <span className="block text-xs font-bold tracking-[0.2em] text-blue-100">CODING CLUB</span>
              </span>
            </a>

            <p className="mt-5 max-w-md text-sm leading-7 text-blue-100">
              Empowering students through technology, practical learning, mentorship,
              and real-world software development opportunities.
            </p>

            <a
              href="https://dodoocodingclub.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Visit DCC Website <ArrowUpRight size={16} />
            </a>

            <div className="mt-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
                Connect with us
              </p>
              <div className="flex items-center gap-2.5">
                {socialLinks.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/25 bg-white/5 text-white transition hover:border-white hover:bg-white hover:text-blue-700"
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="lg:col-span-3">
            <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
              Explore DCC
            </h3>
            <ul className="space-y-4">
              <li>
                <a href="https://dodoocodingclub.com/about/" target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 text-sm text-blue-50 transition hover:text-white">
                  About DCC <ArrowUpRight size={14} className="opacity-0 transition group-hover:opacity-100" />
                </a>
              </li>
              <li>
                <a href="https://dodoocodingclub.com/founders-board/" target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 text-sm text-blue-50 transition hover:text-white">
                  Founders of the Club <ArrowUpRight size={14} className="opacity-0 transition group-hover:opacity-100" />
                </a>
              </li>
              <li>
                <a href="https://dodoocodingclub.com/" target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-2 text-sm text-blue-50 transition hover:text-white">
                  Official Website <ArrowUpRight size={14} className="opacity-0 transition group-hover:opacity-100" />
                </a>
              </li>
            </ul>

            <div className="mt-9 border-l-2 border-yellow-400 pl-4">
              <p className="text-sm font-bold text-white">Learn. Build. Grow.</p>
              <p className="mt-1 text-xs leading-5 text-blue-100">
                Building the next generation of technology professionals.
              </p>
            </div>
          </div>

          {/* Contact and support */}
          <div className="lg:col-span-4">
            <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
              Get in touch
            </h3>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <MapPin size={19} className="mt-0.5 shrink-0 text-yellow-300" />
                <div>
                  <p className="text-sm font-semibold text-white">Pokuase, Ghana</p>
                  <p className="mt-1 text-sm leading-6 text-blue-100">
                    Pokuase Community Library<br />
                    Ghana Post GPS: GW-0080-2132
                  </p>
                </div>
              </div>
              <a href="tel:+233558446017" className="flex items-center gap-3 text-sm text-blue-100 transition hover:text-white">
                <Phone size={18} className="shrink-0 text-yellow-300" />
                +233 55 844 6017
              </a>
              <a href="mailto:info@dodoocodingclub.com" className="flex items-center gap-3 text-sm text-blue-100 transition hover:text-white">
                <Mail size={18} className="shrink-0 text-yellow-300" />
                info@dodoocodingclub.com
              </a>
            </div>

            <div className="mt-8 rounded-xl border border-white/15 bg-blue-800/70 p-5">
              <h4 className="text-sm font-bold text-white">Support DCC</h4>
              <p className="mt-2 text-xs leading-6 text-blue-100">
                Help support technology education and opportunities for students.
              </p>
              <a
                href="https://www.paypal.com/donate/?hosted_button_id=D385MY7AE8QR6"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-yellow-400 px-5 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-yellow-300"
              >
                Support DCC
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-blue-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Code2 size={15} className="text-yellow-300" />
            <span>DCC Student Success &amp; Impact Platform</span>
          </div>
          <span>Built to support student learning, progress, and impact.</span>
        </div>
      </div>

      {/* Separate white copyright strip */}
      <div className="border-t border-blue-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-5 text-center text-sm text-blue-700 sm:flex-row sm:items-center sm:justify-between sm:text-left lg:px-8">
          <p>© {currentYear} Dodoo Coding Club. All rights reserved.</p>
          <p>
            Developed by <span className="font-semibold text-blue-900">Godfred Sefa Aboagye</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
