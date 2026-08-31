'use client';

const CERTIFICATE_LINKS = [
  { place: '1st Place', url: 'https://canva.link/nfl1stplacesfghhytreawarthjytriurertyu65yu654rtyuy' },
  { place: '2nd Place', url: 'https://canva.link/nfl2ndplace5464364dfrfrf58585hg855b85g95ht5rt5hr4' },
  { place: '3rd Place', url: 'https://canva.link/nfl3rdplace12345675675675hgfhjtrhthhhr65gt6yhyty6y' },
];

interface CertificatesModalProps {
  onClose: () => void;
}

export function CertificatesModal({ onClose }: CertificatesModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Certificates</h2>
        <p className="text-gray-600 mb-6">Open a certificate design to edit or print.</p>

        <div className="flex flex-col gap-3">
          {CERTIFICATE_LINKS.map(({ place, url }) => (
            <a
              key={place}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-center"
            >
              {place}
            </a>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}
