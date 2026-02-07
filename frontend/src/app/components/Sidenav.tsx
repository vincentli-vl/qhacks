"use client";
import Image from "next/image";
import Link from "next/link";
export default function Sidenav() {
  return (
    <header className="bg-gradient-to-b from-[#22529F] to-[#00377c] text-white p-4 shadow-md fixed left-0 h-screen w-64">
      <div className="flex flex-col">
        <Image
          src="/images/Kingston_Archives.png"
          alt="logo"
          width={400}
          height={400}
        />
        <Link href="/" className="mt-10 ml-2 text-2xl font-serif">
          Home
        </Link>
        <Link href="/timeline" className="mt-10 ml-2 text-2xl font-serif">
          Timeline
        </Link>
        <Link href="/assistant" className="mt-10 ml-2 text-2xl font-serif">
          Assistant
        </Link>
        <Link
          href="/meeting-minutes"
          className="mt-10 ml-2 text-2xl font-serif"
        >
          Meeting Minutes
        </Link>
        <Link
          href="/pending-requests"
          className="mt-10 ml-2 text-2xl font-serif"
        >
          Pending Requests
        </Link>
        <div className="fixed bottom-10 left-3">
          <Link
            href="/help"
            className="mt-10 ml-4 text-2xl font-serif flex items-center gap-4"
          >
            Help
          </Link>
          <Link
            href="/settings"
            className="mt-10 ml-4 text-2xl font-serif flex items-center gap-4"
          >
            Settings
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              fill="currentColor"
              className="bi bi-gear"
              viewBox="0 0 16 16"
            >
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0" />
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z" />
            </svg>
          </Link>
          <Link
            href="/profile"
            className="mt-10 ml-2 text-2xl font-serif flex items-center gap-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              fill="currentColor"
              className="bi bi-person"
              viewBox="0 0 16 16"
            >
              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
            </svg>
            Profile
          </Link>
        </div>
      </div>
    </header>
  );
}
