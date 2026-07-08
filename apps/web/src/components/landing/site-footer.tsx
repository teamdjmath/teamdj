import { SITE_CONFIG } from "@/lib/site-config";

export function SiteFooter() {
  const { academyName, ceoName, bizRegNo, academyRegNo, address, phone } = SITE_CONFIG;
  const hasBizInfo = academyName || ceoName || bizRegNo || academyRegNo || address || phone;

  return (
    <footer className="py-12 bg-zinc-50 border-t border-zinc-200">
      <div className="container max-w-5xl mx-auto px-4 text-center space-y-3">
        {hasBizInfo && (
          <div className="text-xs text-zinc-400 leading-relaxed space-y-0.5">
            {(academyName || ceoName) && (
              <p>
                {academyName}
                {academyName && ceoName && " · "}
                {ceoName && `대표 ${ceoName}`}
              </p>
            )}
            {(bizRegNo || academyRegNo) && (
              <p>
                {bizRegNo && `사업자등록번호 ${bizRegNo}`}
                {bizRegNo && academyRegNo && " · "}
                {academyRegNo && `학원등록번호 ${academyRegNo}`}
              </p>
            )}
            {address && <p>{address}</p>}
            {phone && <p>{phone}</p>}
          </div>
        )}
        <p className="text-sm text-zinc-400">© 2026 TeamDJ. All rights reserved.</p>
      </div>
    </footer>
  );
}
