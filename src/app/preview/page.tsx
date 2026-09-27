import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "PREVIEW · Color & Photo",
  description: "Internal preview — color accent and photo treatment comparison.",
  robots: { index: false, follow: false },
  alternates: {
    canonical: "/preview",
  },
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface ColorOption {
  id: string;
  name: string;
  hex: string;
  description: string;
}

const colorOptions: ColorOption[] = [
  {
    id: "A1",
    name: "Burgundy / Oxblood",
    hex: "#6B2027",
    description: "와인 · 올드머니 · 가장 강한 캐릭터",
  },
  {
    id: "A2",
    name: "Antique Brass",
    hex: "#8B6A2A",
    description: "골든아워 · 사진과 가장 잘 붙음 · 차분한 부",
  },
  {
    id: "A3",
    name: "Oxford Midnight Navy",
    hex: "#0B2240",
    description: "IB · 정통 금융 · 보수적 안전",
  },
];

interface PhotoTreatment {
  id: string;
  name: string;
  description: string;
  imageWrapClass: string;
  imageStyle: CSSProperties;
  overlayNode?: React.ReactNode;
}

const photoTreatments: PhotoTreatment[] = [
  {
    id: "T1",
    name: "Option 1 · B&W Duotone",
    description: "100% 그레이스케일 + 액센트 컬러 멀티플라이 오버레이. 가장 editorial.",
    imageWrapClass: "relative",
    imageStyle: { filter: "grayscale(100%) contrast(1.05)" },
    overlayNode: (
      <div
        className="absolute inset-0 mix-blend-multiply pointer-events-none"
        style={{ backgroundColor: "var(--preview-accent, #8B6A2A)" }}
      />
    ),
  },
  {
    id: "T2",
    name: "Option 2 · Pure Grayscale",
    description: "100% 그레이스케일 + 약간 어둡게. 가장 안전 · 무난.",
    imageWrapClass: "relative",
    imageStyle: { filter: "grayscale(100%) brightness(0.85)" },
  },
  {
    id: "T3",
    name: "Option 3 · Color + Dark Overlay",
    description: "원본 컬러 살리기 + 검정 그라디언트 60%. 골든아워가 살짝 비침.",
    imageWrapClass: "relative",
    imageStyle: { filter: "brightness(0.65) saturate(0.9)" },
    overlayNode: (
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
    ),
  },
];

function ColorCard({ option }: { option: ColorOption }) {
  const accentStyle = { "--color-accent": option.hex } as CSSProperties;

  return (
    <div
      className="border border-border bg-white p-10 md:p-12 flex flex-col"
      style={accentStyle}
    >
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs tracking-[0.3em] text-subtle uppercase font-medium">
          Option {option.id}
        </p>
        <div className="mt-3 flex items-baseline gap-3">
          <h3 className="text-xl font-bold tracking-tight">{option.name}</h3>
          <span className="text-xs text-subtle font-mono">{option.hex}</span>
        </div>
        <p className="mt-2 text-sm text-muted leading-relaxed">{option.description}</p>
      </div>

      {/* Color swatch */}
      <div className="mb-10">
        <div
          className="h-16 w-full"
          style={{ backgroundColor: option.hex }}
        />
        <div className="mt-2 flex gap-1">
          {[20, 40, 60, 80, 100].map((shade) => (
            <div
              key={shade}
              className="h-4 flex-1"
              style={{ backgroundColor: option.hex, opacity: shade / 100 }}
            />
          ))}
        </div>
      </div>

      {/* Hairline divider sample */}
      <div className="mb-8 border-t border-border pt-8">
        <p className="text-xs tracking-[0.25em] text-subtle uppercase mb-3">
          Hero hairline
        </p>
        <div
          className="h-px w-20"
          style={{ backgroundColor: option.hex }}
        />
      </div>

      {/* Hover underline link sample */}
      <div className="mb-8">
        <p className="text-xs tracking-[0.25em] text-subtle uppercase mb-3">
          Link hover-underline
        </p>
        <a
          href="#"
          className="hover-underline-preview relative text-sm font-medium tracking-wider"
          style={accentStyle}
        >
          전체 프로필 보기 &rarr;
        </a>
      </div>

      {/* Blockquote sample */}
      <div className="mb-8">
        <p className="text-xs tracking-[0.25em] text-subtle uppercase mb-3">
          Blockquote left bar
        </p>
        <blockquote
          className="pl-5 italic text-sm text-neutral-600 border-l-2"
          style={{ borderLeftColor: option.hex }}
        >
          가장 가까이서, 가장 정확하게.
        </blockquote>
      </div>

      {/* CTA button hover sample */}
      <div className="mb-8">
        <p className="text-xs tracking-[0.25em] text-subtle uppercase mb-3">
          Button hover ring
        </p>
        <button
          className="btn-blue rounded-[10px] px-6 py-3 text-xs tracking-wider font-medium transition-all duration-300 hover:ring-2"
          style={
            {
              "--tw-ring-color": option.hex,
            } as CSSProperties
          }
        >
          상담 신청
        </button>
      </div>

      {/* Number hover sample */}
      <div>
        <p className="text-xs tracking-[0.25em] text-subtle uppercase mb-3">
          Number on hover
        </p>
        <span
          className="text-5xl font-bold tracking-tighter text-neutral-200 transition-colors duration-300 hover:text-[var(--color-accent)]"
          style={accentStyle}
        >
          01
        </span>
      </div>
    </div>
  );
}

