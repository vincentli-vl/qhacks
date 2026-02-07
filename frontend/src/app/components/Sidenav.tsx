"use client";
import Image from "next/image";
export default function Sidenav() {
  return (
    <header className="bg-gradient-to-b from-[#22529F] to-[#00377c] text-white p-4 shadow-md fixed left-0 h-screen w-64">
      <Image src="/images/Kingston_Archives.png" alt="logo" width={400} height={400} />
      <header className="mt-10 ml-2 text-2xl font-serif">Home</header>
      <header className="mt-10 ml-2 text-2xl font-serif">Timeline</header>
      <header className="mt-10 ml-2 text-2xl font-serif">Assisstant</header>
      <header className="mt-10 ml-2 text-2xl font-serif">Meeting Minuates</header>
      <header className="mt-10 ml-2 text-2xl font-serif">Pending Requests</header>
    </header>
  );
}