import React from 'react';
import { ExternalLink, AlertTriangle, Info } from 'lucide-react';
import BaseModal from '@/components/shared/modals/BaseModal';
import { Button, InPageAlert } from '@/components/ui/landiq';
import { LANDIQ_THEME } from '@/components/ui/landiq/theme';

interface DataSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DataSourceLink {
  name: string;
  url: string;
}

interface CheckInfo {
  name: string;
  description: string;
  calculation: string;
  dataSources: DataSourceLink[];
}

const ELIGIBILITY_CHECKS: CheckInfo[] = [
  {
    name: 'Site Type',
    description: 'Identifies whether the lot is a battle-axe configuration (narrow access handle leading to a wider rear portion).',
    calculation: 'Grid-based width sampling across the lot boundary. A lot is classified as battle-axe if a narrow section (< 8m) is present across multiple samples (to avoid notch/sliver artefacts) AND the width distribution indicates a handle+body shape (e.g. p10/p60 width ratio below 40% with a wider body).',
    dataSources: [],
  },
  {
    name: 'Residential Zone',
    description: 'Verifies the site is within an eligible residential zone (R1, R2, R3, or R4). All Pattern Book housing types, including low-rise patterns (terraces, semi-detached, row homes, manor homes), are permitted in R1–R4 zones under the Housing SEPP.',
    calculation: 'Direct zone code comparison from the NSW Planning Portal LEP data.',
    dataSources: [{
      name: 'NSW Planning Portal - Land Zoning',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/19'
    }]
  },
  {
    name: 'Site Dimensions (Area, Width, Length)',
    description: 'Checks that the lot meets minimum area, width, and length requirements for each pattern variant.',
    calculation: 'Site area is calculated using Turf.js geodesic area calculation. Width is estimated as the narrowest cross-section perpendicular to the lot\'s primary orientation. Length is estimated from the bounding box and area/width calculation.',
    dataSources: [{
      name: 'NSW Spatial Services - Lot Boundaries',
      url: 'https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Land_Parcel_Property_Theme/FeatureServer/8'
    }]
  },
  {
    name: 'Bushfire-Prone Land',
    description: 'Sites classified as bushfire-prone land are excluded from Pattern Book development.',
    calculation: 'Spatial intersection with the NSW Planning Portal Bushfire Prone Land layer.',
    dataSources: [{
      name: 'NSW Planning Portal - Bushfire Prone Land',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Hazard/MapServer/229'
    }]
  },
  {
    name: 'Flood-Prone Land',
    description: 'Sites within designated flood planning areas are excluded from Pattern Book development.',
    calculation: 'Spatial intersection with the NSW 1% AEP Flood Extents layer.',
    dataSources: [{
      name: 'NSW Flood Data - 1% AEP Flood Extents',
      url: 'https://portal.data.nsw.gov.au/arcgis/rest/services/Hosted/nsw_1aep_flood_extents/FeatureServer/0'
    }]
  },
  {
    name: 'Contaminated Land',
    description: 'Sites listed on the NSW EPA Contaminated Land Register or with known contamination issues are excluded.',
    calculation: 'Spatial intersection with the NSW EPA Contaminated Land Notified Sites layer.',
    dataSources: [{
      name: 'NSW EPA - Contaminated Land Notified Sites',
      url: 'https://mapprod2.environment.nsw.gov.au/arcgis/rest/services/EPA/Contaminated_land_notified_sites/MapServer/0'
    }]
  },
  {
    name: 'Heritage Significance',
    description: 'Sites with state heritage items, local heritage items, or within heritage conservation areas may be excluded depending on the pattern type.',
    calculation: 'Spatial intersection with NSW Planning Portal heritage layers. Different patterns have different heritage exclusion rules.',
    dataSources: [{
      name: 'NSW Planning Portal - Heritage',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/0'
    }]
  },
  {
    name: 'Aircraft Noise (ANEF)',
    description: 'Mid-rise patterns (residential flat buildings) are not permitted on land within ANEF 25 or higher noise contours.',
    calculation: 'Spatial intersection with ANEF contour layers. Sites with ANEF >= 25 are excluded for mid-rise development.',
    dataSources: [
      {
        name: 'NSW Planning Portal - Aircraft Noise ANEF',
        url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_SEPP/MapServer/280'
      },
      {
        name: 'Randwick Council - Aircraft Noise ANEF 2039',
        url: 'https://mapservices.randwick.nsw.gov.au/arcgis/rest/services/intPlanning/AircraftNoiseANEF2039/MapServer/0'
      }
    ]
  },
  {
    name: 'FSR Compliance',
    description: 'Verifies that the pattern\'s maximum Floor Space Ratio does not exceed the applicable LEP or SEPP controls.',
    calculation: 'Compares pattern FSR against the site\'s LEP FSR control and applicable LMR/TOD policy FSR. LMR and TOD policies may provide increased FSR allowances.',
    dataSources: [{
      name: 'NSW Planning Portal - Floor Space Ratio',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/11'
    }]
  },
  {
    name: 'Height of Building (HOB) Compliance',
    description: 'Verifies that the pattern\'s maximum building height does not exceed the applicable LEP or SEPP controls.',
    calculation: 'Compares pattern height against the site\'s LEP HOB control and applicable LMR/TOD policy height limits.',
    dataSources: [{
      name: 'NSW Planning Portal - Height of Buildings',
      url: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/ePlanning/Planning_Portal_Principal_Planning/MapServer/14'
    }]
  },
  {
    name: 'Policy Area (LMR/TOD)',
    description: 'Pattern Book development must be located within a Low Mid-Rise (LMR) Housing area or Transport Oriented Development (TOD) area.',
    calculation: 'Spatial intersection with LMR and TOD catchment layers. LMR areas are based on proximity to rail stations and town centres. TOD areas are within 400m of specified transport nodes.',
    dataSources: [{
      name: 'NSW DPHI - Low Mid-Rise Housing Areas',
      url: 'https://spatialportalarcgis.dpie.nsw.gov.au/sarcgis/rest/services/LMR/LMR/MapServer'
    }]
  },
  {
    name: 'Slope / Crossfall',
    description: 'Some patterns have maximum slope constraints to ensure buildability and accessibility compliance.',
    calculation: 'Site crossfall is calculated using elevation contour data, measuring the maximum elevation difference across the lot.',
    dataSources: [{
      name: 'NSW Spatial Services - Elevation Contours',
      url: 'https://spatial.industry.nsw.gov.au/arcgis/rest/services/PUBLIC/Contours/MapServer/0'
    }]
  }
];