function PhotoTreatmentCard({
  treatment,
  accentHex,
}: {
  treatment: PhotoTreatment;
  accentHex: string;
}) {
  return (
    <div
      className="border border-border bg-white"
      style={{ "--preview-accent": accentHex } as CSSProperties}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-card">
        <Image
          src="/images/founder.webp"
          alt={treatment.name}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover object-center"
          style={treatment.imageStyle}
        />
        {treatment.overlayNode}
      </div>
      <div className="p-6 md:p-8">
        <p className="text-xs tracking-[0.3em] text-subtle uppercase font-medium">
          {treatment.id}
        </p>
        <h3 className="mt-3 text-base font-bold tracking-tight">
          {treatment.name}
        </h3>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          {treatment.description}
        </p>
      </div>
    </div>
  );
}

export default function PreviewPage() {
  if (process.env.ENABLE_PREVIEW_PAGE !== "true") {
    notFound();
  }

  return (
    <>
      {/* Hero */}
      <section className="py-20 md:py-28 bg-deep text-white">
        <div className="max-w-[1600px] mx-auto px-6">
          <p className="text-xs tracking-[0.4em] text-neutral-500 mb-6 uppercase">
            Internal · noindex
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tighter">
            컬러 + 사진 처리 비교
          </h1>
          <p className="mt-6 text-neutral-400 max-w-2xl leading-relaxed">
            세 가지 액센트 컬러와 세 가지 사진 처리 방식을 한 페이지에서 비교하기 위한
            내부 미리보기입니다. 검색엔진에 노출되지 않고, 메뉴에도 없습니다.
          </p>
        </div>
      </section>

      {/* Color Comparison */}
      <section className="py-24 md:py-32 bg-card">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="mb-12">
            <p className="text-xs tracking-[0.3em] text-muted uppercase font-medium mb-4">
              01 · Accent Color
            </p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              세 가지 액센트 컬러
            </h2>
            <p className="mt-4 text-muted max-w-2xl leading-relaxed">
              실제 사이트의 5가지 포인트(Hero hairline · 링크 hover · Blockquote ·
              Button ring · Number hover)에 적용된 모습. 각 카드는 독립적으로
              해당 컬러만 사용합니다.
            </p>
            <p className="mt-3 text-xs text-subtle">
              현재 라이브 사이트에는 <strong className="text-foreground">A2 (Antique Brass)</strong>가 적용되어 있습니다.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {colorOptions.map((option) => (
              <ColorCard key={option.id} option={option} />
            ))}
          </div>
        </div>
      </section>

      {/* Photo Treatment Comparison */}
      <section className="py-24 md:py-32">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="mb-12">
            <p className="text-xs tracking-[0.3em] text-muted uppercase font-medium mb-4">
              02 · Photo Treatment
            </p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              세 가지 사진 처리
            </h2>
            <p className="mt-4 text-muted max-w-2xl leading-relaxed">
              현재 프로필 사진(Founder 박민상)을 테스트 이미지로 세 가지 처리를 적용한 모습.
              실제 빌딩숲 사진이 들어가면 효과가 더 명확해집니다.
            </p>
          </div>
          {colorOptions.map((option) => (
            <div key={option.id} className="mb-16 last:mb-0">
              <p className="text-xs tracking-[0.25em] text-subtle uppercase font-medium mb-4">
                {option.id} · {option.name} 액센트와 함께
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {photoTreatments.map((treatment) => (
                  <PhotoTreatmentCard
                    key={treatment.id}
                    treatment={treatment}
                    accentHex={option.hex}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How to switch */}
      <section className="py-24 md:py-32 bg-deep text-white">
        <div className="max-w-[1600px] mx-auto px-6">
          <p className="text-xs tracking-[0.4em] text-neutral-500 mb-6 uppercase">
            How to Switch
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">
            컬러 한 줄로 바꾸는 법
          </h2>
          <div className="bg-neutral-900 border border-neutral-800 p-8 font-mono text-sm">
            <p className="text-neutral-500 mb-2">{"// src/app/globals.css"}</p>
            <p className="text-neutral-300">
              <span className="text-neutral-500">--color-accent: </span>
              <span className="text-amber-400">#8B6A2A</span>
              <span className="text-neutral-500">; /* A2 Antique Brass */</span>
            </p>
            <p className="text-neutral-300 mt-3">
              <span className="text-neutral-500">{"// 또는"}</span>
            </p>
            <p className="text-neutral-300">
              <span className="text-neutral-500">--color-accent: </span>
              <span className="text-rose-400">#6B2027</span>
              <span className="text-neutral-500">; /* A1 Burgundy */</span>
            </p>
            <p className="text-neutral-300">
              <span className="text-neutral-500">--color-accent: </span>
              <span className="text-blue-400">#0B2240</span>
              <span className="text-neutral-500">; /* A3 Oxford Navy */</span>
            </p>
          </div>
          <p className="mt-8 text-sm text-neutral-400 leading-relaxed max-w-2xl">
            세 컬러 모두 한 변수로 통제됩니다. 마음에 드는 걸 알려주시면 이 한 줄만 교체하고
            재배포하겠습니다. (사진 처리 옵션도 똑같이 알려주세요 — T1 / T2 / T3)
          </p>
        </div>
      </section>
    </>
  );
}
