# WAJENZI Public-Data Gap Closure Report

**Document status:** Draft v0.3 — public-reference data integration  
**Author:** Manus AI  
**Retrieval date:** 27 August 2026  
**Scope:** Kenya location, public construction references, compliance authorities, public procurement, and source governance

> **Important note:** This report closes data-availability gaps for ontology implementation. It does not make legal, tax, procurement, environmental, professional, or regulatory determinations. Official source status, licences, and applicability must be rechecked before production decisions.

## 1. Executive conclusion

The most useful public-data gaps can now be closed as **versioned reference layers** rather than as canonical operational truth. WAJENZI has actual seed data for 47 Admin-1 counties and 290 Admin-2 units from the IEBC-sourced HDX COD-AB release, 1,450 HDX ward records with DHIS2-compatible identifiers, 1,452 openly licensed geoBoundaries ADM3 ward features, 669 rows parsed from Kenya Gazette Notice No. 15341 of 2024, 98 construction-relevant PPRA sampled price-reference rows, and 16 curated KNBS construction-cost index observations.

The correct design is therefore not “fill the master registry with public data.” It is to create a **public-reference layer** with source, vintage, licence, hash, confidence, and status. Canonical identity is created only after matching and steward review. Public data can support geography, crosswalks, route discovery, compliance vocabulary, macro cost references, and historical procurement enrichment; it cannot provide current supplier inventory, negotiated prices, private project records, authenticated KYC/KYB, payment access, or legal ownership truth.

## 2. Gap status after public-data research

| Original gap | Status | Public data now available | What WAJENZI should do |
|---|---|---|---|
| County/sub-county geography | **Closed as reference baseline** | 47 Admin-1 and 290 Admin-2 features, pcodes, geometry, version/vintage, source metadata [1] | Load into `GeographicUnit` + `BoundaryVersion`; preserve `source_status=reference_baseline`. |
| Ward geography | **Partially closed** | 1,450 HDX/DHIS2-compatible ward polygons with UID/CUID/SCUID [2]; 1,452 geoBoundaries CC-BY ADM3 features [3] | Keep both source layers; create a versioned crosswalk. Do not call either one an unqualified current legal delimitation layer. |
| Ward crosswalk | **Operationally seeded, review remains** | 1,444 spatial representative-point matches, 6 normalized-name matches, 2 unmatched records | Accept high-confidence matches only after QA; route unmatched `Kachien'g` and `Shella` to manual review. |
| Divisions, locations, sub-locations | **Partially closed** | 669 parsed service-delivery records from Gazette Notice No. 15341 of 2024 [4] | Store as a distinct national-government service-delivery hierarchy; retain `activation_status=unconfirmed` and unresolved/ambiguous parent mappings. |
| Postal references | **Locator available; bulk layer missing** | Official PCK post-office locator and postcode definition [5] | Integrate a controlled locator adapter or licensed feed; do not infer postcode polygons. |
| Road network | **Open route substrate available; authoritative condition layer restricted** | Current OSM/Geofabrik Kenya extracts under ODbL [6]; KRB 2018/2023 road inventory and condition portal [7] | Use OSM for route discovery and KRB only with permission/consent; keep source-specific route and condition observations. |
| Parcel/property ownership | **Not closed** | No authorized public ownership feed was found in this pass | Obtain user-provided title/parcel evidence or an authorized land-information integration. |
| Building/project registration | **Workflow closed; project records missing** | NCA Building Code 2024 and project registration requirements [8] | Implement evidence/checklist workflow; do not scrape or infer private project registrations as canonical. |
| Environmental compliance | **Workflow closed; project applicability missing** | NEMA EIA/EA guidance and pre-commencement licence requirements [9] | Model project-specific `RuleApplicability`, assessment, licence, audit, expert, and evidence records. |
| Public procurement templates | **Reference catalogue closed** | PPRA Standard Tender Document families and revision/effective language [10] | Store document families and versions; do not treat archived templates as current requirements. |
| Historical suppliers and awards | **Historical enrichment available** | PPRA directs users to PPIP for awards, suppliers, and directors from FY 2018/19 onward [11] | Ingest only as historical award records; identity-match suppliers under stewardship. |
| Construction market reference prices | **Reference layer closed for sampled towns/items** | PPRA April 2026 guide: five towns, 11 categories; 98 parsed building-material/waterworks rows [12] | Store as `MarketReferenceObservation`; never overwrite live `ProductOffer`/`PriceObservation`. |
| Construction cost indices | **Macro reference closed** | KNBS CIPI Q2 2026 and detailed series [13] | Store `CostIndexSeries`/`CostIndexObservation` with Q4 2019=100 base; do not interpret as item-level price. |
| Supplier/facility/product sample data | **Not closed** | NCA public contractor search fields and PPIP history help with enrichment [14] [11], but no complete live supplier catalogue | Obtain supplier-authorized POS/catalogue/facility feeds and test canonicalization. |
| Tenant/access policy | **Not resolvable from public data** | None | Product-owner decision required before exposing prices, KYC, quotations, projects, and financial data. |
| Live inventory, quotes, tax/eTIMS, payment | **Not closed** | Public data is insufficient and/or authentication is required | Build authorized connectors and keep source-of-truth boundaries explicit. |