const NOT_YET_IMPLEMENTED = [
  'Coastal Hazard Areas',
  'Coastal Foreshore Areas',
  'Unsewered Land',
  'Land with Registered Easements',
  'Dangerous Goods Pipeline Proximity',
  'Coastal Wetlands / Littoral Rainforest'
];

const DataSourcesModal: React.FC<DataSourcesModalProps> = ({ isOpen, onClose }) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Data Sources & Methodology"
      size="large"
      closeOnBackdrop={true}
      closeOnEscape={true}
      showCloseButton={true}
    >
      <div className="p-6 space-y-6 min-w-0">
        <div className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: LANDIQ_THEME.colors.info.light }}>
          <Info size={20} style={{ color: LANDIQ_THEME.colors.info.dark, flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-sm" style={{ color: LANDIQ_THEME.colors.text.dark }}>
              Pattern Book eligibility is assessed under the{' '}
              <a
                href="https://legislation.nsw.gov.au/view/html/inforce/current/epi-2008-0572#pt.3BA"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline"
                style={{ color: LANDIQ_THEME.colors.brand.supplementary }}
              >
                Pattern Book Development Code 2025
                <ExternalLink className="inline w-3 h-3 ml-1" />
              </a>
              {' '}for low-rise patterns and{' '}
              <a
                href="https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0714#ch.7"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline"
                style={{ color: LANDIQ_THEME.colors.brand.supplementary }}
              >
                Chapter 7 Pattern Book Development in SEPP (Housing) 2021
                <ExternalLink className="inline w-3 h-3 ml-1" />
              </a>
              {' '}for mid-rise patterns.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: LANDIQ_THEME.colors.text.dark }}>
            Eligibility Checks
          </h3>
          <div className="space-y-3">
            {ELIGIBILITY_CHECKS.map((check) => (
              <div
                key={check.name}
                className="rounded-lg p-4 transition-colors"
                style={{ backgroundColor: LANDIQ_THEME.colors.greys.offWhite, border: `1px solid ${LANDIQ_THEME.colors.greys.grey03}` }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold mb-2" style={{ color: LANDIQ_THEME.colors.text.dark }}>
                    {check.name}
                  </div>
                  <p className="text-sm mb-2" style={{ color: LANDIQ_THEME.colors.text.muted }}>
                    {check.description}
                  </p>
                  <div className="text-xs mb-2 p-2 rounded" style={{ backgroundColor: LANDIQ_THEME.colors.greys.white, color: LANDIQ_THEME.colors.text.muted }}>
                    <span className="font-medium" style={{ color: LANDIQ_THEME.colors.text.dark }}>Calculation: </span>
                    {check.calculation}
                  </div>
                  {check.dataSources.length > 0 && (
                    <div className="text-xs flex flex-col gap-1">
                      {check.dataSources.map((source) => (
                        <a
                          key={`${check.name}-${source.name}`}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:underline"
                          style={{ color: LANDIQ_THEME.colors.brand.supplementary }}
                        >
                          <span>Data: {source.name}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: LANDIQ_THEME.colors.text.dark }}>
            <AlertTriangle size={18} style={{ color: LANDIQ_THEME.colors.status.warning }} />
            Checks Not Yet Implemented
          </h3>
          <div className="rounded-lg p-4" style={{ backgroundColor: LANDIQ_THEME.colors.status.warning + '15', border: `1px solid ${LANDIQ_THEME.colors.status.warning}` }}>
            <p className="text-sm mb-3" style={{ color: LANDIQ_THEME.colors.text.dark }}>
              The following constraints are specified in the legislation but are not yet automatically tested in this analysis. These require manual verification:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NOT_YET_IMPLEMENTED.map((item) => (
                <li key={item} className="text-sm flex items-center gap-2" style={{ color: LANDIQ_THEME.colors.text.muted }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: LANDIQ_THEME.colors.status.warning, flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <InPageAlert type="warning">
          <span className="font-semibold">Important Disclaimer:</span> This analysis provides indicative guidance only and should not be relied upon as definitive planning advice. Third-party validation by a qualified town planner or building professional is highly recommended before proceeding with any development application. Data sources are updated periodically and may not reflect the most current planning controls.
        </InPageAlert>

        <div className="flex justify-end pt-4" style={{ borderTop: `1px solid ${LANDIQ_THEME.colors.greys.grey03}` }}>
          <Button onClick={onClose} variant="primary">
            Close
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default DataSourcesModal;
