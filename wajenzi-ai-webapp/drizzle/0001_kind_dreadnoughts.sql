CREATE TABLE `audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wajenziId` varchar(40) NOT NULL,
	`workspaceId` int NOT NULL,
	`actorUserId` int,
	`eventType` varchar(160) NOT NULL,
	`subjectEntityId` int,
	`relatedEntityIds` json,
	`beforeState` json,
	`afterState` json,
	`rationale` text,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `audit_events_wajenziId_unique` UNIQUE(`wajenziId`)
);
--> statement-breakpoint
CREATE TABLE `availability_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`offerId` int NOT NULL,
	`quantity` decimal(16,3),
	`unitOfMeasure` varchar(64) NOT NULL,
	`availabilityState` enum('available','reserved','allocated','in_transit','damaged','unavailable') NOT NULL,
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	`freshnessUntil` timestamp,
	`verificationStatus` enum('unverified','pending','verified','expired','rejected') NOT NULL DEFAULT 'unverified',
	`verifiedAt` timestamp,
	`evidenceId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `availability_observations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `canonical_match_candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierSubmissionId` int NOT NULL,
	`candidateEntityId` int NOT NULL,
	`matchMethod` varchar(120) NOT NULL,
	`confidence` decimal(5,4) NOT NULL,
	`evidence` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `canonical_match_candidates_id` PRIMARY KEY(`id`),
	CONSTRAINT `match_candidate_unique` UNIQUE(`supplierSubmissionId`,`candidateEntityId`)
);
--> statement-breakpoint
CREATE TABLE `canonicalization_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierSubmissionId` int NOT NULL,
	`outcome` enum('matched_existing_product','matched_existing_variant','review_required','new_canonical_product','new_canonical_variant','rejected') NOT NULL,
	`resolvedEntityId` int,
	`rationale` text NOT NULL,
	`decidedByUserId` int,
	`decidedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `canonicalization_decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `controlled_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vocabularyId` int NOT NULL,
	`code` varchar(160) NOT NULL,
	`label` varchar(255) NOT NULL,
	`parentValueId` int,
	`status` enum('active','deprecated','draft') NOT NULL DEFAULT 'active',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `controlled_values_id` PRIMARY KEY(`id`),
	CONSTRAINT `controlled_value_unique` UNIQUE(`vocabularyId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `controlled_vocabularies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(120) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isSystemManaged` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `controlled_vocabularies_id` PRIMARY KEY(`id`),
	CONSTRAINT `controlled_vocabularies_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `entity_relations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`subjectEntityId` int NOT NULL,
	`predicate` varchar(160) NOT NULL,
	`objectEntityId` int NOT NULL,
	`status` enum('asserted','verified','retracted','superseded') NOT NULL DEFAULT 'asserted',
	`provenance` json,
	`validFrom` timestamp NOT NULL DEFAULT (now()),
	`validTo` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `entity_relations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`fileAssetId` int,
	`evidenceType` varchar(120) NOT NULL,
	`statement` text,
	`sourceSystem` varchar(120),
	`capturedAt` timestamp,
	`expiresAt` timestamp,
	`verificationStatus` enum('unverified','pending','verified','expired','rejected') NOT NULL DEFAULT 'unverified',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`evidenceId` int NOT NULL,
	`subjectEntityId` int NOT NULL,
	`assertionType` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `evidence_link_unique` UNIQUE(`evidenceId`,`subjectEntityId`,`assertionType`)
);
--> statement-breakpoint
CREATE TABLE `external_identifiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityId` int NOT NULL,
	`namespace` varchar(120) NOT NULL,
	`value` varchar(500) NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `external_identifiers_id` PRIMARY KEY(`id`),
	CONSTRAINT `external_identifier_unique` UNIQUE(`namespace`,`value`)
);
--> statement-breakpoint
CREATE TABLE `facilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityId` int NOT NULL,
	`organizationEntityId` int NOT NULL,
	`facilityType` enum('store','warehouse','yard','plant','office','other') NOT NULL,
	`addressRaw` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`verificationStatus` enum('unverified','pending','verified','expired') NOT NULL DEFAULT 'unverified',
	`coverage` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `facilities_id` PRIMARY KEY(`id`),
	CONSTRAINT `facilities_entityId_unique` UNIQUE(`entityId`)
);
--> statement-breakpoint
CREATE TABLE `file_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`wajenziId` varchar(40) NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`storageUrl` varchar(1000) NOT NULL,
	`originalFilename` varchar(500) NOT NULL,
	`mimeType` varchar(255) NOT NULL,
	`byteSize` bigint NOT NULL,
	`assetKind` enum('supplier_catalogue','product_image','datasheet','certificate','csv_import','verification_evidence','other') NOT NULL,
	`uploadedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `file_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `file_assets_wajenziId_unique` UNIQUE(`wajenziId`),
	CONSTRAINT `file_assets_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `import_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`wajenziId` varchar(40) NOT NULL,
	`sourceSystem` varchar(120) NOT NULL,
	`sourceHash` varchar(128) NOT NULL,
	`fileAssetId` int,
	`importType` enum('master_catalogue','supplier_catalogue','location_reference','price_reference','other') NOT NULL,
	`status` enum('received','validated','processing','completed','failed','rejected') NOT NULL DEFAULT 'received',
	`receivedRows` int NOT NULL DEFAULT 0,
	`processedRows` int NOT NULL DEFAULT 0,
	`rejectedRows` int NOT NULL DEFAULT 0,
	`report` json,
	`initiatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `import_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `import_batches_wajenziId_unique` UNIQUE(`wajenziId`),
	CONSTRAINT `import_batch_hash_unique` UNIQUE(`workspaceId`,`sourceSystem`,`sourceHash`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityId` int NOT NULL,
	`organizationKind` enum('supplier','manufacturer','contractor','distributor','professional_firm','client','public_authority','other') NOT NULL,
	`legalName` varchar(500),
	`verificationStatus` enum('unverified','pending','verified','rejected','expired') NOT NULL DEFAULT 'unverified',
	`countryCode` varchar(3) NOT NULL DEFAULT 'KEN',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_entityId_unique` UNIQUE(`entityId`)
);
--> statement-breakpoint
CREATE TABLE `price_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`offerId` int NOT NULL,
	`amount` decimal(16,2) NOT NULL,
	`currencyCode` varchar(3) NOT NULL,
	`unitOfMeasure` varchar(64) NOT NULL,
	`taxBasis` enum('inclusive','exclusive','unknown') NOT NULL DEFAULT 'unknown',
	`normalizedAmount` decimal(16,4),
	`normalizedUnit` varchar(64),
	`normalizationMethod` varchar(255),
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	`validUntil` timestamp,
	`verificationStatus` enum('unverified','pending','verified','expired','rejected') NOT NULL DEFAULT 'unverified',
	`evidenceId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_observations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(160) NOT NULL,
	`name` varchar(255) NOT NULL,
	`parentId` int,
	`description` text,
	`status` enum('active','deprecated','draft') NOT NULL DEFAULT 'active',
	CONSTRAINT `product_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_categories_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `product_offers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`wajenziId` varchar(40) NOT NULL,
	`supplierOrganizationEntityId` int NOT NULL,
	`facilityId` int NOT NULL,
	`canonicalProductEntityId` int,
	`canonicalVariantEntityId` int,
	`supplierSku` varchar(255),
	`commercialName` varchar(500) NOT NULL,
	`leadTimeHours` int,
	`minimumOrderQuantity` decimal(14,3),
	`orderUnit` varchar(64),
	`commercialTerms` json,
	`status` enum('draft','active','suspended','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_offers_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_offers_wajenziId_unique` UNIQUE(`wajenziId`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityId` int NOT NULL,
	`productId` int NOT NULL,
	`variantLabel` varchar(500) NOT NULL,
	`sku` varchar(255),
	`unitOfMeasure` varchar(64),
	`packSize` varchar(128),
	`attributes` json,
	`status` enum('active','draft','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_variants_entityId_unique` UNIQUE(`entityId`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityId` int NOT NULL,
	`categoryId` int,
	`productKind` enum('simple','family') NOT NULL,
	`brand` varchar(255),
	`manufacturerOrganizationEntityId` int,
	`unitOfMeasure` varchar(64),
	`packSize` varchar(128),
	`material` varchar(255),
	`finish` varchar(255),
	`attributes` json,
	`classifications` json,
	`searchTerms` text,
	`verificationStatus` enum('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_entityId_unique` UNIQUE(`entityId`)
);
--> statement-breakpoint
CREATE TABLE `project_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`workspaceMemberId` int NOT NULL,
	`projectRole` varchar(120) NOT NULL,
	`status` enum('invited','active','suspended','ended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_member_unique` UNIQUE(`projectId`,`workspaceMemberId`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`ownerOrganizationEntityId` int,
	`projectType` varchar(120) NOT NULL,
	`status` enum('draft','active','paused','completed','cancelled','archived') NOT NULL DEFAULT 'draft',
	`plannedStartAt` timestamp,
	`plannedEndAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_entityId_unique` UNIQUE(`entityId`)
);
--> statement-breakpoint
CREATE TABLE `registry_entities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wajenziId` varchar(40) NOT NULL,
	`workspaceId` int,
	`entityType` enum('organization','person','user_account','project','site','facility','product','product_variant','document','boq_item','purchase_order','event','evidence') NOT NULL,
	`canonicalName` varchar(500) NOT NULL,
	`lifecycleStatus` enum('draft','active','pending_review','verified','suspended','merged','archived') NOT NULL DEFAULT 'draft',
	`mergedIntoEntityId` int,
	`sourceSystem` varchar(120),
	`sourceRecordKey` varchar(255),
	`ownerOrganizationEntityId` int,
	`attributes` json,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `registry_entities_id` PRIMARY KEY(`id`),
	CONSTRAINT `registry_entities_wajenziId_unique` UNIQUE(`wajenziId`),
	CONSTRAINT `registry_entity_source_unique` UNIQUE(`workspaceId`,`entityType`,`sourceSystem`,`sourceRecordKey`)
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityId` int NOT NULL,
	`projectId` int,
	`addressRaw` text,
	`addressNormalized` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`locationConfidence` decimal(5,4),
	`status` enum('draft','active','inactive','archived') NOT NULL DEFAULT 'active',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sites_id` PRIMARY KEY(`id`),
	CONSTRAINT `sites_entityId_unique` UNIQUE(`entityId`)
);
--> statement-breakpoint
CREATE TABLE `source_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importBatchId` int NOT NULL,
	`sourceRowKey` varchar(255) NOT NULL,
	`sourcePayload` json NOT NULL,
	`sourceHash` varchar(128) NOT NULL,
	`mappedEntityId` int,
	`processingStatus` enum('received','normalized','matched','review_required','rejected','created') NOT NULL DEFAULT 'received',
	`qualityFlags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `source_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `source_record_batch_row_unique` UNIQUE(`importBatchId`,`sourceRowKey`)
);
--> statement-breakpoint
CREATE TABLE `supplier_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`wajenziId` varchar(40) NOT NULL,
	`supplierOrganizationEntityId` int NOT NULL,
	`sourceRecordId` int,
	`supplierSku` varchar(255),
	`submittedName` varchar(500) NOT NULL,
	`submittedAttributes` json,
	`status` enum('received','matching','matched_existing_product','matched_existing_variant','review_required','approved_new_canonical','rejected') NOT NULL DEFAULT 'received',
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `supplier_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_submissions_wajenziId_unique` UNIQUE(`wajenziId`)
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`userId` int NOT NULL,
	`workspaceRole` enum('registry_steward','supplier','contractor','project_user','viewer') NOT NULL,
	`organizationEntityId` int,
	`status` enum('invited','active','suspended','ended') NOT NULL DEFAULT 'active',
	`scope` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspace_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspace_member_unique` UNIQUE(`workspaceId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wajenziId` varchar(40) NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` enum('active','suspended','archived') NOT NULL DEFAULT 'active',
	`isDemo` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspaces_wajenziId_unique` UNIQUE(`wajenziId`)
);
--> statement-breakpoint
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_events` ADD CONSTRAINT `audit_events_subjectEntityId_registry_entities_id_fk` FOREIGN KEY (`subjectEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `availability_observations` ADD CONSTRAINT `availability_observations_offerId_product_offers_id_fk` FOREIGN KEY (`offerId`) REFERENCES `product_offers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `canonical_match_candidates` ADD CONSTRAINT `canonical_match_candidates_supplierSubmissionId_supplier_submissions_id_fk` FOREIGN KEY (`supplierSubmissionId`) REFERENCES `supplier_submissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `canonical_match_candidates` ADD CONSTRAINT `canonical_match_candidates_candidateEntityId_registry_entities_id_fk` FOREIGN KEY (`candidateEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `canonicalization_decisions` ADD CONSTRAINT `canonicalization_decisions_supplierSubmissionId_supplier_submissions_id_fk` FOREIGN KEY (`supplierSubmissionId`) REFERENCES `supplier_submissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `canonicalization_decisions` ADD CONSTRAINT `canonicalization_decisions_resolvedEntityId_registry_entities_id_fk` FOREIGN KEY (`resolvedEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `canonicalization_decisions` ADD CONSTRAINT `canonicalization_decisions_decidedByUserId_users_id_fk` FOREIGN KEY (`decidedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `controlled_values` ADD CONSTRAINT `controlled_values_vocabularyId_controlled_vocabularies_id_fk` FOREIGN KEY (`vocabularyId`) REFERENCES `controlled_vocabularies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `entity_relations` ADD CONSTRAINT `entity_relations_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `entity_relations` ADD CONSTRAINT `entity_relations_subjectEntityId_registry_entities_id_fk` FOREIGN KEY (`subjectEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `entity_relations` ADD CONSTRAINT `entity_relations_objectEntityId_registry_entities_id_fk` FOREIGN KEY (`objectEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evidence` ADD CONSTRAINT `evidence_entityId_registry_entities_id_fk` FOREIGN KEY (`entityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evidence` ADD CONSTRAINT `evidence_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evidence` ADD CONSTRAINT `evidence_fileAssetId_file_assets_id_fk` FOREIGN KEY (`fileAssetId`) REFERENCES `file_assets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evidence_links` ADD CONSTRAINT `evidence_links_evidenceId_evidence_id_fk` FOREIGN KEY (`evidenceId`) REFERENCES `evidence`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evidence_links` ADD CONSTRAINT `evidence_links_subjectEntityId_registry_entities_id_fk` FOREIGN KEY (`subjectEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `external_identifiers` ADD CONSTRAINT `external_identifiers_entityId_registry_entities_id_fk` FOREIGN KEY (`entityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `facilities` ADD CONSTRAINT `facilities_entityId_registry_entities_id_fk` FOREIGN KEY (`entityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `facilities` ADD CONSTRAINT `facilities_organizationEntityId_registry_entities_id_fk` FOREIGN KEY (`organizationEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `file_assets` ADD CONSTRAINT `file_assets_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `file_assets` ADD CONSTRAINT `file_assets_uploadedByUserId_users_id_fk` FOREIGN KEY (`uploadedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_batches` ADD CONSTRAINT `import_batches_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `import_batches` ADD CONSTRAINT `import_batches_initiatedByUserId_users_id_fk` FOREIGN KEY (`initiatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organizations` ADD CONSTRAINT `organizations_entityId_registry_entities_id_fk` FOREIGN KEY (`entityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_observations` ADD CONSTRAINT `price_observations_offerId_product_offers_id_fk` FOREIGN KEY (`offerId`) REFERENCES `product_offers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_offers` ADD CONSTRAINT `product_offers_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_offers` ADD CONSTRAINT `product_offers_supplierOrganizationEntityId_registry_entities_id_fk` FOREIGN KEY (`supplierOrganizationEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_offers` ADD CONSTRAINT `product_offers_facilityId_facilities_id_fk` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_offers` ADD CONSTRAINT `product_offers_canonicalProductEntityId_registry_entities_id_fk` FOREIGN KEY (`canonicalProductEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_offers` ADD CONSTRAINT `product_offers_canonicalVariantEntityId_registry_entities_id_fk` FOREIGN KEY (`canonicalVariantEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_entityId_registry_entities_id_fk` FOREIGN KEY (`entityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_entityId_registry_entities_id_fk` FOREIGN KEY (`entityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_product_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `product_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_manufacturerOrganizationEntityId_registry_entities_id_fk` FOREIGN KEY (`manufacturerOrganizationEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_memberships` ADD CONSTRAINT `project_memberships_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_memberships` ADD CONSTRAINT `project_memberships_workspaceMemberId_workspace_members_id_fk` FOREIGN KEY (`workspaceMemberId`) REFERENCES `workspace_members`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_entityId_registry_entities_id_fk` FOREIGN KEY (`entityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_ownerOrganizationEntityId_registry_entities_id_fk` FOREIGN KEY (`ownerOrganizationEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `registry_entities` ADD CONSTRAINT `registry_entities_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `registry_entities` ADD CONSTRAINT `registry_entities_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sites` ADD CONSTRAINT `sites_entityId_registry_entities_id_fk` FOREIGN KEY (`entityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sites` ADD CONSTRAINT `sites_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `source_records` ADD CONSTRAINT `source_records_importBatchId_import_batches_id_fk` FOREIGN KEY (`importBatchId`) REFERENCES `import_batches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `source_records` ADD CONSTRAINT `source_records_mappedEntityId_registry_entities_id_fk` FOREIGN KEY (`mappedEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_submissions` ADD CONSTRAINT `supplier_submissions_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_submissions` ADD CONSTRAINT `supplier_submissions_sourceRecordId_source_records_id_fk` FOREIGN KEY (`sourceRecordId`) REFERENCES `source_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_event_workspace_time_idx` ON `audit_events` (`workspaceId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `audit_event_subject_idx` ON `audit_events` (`subjectEntityId`);--> statement-breakpoint
CREATE INDEX `availability_observation_offer_time_idx` ON `availability_observations` (`offerId`,`observedAt`);--> statement-breakpoint
CREATE INDEX `entity_relation_subject_idx` ON `entity_relations` (`subjectEntityId`,`predicate`);--> statement-breakpoint
CREATE INDEX `entity_relation_object_idx` ON `entity_relations` (`objectEntityId`,`predicate`);--> statement-breakpoint
CREATE INDEX `facilities_organization_idx` ON `facilities` (`organizationEntityId`);--> statement-breakpoint
CREATE INDEX `price_observation_offer_time_idx` ON `price_observations` (`offerId`,`observedAt`);--> statement-breakpoint
CREATE INDEX `product_offer_product_idx` ON `product_offers` (`canonicalProductEntityId`);--> statement-breakpoint
CREATE INDEX `product_offer_variant_idx` ON `product_offers` (`canonicalVariantEntityId`);--> statement-breakpoint
CREATE INDEX `product_offer_supplier_idx` ON `product_offers` (`supplierOrganizationEntityId`);--> statement-breakpoint
CREATE INDEX `product_variants_product_idx` ON `product_variants` (`productId`);--> statement-breakpoint
CREATE INDEX `registry_entity_workspace_idx` ON `registry_entities` (`workspaceId`,`entityType`);--> statement-breakpoint
CREATE INDEX `registry_entity_name_idx` ON `registry_entities` (`canonicalName`);--> statement-breakpoint
CREATE INDEX `sites_project_idx` ON `sites` (`projectId`);--> statement-breakpoint
CREATE INDEX `workspace_members_user_idx` ON `workspace_members` (`userId`);