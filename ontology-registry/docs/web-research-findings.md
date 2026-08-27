# WAJENZI web research findings

## Source 1 — Government Advertising Agency: new administrative units

URL: https://gaa.go.ke/state-sets-1105-new-administrative-units-boost-service-delivery

The Government Advertising Agency page, dated 26 March 2025, states that the Government established 1,105 administrative units: 24 new sub-counties, 88 divisions, 318 locations, and 675 sub-locations. It says the units were to be operationalized during FY 2024/25 and that the Ministry of Interior was establishing a formal policy for the process. The ontology implication is that these are a distinct national-government service-delivery hierarchy with status/effective-date fields; they must not be merged into electoral, statistical, county, or postal units.

Evidence status: official government communication; currentness and operational status should still be refreshed from the Ministry of Interior register or gazette before treating a unit as active.

## Source 2 — HDX Administrative Wards in Kenya 1450

URL: https://data.humdata.org/dataset/administrative-wards-in-kenya-1450

HDX describes a public shapefile dataset of 1,450 Kenyan wards, with DHIS2 identifiers for wards, counties, and sub-counties. It reports a time period of 31 March 2016, modification on 12 April 2019, American Red Cross as contributor/source, methodology as census, and CC BY licensing. The page says the data was abstracted from National Land Commission/IEBC and Survey of Kenya sources, cleaned for topology, and verified with county teams in more than 20 counties.

Ontology integration: usable as a versioned ward baseline with `source_system=HDX/ARC`, `vintage=2016`, `modified_at=2019-04-12`, `license=CC-BY`, and quality flags such as `historical`, `crosswalk_baseline`, and `not_current_legal_boundary`. It should not replace current IEBC delimitation or official county boundary material.

## Source 3 — Kenya National Bureau of Statistics 2019 KPHC

URL: https://www.knbs.or.ke/2019-kenya-population-and-housing-census-reports/

KNBS states that the 2019 Kenya Population and Housing Census Volume II covers the distribution of population for county, sub-county, division, location, and sub-location units, including households, land area, density, and rural/urban residence. Volume III covers county and sub-county administrative units by age and sex. These records should be integrated as a distinct statistical reference hierarchy with census vintage 2019, not treated as a current legal or operational boundary layer.

## Source 4 — Kenya Law Gazette Notice No. 15341 / Gazette Vol. CXXVI No. 203

URL: https://new.kenyalaw.org/akn/ke/officialGazette/2024-11-22/203/eng@2024-11-22/source

The Kenya Law source triggered download of `Kenya Gazette Vol CXXVI No 203.pdf` to `/home/ubuntu/Downloads/`. This will be parsed locally as the legal/status source for proposed national-government administrative units. The ontology will store its notice date, gazette identifier, unit type, name, parent references, status, and effective/source metadata separately from KNBS statistical and HDX/IEBC baseline layers.

## Source 5 — Postal Corporation of Kenya

URLs: https://posta.co.ke/post-offices/ and https://posta.co.ke/services/services/

PCK's official post-office page provides a locator interface. Its official Mail Services page says postcodes identify individual post offices by distinct codes and that the postal network is divided into regions and offices with predetermined prefixes and digits. It describes a network of more than 600 post offices. The public pages expose a dynamic locator but not a national downloadable postcode polygon layer.

Ontology integration: create `PostOffice` and `PostalReference` records with postcode, post-office name, operator, address/point, source URL, retrieval timestamp, and `postal_geometry_status=point_or_reference_only` unless an authorized polygon feed is obtained. Do not treat a postcode as a county, ward, service-delivery unit, or delivery zone.

## Source 6 — Kenya Roads Board Map Portal

URL: https://maps.krb.go.ke/

KRB states that its maps are based on national Roads Inventory and Conditions surveys from 2023 and 2018. The portal exposes road-network classification, condition, surface type, capital-road projects, rural-access, and a proposed road register 2025. It says national boundaries were sourced from Survey of Kenya, county boundaries from IEBC, and national parks/reserves from KWS, while warning that the portal is not the authority on boundary delimitation. Its terms state that KRB content is copyrighted, use is limited to the consented purpose, transfer/commercial exploitation is restricted, and source attribution is required.

Ontology integration: create a `KRB Road Inventory` source layer with survey vintage, road classification, surface, condition, restriction, geometry, provenance, and licence/consent metadata. Treat it as a verified enrichment layer only where reuse permission allows; do not redistribute it commercially without consent.