## 3. Actual data integrated into the workspace

| Asset | Records/coverage | Status |
|---|---:|---|
| `ken_admin_boundaries.geojson.zip` and `kenya_cod_ab_units.csv` | 338 units: 1 Admin-0, 47 Admin-1, 290 Admin-2 | Downloaded and normalized; SHA-256 recorded. |
| `kenya_wards_hdx.zip` and `kenya_hdx_wards_reference.csv` | 1,450 ward records; 1,448 nonempty UIDs and 2 blank UIDs preserved with deterministic GID fallback | Downloaded and normalized; blank source-ID quality issue retained. |
| `geoboundaries-KEN-ADM3.geojson` and `kenya_geoboundaries_adm3_reference.csv` | 1,452 ADM3 features; 1,442 polygons and 10 multipolygons | Downloaded and normalized under CC-BY 4.0 metadata. |
| `kenya_ward_crosswalk_geoboundaries_to_hdx.csv` | 1,452 mappings: 1,444 high spatial, 6 medium name, 2 unmatched | Derived crosswalk; manual review required for two unmatched names. |
| `kenya_gazette_2024_203_service_units_enriched.csv` | 669 service-delivery records: 125 sub-county rows, 59 division rows, 171 location rows, 314 sub-location rows | Parsed from Gazette Notice 15341; 638 direct Gazette-context parent rows, 12 matched-reference top proposals, 1 ambiguous, 18 unresolved. |
| `ppra_mrg_april_2026_construction_reference.csv` | 98 rows: 27 building materials and 71 waterworks | Parsed from official PPRA guide; sampled, indicative, KES, town-level. |
| `knbs_cipi_q2_2026_reference.csv` | 16 curated cost-index observations | Curated from official KNBS Q2 2026 PDF tables; macro reference only. |
| `public-data-source-manifest.json` | 15 source definitions | Machine-readable authority, vintage, licence, mapping, hash/caveat manifest. |

## 4. Ontology changes made

The ontology is now version **0.3.0**. New or formalized concepts include `PostalReference`, `Postcode`, `RoadInventoryObservation`, `RoadConditionObservation`, `ProcurementRegime`, `StandardDocumentFamily`, `StandardDocumentVersion`, `MarketReferenceGuide`, `MarketReferenceObservation`, `CostIndexSeries`, `CostIndexObservation`, `ProductClass`, `LabourClass`, `EquipmentClass`, `NCAProjectRegistration`, `NCAContractorRegistration`, `NCAPractisingLicence`, `EnvironmentalAssessment`, `EIALicence`, `EnvironmentalAudit`, `EnvironmentalManagementPlan`, `NEMAExpertCredential`, `ProcuringEntity`, `AwardedSupplier`, `TenderNotice`, `ProcurementAward`, `AwardLine`, `DirectorDisclosure`, `EIAReport`, and `ConsultationRecord`.

