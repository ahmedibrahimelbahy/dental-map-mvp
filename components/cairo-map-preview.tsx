import { getTranslations } from "next-intl/server";

type Pin = {
  id: string;
  x: number;
  y: number;
  label: string;
  pulseDelay?: number;
  featured?: boolean;
};

/**
 * Decorative, brand-on-palette map of Greater Cairo.
 * Inline SVG — no tile provider, no runtime deps.
 * All positioning uses a fixed 600x500 viewBox.
 */
export async function CairoMapPreview({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "MapPreview" });
  const isAr = locale === "ar";

  const pins: Pin[] = [
    { id: "heliopolis", x: 440, y: 165, label: t("heliopolis") },
    { id: "nasrCity", x: 450, y: 250, label: t("nasrCity"), pulseDelay: 0.6 },
    { id: "zamalek", x: 310, y: 235, label: t("zamalek"), featured: true },
    { id: "mohandessin", x: 255, y: 260, label: t("mohandessin") },
    { id: "maadi", x: 345, y: 375, label: t("maadi"), pulseDelay: 1.2 },
    { id: "october", x: 120, y: 310, label: t("october") },
  ];

  const featured = pins.find((p) => p.featured)!;
  // Card position — anchored near the featured pin but biased inward
  const cardX = featured.x - 160;
  const cardY = featured.y - 130;

  return (
    <div className="relative w-full aspect-[6/5] rounded-[28px] overflow-hidden bg-gradient-to-br from-teal-50 via-white to-teal-50 border border-teal-100 shadow-search">
      {/* Soft ambient wash inside the card */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(65% 55% at 70% 28%, rgba(30,165,143,0.10) 0%, transparent 60%), radial-gradient(55% 45% at 25% 75%, rgba(30,165,143,0.08) 0%, transparent 65%)",
        }}
      />

      <svg
        viewBox="0 0 600 500"
        className="relative w-full h-full"
        aria-hidden="true"
      >
        <defs>
          {/* Subtle grid pattern — barely visible topography */}
          <pattern
            id="mapGrid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#E7F7F4"
              strokeWidth="1"
            />
          </pattern>

          {/* Nile gradient */}
          <linearGradient id="nile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9DDFD3" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#6FD0BD" stopOpacity="0.55" />
          </linearGradient>

          {/* Card shadow */}
          <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
            <feOffset dx="0" dy="4" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.18" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Pin gradient for depth */}
          <radialGradient id="pinGrad" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#3FBFA6" />
            <stop offset="100%" stopColor="#0E6458" />
          </radialGradient>

          {/* Reusable pin shape (from Dental Map logo) */}
          <symbol id="dmPin" viewBox="0 0 28 36" overflow="visible">
            <path
              d="M14 0 C6.27 0 0 6.1 0 13.6 C0 23.6 14 36 14 36 C14 36 28 23.6 28 13.6 C28 6.1 21.73 0 14 0 Z"
              fill="url(#pinGrad)"
            />
            {/* Tooth silhouette inside */}
            <path
              d="M9.2 8.4 C8 8.4 7 9.3 7 10.4 C7 13.4 8.1 14.2 8.1 15.7 C8.1 18 8.8 19 9.7 19 C10.5 19 10.7 18 10.8 16.5 C10.85 15.6 11.4 15.3 12 15.3 C12.6 15.3 13.15 15.6 13.2 16.5 C13.3 18 13.5 19 14.3 19 C15.2 19 15.9 18 15.9 15.7 C15.9 14.2 17 13.4 17 10.4 C17 9.3 16 8.4 14.8 8.4 C13.7 8.4 13 8.9 12 8.9 C11 8.9 10.3 8.4 9.2 8.4 Z"
              fill="#FFFFFF"
            />
          </symbol>
        </defs>

        {/* Grid background */}
        <rect width="600" height="500" fill="url(#mapGrid)" />

        {/* Abstract district blobs */}
        <g opacity="0.55">
          <ellipse cx="450" cy="180" rx="75" ry="45" fill="#E7F7F4" />
          <ellipse cx="455" cy="260" rx="85" ry="52" fill="#E7F7F4" />
          <ellipse cx="340" cy="375" rx="70" ry="44" fill="#E7F7F4" />
          <ellipse cx="250" cy="260" rx="60" ry="38" fill="#E7F7F4" />
          <ellipse cx="125" cy="320" rx="85" ry="55" fill="#E7F7F4" />
          <ellipse cx="530" cy="300" rx="60" ry="40" fill="#E7F7F4" />
        </g>

        {/* Main roads (thin, subtle) */}
        <g
          stroke="#CBD1D9"
          strokeWidth="1.25"
          fill="none"
          strokeLinecap="round"
          opacity="0.8"
        >
          {/* Ring Road — oval ring */}
          <path d="M 120 260 Q 150 110 340 110 Q 540 120 540 260 Q 540 420 340 420 Q 130 420 120 260 Z" />
          {/* Radial road from Tahrir outward */}
          <path d="M 330 260 L 440 250" />
          <path d="M 330 260 L 445 170" />
          <path d="M 330 260 L 130 310" strokeDasharray="4 6" />
          <path d="M 330 260 L 340 375" />
        </g>

        {/* Nile river — gently curved ribbon with island */}
        <g>
          <path
            d="M 300 -10 C 265 80 290 170 270 250 C 250 330 300 380 280 510"
            stroke="url(#nile)"
            strokeWidth="28"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 300 -10 C 265 80 290 170 270 250 C 250 330 300 380 280 510"
            stroke="#1EA58F"
            strokeWidth="1.2"
            fill="none"
            opacity="0.25"
          />
          {/* Zamalek island hint */}
          <ellipse
            cx="285"
            cy="225"
            rx="16"
            ry="26"
            fill="#F6FAFA"
            stroke="#9DDFD3"
            strokeWidth="1"
          />
        </g>

        {/* District labels */}
        <g
          fontFamily="var(--font-jakarta), var(--font-cairo), sans-serif"
          fontSize="10.5"
          fontWeight="700"
          letterSpacing="0.14em"
          fill="#475568"
          textAnchor="middle"
          style={{ textTransform: "uppercase" }}
        >
          {pins.map((p) => (
            <text key={`${p.id}-label`} x={p.x} y={p.y + 40}>
              {p.label}
            </text>
          ))}
        </g>

        {/* Pins with pulse rings */}
        <g>
          {pins.map((p) => (
            <g key={p.id} transform={`translate(${p.x}, ${p.y})`}>
              {/* Pulse ring */}
              <circle
                r="14"
                fill="#1EA58F"
                opacity="0.22"
                style={{
                  transformOrigin: "center",
                  animation: `mapPulse 2.4s cubic-bezier(0.4,0,0.2,1) ${
                    p.pulseDelay ?? 0
                  }s infinite`,
                }}
              />
              {/* Pin */}
              <use
                href="#dmPin"
                x={-10}
                y={-28}
                width={20}
                height={26}
              />
              {/* Featured ring highlight */}
              {p.featured && (
                <circle
                  r="19"
                  fill="none"
                  stroke="#1EA58F"
                  strokeWidth="2"
                  strokeDasharray="2 4"
                  opacity="0.65"
                  style={{
                    transformOrigin: "center",
                    animation: "mapSpin 18s linear infinite",
                  }}
                />
              )}
            </g>
          ))}
        </g>

        {/* Featured dentist card — anchored near the featured pin */}
        <g transform={`translate(${cardX}, ${cardY})`} filter="url(#cardShadow)">
          {/* Pointer line from card to pin */}
          <line
            x1="155"
            y1="80"
            x2={featured.x - cardX}
            y2={featured.y - cardY}
            stroke="#1EA58F"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity="0.4"
          />
          {/* Card */}
          <rect
            x="0"
            y="0"
            width="220"
            height="92"
            rx="14"
            fill="#FFFFFF"
            stroke="#E7F7F4"
            strokeWidth="1"
          />
          {/* Avatar */}
          <circle cx="32" cy="46" r="20" fill="#E7F7F4" />
          <text
            x="32"
            y="52"
            fontFamily="var(--font-jakarta), sans-serif"
            fontSize="14"
            fontWeight="700"
            fill="#0E6458"
            textAnchor="middle"
          >
            SH
          </text>
          {/* Name */}
          <text
            x="64"
            y="32"
            fontFamily="var(--font-jakarta), var(--font-cairo), sans-serif"
            fontSize="13"
            fontWeight="700"
            fill="#0F1B2A"
            {...(isAr ? { direction: "rtl" as const } : {})}
          >
            {t("sampleDentistName")}
          </text>
          {/* Specialty + area */}
          <text
            x="64"
            y="50"
            fontFamily="var(--font-manrope), var(--font-cairo), sans-serif"
            fontSize="11"
            fontWeight="500"
            fill="#64748B"
          >
            {t("sampleSpecialty")} · {t("zamalek")}
          </text>
          {/* Rating + fee */}
          <g transform="translate(64, 62)">
            <path
              d="M5 0 L6.2 3.3 L9.8 3.6 L7.1 5.9 L7.9 9.4 L5 7.6 L2.1 9.4 L2.9 5.9 L0.2 3.6 L3.8 3.3 Z"
              fill="#F2C744"
              transform="translate(0, 6)"
            />
            <text
              x="14"
              y="14"
              fontFamily="var(--font-manrope), sans-serif"
              fontSize="11"
              fontWeight="600"
              fill="#0F1B2A"
            >
              4.9
            </text>
            <text
              x="34"
              y="14"
              fontFamily="var(--font-manrope), sans-serif"
              fontSize="11"
              fontWeight="500"
              fill="#64748B"
            >
              · {t("sampleFee")}
            </text>
          </g>
          {/* "Next: 10:30" tag */}
          <g transform="translate(156, 62)">
            <rect
              x="0"
              y="0"
              width="54"
              height="20"
              rx="10"
              fill="#E7F7F4"
            />
            <text
              x="27"
              y="14"
              fontFamily="var(--font-manrope), sans-serif"
              fontSize="10"
              fontWeight="700"
              fill="#0E6458"
              textAnchor="middle"
            >
              10:30
            </text>
          </g>
        </g>
      </svg>

      {/* Live indicator badge */}
      <div className="absolute top-4 start-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-teal-100 shadow-sm">
        <span className="relative flex w-2 h-2">
          <span className="absolute inset-0 rounded-full bg-teal-500 animate-ping opacity-60"></span>
          <span className="relative rounded-full w-2 h-2 bg-teal-500"></span>
        </span>
        <span className="text-[11px] font-bold text-teal-700 tracking-wide uppercase">
          {t("liveLabel")}
        </span>
      </div>

      {/* Compass / corner mark */}
      <div className="absolute bottom-4 end-4 text-[10px] font-bold tracking-[0.16em] uppercase text-ink-400">
        {t("cornerLabel")}
      </div>
    </div>
  );
}