## Source 7 — Geofabrik Kenya OpenStreetMap extract

URL: https://download.geofabrik.de/africa/kenya.html

Geofabrik offers current Kenya OSM extracts in PBF, Shapefile, and GeoPackage formats, plus updates and auxiliary files. At retrieval time the PBF contained OSM data through 26 August 2026 and was last modified about one hour earlier. The page identifies OSM contributors as the data source, Geofabrik as processor, and ODbL 1.0 as the licence. It also notes that the public extracts omit contributor user IDs and changeset IDs.

Ontology integration: use OSM/Geofabrik as the current route and feature-discovery substrate with extract timestamp, ODbL attribution, source hash, and update job. It is suitable for `RoadSegment`, address/POI discovery, and route-network preparation, but should be marked coverage-variable and not treated as a legal boundary or authoritative delivery promise.

## Source 8 — National Construction Authority: Building Code 2024

URL: https://www.nca.go.ke/building-code

NCA states that the National Building Code 2024 was published as Legal Notice No. 47 on 1 March 2024 and repealed the 1968 Local Government building by-laws. The official page provides the full code and topic-specific documents for building elements, materials/construction, services, structural design, safety, quality/wellness, and inspection/maintenance/demolition.

Ontology integration: seed `Standard`/`Rule` records with `source_authority=NCA`, `edition=2024`, `legal_notice=47`, `published_at=2024-03-01`, topic references, source URLs, and effective/supersession metadata. Keep the full document as a versioned document asset and treat AI interpretations as derived outputs.

## Source 9 — National Construction Authority: Project Registration

URL: https://www.nca.go.ke/project-registration

NCA states that public and private construction works, contracts, and projects are to be registered; the owner/developer applies within thirty days after award to an NCA-registered contractor. The page lists contractor/subcontractor registration and current practising licences, registered professional consultants and licences, approved architectural/structural drawings, county physical-planning approvals/PPA2, conditional NEMA/EPRA/WRA/KCAA approvals, signed BOQ summary, developer KRA PIN, signed contract/tender, and consultant supervision commitments.

Ontology integration: create a typed `NCAProjectRegistration` workflow linked to `Project`, `Owner/Developer` party role, contractor/subcontractor credentials, professional registrations, drawings, approvals, BOQ, KRA identity, contract, supervision commitments, evidence, status, and dates. This is a concrete closure of the prior gap around NCA compliance structure.

## Source 10 — National Environment Management Authority (NEMA)

URL: https://nema.go.ke/laws-and-guidelines/environmental-regulations-eia-ea/

NEMA states that EIA is a critical examination of project environmental effects, must be conducted by a NEMA-registered and licensed expert, and must occur before project commencement. It states that a proponent should be issued an EIA licence before commencement. For ongoing projects, it describes environmental audit as periodic/objective documentation and evaluation against the approved environmental management plan, with qualified/authorized experts or inspectors.

Ontology integration: model `EnvironmentalAssessment`, `EIAReport`, `EIALicence`, `EnvironmentalAudit`, `EnvironmentalManagementPlan`, `NEMAExpertCredential`, `ConsultationRecord`, and `RuleApplicability` as separate records linked to Project/Site/Rule/Evidence with version, status, effective dates, issuer, and reviewer.

## Source 11 — Public Procurement Regulatory Authority (PPRA)

URL: https://ppra.go.ke/standard-tender-documents/

PPRA is the official source for Kenya standard tender documents and public-procurement forms. The exact list and current revision metadata should be captured from the page/download catalogue and refreshed over time.

Ontology integration: create `ProcurementRegime`, `StandardDocumentFamily`, `StandardDocumentVersion`, `Tender`, `Evaluation`, `Award`, `Approval`, `InspectionAcceptanceCommittee`, and `ProcurementRecord` entities. Link public projects to the applicable family/version, procurement method, approval route, and evidence; never treat an archived template as a current legal requirement.

## Source 12 — NCA Registered Contractors Search

URL: https://www.nca.go.ke/registered-contractors

NCA exposes a public search with fields for Company Name, Registration Number, Category, County, License Status, and Certificate Status. The page also links to registered construction-worker searches and registered-project searches.

Ontology integration: seed or enrich `Organization`, `OrganizationRole=contractor`, `NCAContractorRegistration`, `NCAPractisingLicence`, `ConstructionWorkerCredential`, and `ProjectRegistration` records. Preserve query timestamp and source URL; a public search result is a verification observation, not a permanent current status.