New predicates include `has_postcode`, `supports_route`, `has_road_observation`, `has_project_registration`, `registers_project`, `requires_environmental_assessment`, `has_eia_licence`, `has_environmental_audit`, `issued_by`, `has_standard_document`, `uses_procurement_regime`, `references`, `has_reference_observation`, `sampled_in`, `awards_contract`, `awarded_to`, `discloses`, and `has_award_line`.

The registry now has a dedicated `registry_schema_v03_public_data.sql` extension. It introduces `public_reference_source`, `public_reference_record`, `public_reference_geometry`, `public_reference_property`, `location_crosswalk`, `gazette_service_unit_reference`, `market_reference_observation`, `cost_index_observation`, and `procurement_award_reference`. These tables deliberately separate external facts from canonical WAJENZI entities.

## 5. Remaining gaps that public web data cannot safely close

Public web sources cannot provide a complete or authoritative solution for the tenant boundary, access policy, user-consent and data-subject rights, private project records, parcel ownership, live supplier inventory, negotiated quotations, supplier facilities not publicly registered, KRA/eTIMS authentication, payment-provider records, private KYC/KYB evidence, or current delivery promises. The Kenya Roads Board layer also requires reuse permission for commercial exploitation. The PCK locator is useful but does not constitute a downloadable national postcode polygon layer.

The Gazette parser intentionally leaves eighteen top-level service-delivery proposals without a supported county parent and one with an ambiguous reference parent. The two unmatched ward crosswalk names remain unresolved. These are not parser defects to be hidden; they are visible ontology-quality states that should be resolved through primary-source confirmation or manual stewardship.

## 6. Recommended build sequence

First, register the 15 source systems and load the reference tables. Second, expose Admin-0/Admin-1/Admin-2, ward, service-delivery, postal, and route data through version-aware queries. Third, allow a project site to resolve to multiple typed geographic memberships rather than one universal location. Fourth, load PPRA market references and KNBS indices into separate reference projections. Fifth, build supplier-authorized catalog and facility ingestion, where the canonical product/variant/offer model can be tested against actual records. Sixth, add NCA/NEMA/PPRA compliance workflows. Only after those controls pass should live quotations, orders, payments, or autonomous recommendations be enabled.

## References

[1]: https://data.humdata.org/dataset/cod-ab-ken "HDX Kenya - Subnational Administrative Boundaries"
[2]: https://data.humdata.org/dataset/administrative-wards-in-kenya-1450 "HDX Administrative Wards in Kenya 1450"
[3]: https://www.geoboundaries.org/api/current/gbOpen/KEN/ADM3/ "geoBoundaries API: Current Kenya ADM3"
[4]: https://new.kenyalaw.org/akn/ke/officialGazette/2024-11-22/203/eng@2024-11-22/source "Kenya Gazette Vol CXXVI No. 203, Gazette Notice No. 15341"
[5]: https://posta.co.ke/post-offices/ "Postal Corporation of Kenya Post Offices Locator"
[6]: https://download.geofabrik.de/africa/kenya.html "Geofabrik Download OpenStreetMap Data for Kenya"
[7]: https://maps.krb.go.ke/ "Kenya Roads Board Map Portal"
[8]: https://www.nca.go.ke/building-code "National Construction Authority: National Building Code 2024"
[9]: https://nema.go.ke/laws-and-guidelines/environmental-regulations-eia-ea/ "NEMA: Environmental Regulations (EIA/EA)"
[10]: https://ppra.go.ke/standard-tender-documents/ "PPRA: Standard Tender Documents"
[11]: https://ppra.go.ke/contract-awards/ "PPRA: Contract Awards and PPIP"
[12]: https://ppra.go.ke/mrg-april-2026/ "PPRA: Market Reference Guide April 2026"
[13]: https://www.knbs.or.ke/reports/construction-input-price-indices-for-second-quarter-2026/ "KNBS: Construction Input Price Indices for Second Quarter 2026"
[14]: https://www.nca.go.ke/registered-contractors "NCA: Search Registered Contractors"
