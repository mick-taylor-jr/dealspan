export type CitedDeal = {
  date: string;
  acquirer: string;
  target: string;
  industry: string;
  disclosed: string;
  band: string;
  citation: string;
};

export const CITED_DEALS: CitedDeal[] = [
  {
    date: '2023-07',
    acquirer: 'Limbach Holdings',
    target: 'ACME Industrial Piping',
    industry: 'Construction / mechanical services',
    disclosed: '$5.0 million enterprise value, all-cash; up to $2.5 million earn-outs extra',
    band: '$5–10M',
    citation:
      'https://www.limbachinc.com/news-events/press-releases/limbach-holdings-inc-acquires-chattanooga-tn-based-specialty-industrial-contractor-acme-industrial-piping-llc/',
  },
  {
    date: '2024-09',
    acquirer: 'AudioEye',
    target: 'ADA Site Compliance',
    industry: 'Software / IT services',
    disclosed: '$6.4 million fixed ($4.0 million cash + $2.4 million notes); earn-outs extra',
    band: '$5–10M',
    citation: 'https://www.sec.gov/Archives/edgar/data/1362190/000110465924103953/tm2423575d1_8k.htm',
  },
  {
    date: '2022-06',
    acquirer: 'Acme United',
    target: 'Safety Made (Live Safely Products)',
    industry: 'Manufacturing',
    disclosed: 'About $11 million, including $1.5 million contingent',
    band: '$10–25M',
    citation: 'https://www.sec.gov/Archives/edgar/data/2098/000156459022026244/acu-ex991_9.htm',
  },
  {
    date: '2023-10',
    acquirer: 'Climb Global Solutions',
    target: 'DataSolutions Holdings',
    industry: 'Distribution',
    disclosed: '$16.3 million (€15.4 million) at close; earn-out extra',
    band: '$10–25M',
    citation:
      'https://www.climbglobalsolutions.com/investors/news-events/press-releases/detail/214/climb-global-solutions-to-acquire-leading-ireland-and-uk-it',
  },
  {
    date: '2022-09',
    acquirer: 'Computer Task Group',
    target: 'Eleviant Technologies',
    industry: 'Software / IT services',
    disclosed: '$18.6 million ($17.4 million cash + $1.2 million stock)',
    band: '$10–25M',
    citation: 'https://www.sec.gov/Archives/edgar/data/23111/000095017022019054/ctg-20220929.htm',
  },
  {
    date: '2024-12',
    acquirer: 'Limbach Holdings',
    target: 'Consolidated Mechanical',
    industry: 'Construction / mechanical services',
    disclosed: '$23 million at close; up to $2 million earn-outs extra',
    band: '$10–25M',
    citation:
      'https://www.limbachinc.com/news-events/press-releases/limbach-holdings-acquires-consolidated-mechanical/',
  },
  {
    date: '2022-03',
    acquirer: 'RF Industries',
    target: 'Microlab/FXR LLC',
    industry: 'Manufacturing',
    disclosed: '$24.25 million agreed price; closed March 1, 2022',
    band: '$10–25M',
    citation: 'https://www.sec.gov/Archives/edgar/data/878828/000149315222007067/ex99-1.htm',
  },
  {
    date: '2024-02',
    acquirer: 'Shoe Carnival',
    target: "Rogan's Shoes",
    industry: 'Consumer / retail',
    disclosed: '$45 million cash, subject to adjustments',
    band: '$25–50M',
    citation:
      'https://investors.shoecarnival.com/news/news-details/2024/Shoe-Carnival-Acquires-Rogans-Shoes-and-Announces-Full-Year-Fiscal-2023-Preliminary-Results/default.aspx',
  },
];

export const THIN_SET_NOTE =
  'This set is thin: five of the eight closings are in the $10–25 million band, the $1–5 million band is empty, and there are no named rows for healthcare services, general business services, or standalone SaaS. No verified 2026 named closings are in this set. Disclosed prices are not normalized enterprise values, and none of them is applied to this earnings bridge.';