## Source 13 — PPRA Contract Awards and PPIP

URL: https://ppra.go.ke/contract-awards/

PPRA states that the Public Procurement Information Portal (PPIP) was implemented to publish procurement information including tender notices, contracts awarded, suppliers, and directors, and directs users to PPIP for awards from 2018/19 onward. PPRA also provides older 2017/18 award files.

Ontology integration: model `ProcurementAward`, `ProcuringEntity`, `AwardedSupplier`, `DirectorDisclosure`, `TenderNotice`, and `AwardLine` as historical enrichment records linked to organizations and projects. An award must not be treated as proof of current stock, current facility, current price, or delivery capability.

## Source 14 — HDX Kenya COD-AB administrative boundaries

URL: https://data.humdata.org/dataset/cod-ab-ken

HDX describes Kenya administrative level 0–2 boundaries, structured as 47 Admin-1 units and 290 Admin-2 units. The dataset source is identified as IEBC. The page records 31 October 2019 as the use period, a review for accuracy/completeness on 28 January 2025, and resource files modified on 14 August 2026. Public downloads are available as Geodatabase, Shapefile, GeoJSON, and XLSX; the GeoJSON resource ID is `674ea496-5451-4312-bcab-8aa95fa3f36c`. HDX presents it as a humanitarian reference dataset, so the ontology must store it as a versioned baseline, not an unqualified legal boundary truth.

Ontology integration: this is now a current downloadable baseline for `GeographicUnit` Admin-1/Admin-2, with `source=IEBC via HDX COD-AB`, `reviewed_at=2025-01-28`, `resource_modified_at=2026-08-14`, and source/licence metadata. Retain explicit `boundary_source_status=reference_baseline` and require primary-source validation for legal delimitation.

## Source 15 — geoBoundaries (William & Mary)

URLs: https://www.geoboundaries.org/countryDownloads.html and https://www.geoboundaries.org/api.html

geoBoundaries states that its open country files are licensed CC-BY 4.0 with attribution required. Its API supports current `gbOpen`, `gbHumanitarian`, and `gbAuthoritative` releases for ADM0 through ADM5 and returns boundary ID, year represented, source, original licence, licence source, source-update date, build date, unit count, and download URLs. The API page cautions that gbAuthoritative files may not be commercially usable and that the API uptime is not guaranteed.

Ontology integration: use `gbOpen` only as an openly licensed supplementary comparison/crosswalk layer, storing release type, boundary ID, boundary type, represented year, source, licence, license source, build date, and download hash. Do not silently replace IEBC/official legal boundaries with geoBoundaries.

## Source 16 — KNBS Construction Input Price Indices Q2 2026

URLs: https://www.knbs.or.ke/button/construction-input-pi/ and https://www.knbs.or.ke/reports/construction-input-price-indices-for-second-quarter-2026/

The latest public KNBS CIPI page lists a Second Quarter 2026 release. The official PDF states that CIPI measures price changes in construction inputs consumed/used in construction, with inputs classified into materials, labour, equipment, and transport, based on quarterly prices from a representative sample of construction-material outlets. It reports CIPI of 126.36 in Q2 2026 versus 119.51 in Q1 2026, a 5.73% quarter-on-quarter increase, with base period Q4 2019=100. It also publishes detailed weighted series for individual materials and for building and civil-engineering cost indices.

Ontology integration: add a source-level `CostIndexSeries`/`CostReferenceObservation` layer linked to `CostCode`/`ProductClass`/`LabourClass`/`EquipmentClass`, with period, weight, index value, base period, source document, and publication date. These are macro reference indices, not supplier-specific prices, not quotes, and not a substitute for location-specific `PriceObservation` records.

## Source 17 — PPRA Market Reference Guide April 2026

URL: https://ppra.go.ke/mrg-april-2026/

PPRA states that under Section 54(3) of the Public Procurement and Asset Disposal Act 2015 it issues a quarterly market-price reference guide. The April 2026 guide is based on a survey conducted 16 February–8 March 2026 in Embu, Kisumu, Nakuru, Mombasa, and Nairobi. Categories include Building Materials, Waterworks Materials, Petroleum Products, Electrical Appliances, and other common-user categories.

Ontology integration: model the guide as `MarketReferenceGuide` with `survey_window`, sampled towns, category, item, unit, price range/statistic, currency, publication date, and source document. These observations are sampled public-procurement references, not universal market prices, supplier offers, or delivery-zone prices.
