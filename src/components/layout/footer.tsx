import Link from "next/link";
import { siteConfig, navMenu, imageCredits } from "@/lib/constants";
import { StaggerChildren } from "@/components/motion";
import { StaggerItem } from "@/components/motion/stagger-item";

export default function Footer() {
  /* 상단 메뉴의 「서비스」와 같은 목록을 본다.
     전에는 여기에 다섯 개만 손으로 적혀 있어서 회계감사·회계자문 한 장이
     사이트 어디에서도 링크가 없었다. */
  const practiceLinks = (navMenu.find((m) => m.href === "/services")?.columns ?? [])
    .flatMap((col) => col.items);

  /* 메뉴 이름은 상단 메뉴에서 그대로 가져온다. 전에는 여기만 「홈 · 회사
     소개 · 회계사 소개」처럼 한글이라, 같은 페이지가 위아래에서 다른
     이름으로 불렸다. 위에 없는 두 개(홈·문의)만 같은 말투로 붙인다. */
  const menuLinks = [
    { href: "/", label: "HOME" },
    ...navMenu.map(({ href, label }) => ({ href, label })),
    { href: "/contact", label: "CONTACT" },
  ];

  return (
    <footer className="bg-deep text-white">
      {/* Divider */}
      <div className="max-w-[1600px] mx-auto px-6 pt-12">
        <div className="h-px bg-neutral-800" />
      </div>

      {/* Main Footer Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-16">
        {/* 손 안에서는 두 단이다. 세 단으로 쪼갰더니 칸이 100px 밖에 안 돼
              누를 자리가 없었다 — 링크 열일곱 개가 전부 15px 높이였다.
              회사 소개는 두 칸, 링크 두 묶음은 한 칸씩, 연락처는 다시 두 칸을
              써서 아래에 카드로 앉힌다. */}
        <StaggerChildren staggerDelay={0.1} className="ft-grid grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-7 sm:gap-12 lg:gap-8">
          {/* Brand Column */}
          <StaggerItem className="col-span-2 lg:col-span-1">
            <h2 className="text-base font-bold tracking-[0.12em] uppercase mb-5">
              {siteConfig.name}
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-xs">
              {siteConfig.tagline}
            </p>
            <div className="mt-6 space-y-1">
              <p className="text-xs text-neutral-400">
                Founder · {siteConfig.founder}
              </p>
            </div>
          </StaggerItem>

          {/* Service Column */}
          <StaggerItem>
            <h2 className="t-label t-label-d mb-5">
              Service
            </h2>
            <nav className="flex flex-col gap-3" aria-label="푸터 서비스">
              {practiceLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-neutral-400 hover:text-white transition-colors duration-300"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </StaggerItem>

          {/* Menu Column */}
          <StaggerItem>
            <h2 className="t-label t-label-d mb-5">
              Menu
            </h2>
            {/* 상단 메뉴가 아니라 전체 페이지 목록을 건다.
                푸터는 상단에 자리가 없어 밀린 것들이 가는 곳이다 —
                수임료·회계사 소개가 여기에도 없으면 갈 길이 아예 없다. */}
            {/* 두 줄로 세운다. 여덟 개를 한 줄로 쌓으면 이 칸만 세로로 길다. */}
            <nav className="ft-menu grid grid-cols-2 gap-x-3" aria-label="푸터 전체 메뉴">
              {menuLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-neutral-400 hover:text-white transition-colors duration-300"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </StaggerItem>

          {/* Contact Column — 손 안에서는 두 칸을 다 쓰는 카드로 앉힌다. */}
          <StaggerItem className="ft-contact col-span-2 lg:col-span-1">
            <h2 className="t-label t-label-d mb-5">
              Contact
            </h2>
            <div className="flex flex-col gap-3 text-sm text-neutral-400">
              <p>
                <span className="text-neutral-400 text-xs uppercase tracking-wider">Kakao</span>
                <br />
                <a
                  href={siteConfig.kakaoChannelUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-white transition-colors"
                >
                  카카오톡 채널
                </a>
              </p>
              <p>
                <span className="text-neutral-400 text-xs uppercase tracking-wider">Email</span>
                <br />
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="hover:text-white transition-colors"
                >
                  {siteConfig.email}
                </a>
              </p>
              <p>
                <span className="text-neutral-400 text-xs uppercase tracking-wider">Tel</span>
                <br />
                <a
                  href={`tel:${siteConfig.tel}`}
                  className="hover:text-white transition-colors"
                >
                  {siteConfig.tel}
                </a>
              </p>
              <p className="mt-2 leading-relaxed">
                <span className="text-neutral-400 text-xs uppercase tracking-wider">Address</span>
                <br />
                {siteConfig.address.map((line, i) => (
                  <span key={line}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <a
                  href={siteConfig.clientPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center self-start text-xs tracking-wider uppercase text-neutral-400 hover:text-white transition-colors duration-300 border-b border-neutral-700 hover:border-white pb-0.5"
                >
                  Client Login &rarr;
                </a>
              </div>
            </div>
          </StaggerItem>
        </StaggerChildren>
      </div>

      {/* Affiliation Disclosure */}
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="h-px bg-neutral-800" />
      </div>
      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-4">
        <p className="text-xs text-neutral-400 leading-relaxed max-w-4xl">
          <span className="text-neutral-300 font-medium">Affiliation Notice.</span>{" "}
          {siteConfig.affiliation}
        </p>
        {imageCredits.length > 0 && (
          <p className="text-xs text-neutral-400 leading-relaxed max-w-4xl">
            <span className="text-neutral-300 font-medium uppercase tracking-wider">
              Image Credits ·{" "}
            </span>
            {imageCredits.map((credit, i) => (
              <span key={credit.title}>
                {i > 0 && " · "}
                <a
                  href={credit.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-neutral-200 transition-colors"
                >
                  {credit.title}
                </a>
                {" by "}
                {credit.photographer}
                {" ("}
                {credit.license}
                {")"}
              </span>
            ))}
          </p>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="h-px bg-neutral-800" />
      </div>
      <div className="max-w-[1600px] mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-neutral-400 tracking-wide">
          &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </p>
        <p className="text-xs text-neutral-400">
          Seoul, South Korea
        </p>
      </div>
    </footer>
  );
}
