CREATE TABLE `canonicalProductMatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`semanticProductId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`canonicalProductId` int,
	`canonicalEntityId` varchar(120),
	`status` enum('matched_existing','review_required','new_canonical_candidate','rejected') NOT NULL DEFAULT 'review_required',
	`matchMethod` enum('exact_canonical_id','exact_sku','exact_title','normalized_title','candidate','manual','unmatched') NOT NULL DEFAULT 'unmatched',
	`matchScore` int NOT NULL DEFAULT 0,
	`decisionStatus` enum('pending','auto_accepted','approved','rejected','needs_data') NOT NULL DEFAULT 'pending',
	`matchReason` text,
	`matchEvidence` json,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `canonicalProductMatches_id` PRIMARY KEY(`id`),
	CONSTRAINT `canonicalProductMatches_semanticProductId_unique` UNIQUE(`semanticProductId`)
);
--> statement-breakpoint
CREATE TABLE `canonicalProductRegistry` (
	`id` int AUTO_INCREMENT NOT NULL,
	`canonicalEntityId` varchar(120) NOT NULL,
	`sourceRowId` varchar(120) NOT NULL,
	`sourceSku` varchar(140),
	`canonicalName` varchar(500) NOT NULL,
	`category` varchar(160),
	`brand` varchar(180),
	`productFamily` varchar(220),
	`unitOfMeasure` varchar(40),
	`packSize` varchar(120),
	`sourceSystem` varchar(100) NOT NULL DEFAULT 'wajenzi-master-catalogue-v1',
	`sourceVersion` varchar(100) NOT NULL DEFAULT 'github-main',
	`lastSyncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `canonicalProductRegistry_id` PRIMARY KEY(`id`),
	CONSTRAINT `canonicalProductRegistry_canonicalEntityId_unique` UNIQUE(`canonicalEntityId`),
	CONSTRAINT `canonical_source_row_unique` UNIQUE(`sourceSystem`,`sourceRowId`)
);
--> statement-breakpoint
CREATE TABLE `documentProcessingJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceDocumentId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`correlationId` varchar(80) NOT NULL,
	`jobType` enum('extraction','canonical_matching','projection') NOT NULL,
	`status` enum('queued','processing','completed','completed_with_review','failed') NOT NULL DEFAULT 'queued',
	`attemptCount` int NOT NULL DEFAULT 0,
	`errorSummary` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documentProcessingJobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `documentProcessingJobs_correlationId_unique` UNIQUE(`correlationId`)
);
--> statement-breakpoint
CREATE TABLE `supplierDocumentLineage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceDocumentId` int NOT NULL,
	`parentSourceDocumentId` int,
	`ownerUserId` int NOT NULL,
	`versionNumber` int NOT NULL DEFAULT 1,
	`changeSummary` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplierDocumentLineage_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplierDocumentLineage_sourceDocumentId_unique` UNIQUE(`sourceDocumentId`)
);
--> statement-breakpoint
CREATE TABLE `supplierPriceObservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierProductId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`semanticProductId` int,
	`sourceDocumentId` int,
	`amountKes` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'KES',
	`sourceReference` varchar(180),
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplierPriceObservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplierProductEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(120) NOT NULL,
	`ownerUserId` int NOT NULL,
	`actorUserId` int,
	`sourceDocumentId` int,
	`correlationId` varchar(80),
	`previousState` json,
	`nextState` json,
	`evidence` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplierProductEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplierProducts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierProductCode` varchar(64) NOT NULL,
	`ownerUserId` int NOT NULL,
	`semanticProductId` int NOT NULL,
	`sourceDocumentId` int NOT NULL,
	`canonicalProductId` int NOT NULL,
	`canonicalEntityId` varchar(120) NOT NULL,
	`canonicalMatchId` int NOT NULL,
	`supplierSku` varchar(140),
	`supplierProductName` varchar(500) NOT NULL,
	`normalizedProductName` varchar(500) NOT NULL,
	`packagingUnit` varchar(40),
	`location` varchar(180),
	`minimumOrderQuantity` int,
	`leadTimeDays` int,
	`marketplaceProductId` int,
	`status` enum('draft','active','inactive','rejected') NOT NULL DEFAULT 'draft',
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplierProducts_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplierProducts_supplierProductCode_unique` UNIQUE(`supplierProductCode`),
	CONSTRAINT `supplierProducts_semanticProductId_unique` UNIQUE(`semanticProductId`)
);
--> statement-breakpoint
CREATE TABLE `supplierStockObservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierProductId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`semanticProductId` int,
	`sourceDocumentId` int,
	`availableQuantity` int NOT NULL,
	`sourceReference` varchar(180),
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplierStockObservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `semanticSourceDocuments` ADD `canonicalDocumentId` varchar(64);--> statement-breakpoint
ALTER TABLE `semanticSourceDocuments` ADD `supplierSourceKey` varchar(180);--> statement-breakpoint
ALTER TABLE `semanticSourceDocuments` ADD `parentSourceDocumentId` int;--> statement-breakpoint
ALTER TABLE `semanticSourceDocuments` ADD `versionNumber` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `semanticSourceDocuments` ADD CONSTRAINT `semanticSourceDocuments_canonicalDocumentId_unique` UNIQUE(`canonicalDocumentId`);--> statement-breakpoint
CREATE INDEX `canonical_match_owner_idx` ON `canonicalProductMatches` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `canonical_match_target_idx` ON `canonicalProductMatches` (`canonicalProductId`);--> statement-breakpoint
CREATE INDEX `canonical_match_status_idx` ON `canonicalProductMatches` (`status`,`decisionStatus`);--> statement-breakpoint
CREATE INDEX `canonical_name_idx` ON `canonicalProductRegistry` (`canonicalName`);--> statement-breakpoint
CREATE INDEX `canonical_sku_idx` ON `canonicalProductRegistry` (`sourceSku`);--> statement-breakpoint
CREATE INDEX `canonical_category_idx` ON `canonicalProductRegistry` (`category`);--> statement-breakpoint
CREATE INDEX `processing_job_source_idx` ON `documentProcessingJobs` (`sourceDocumentId`);--> statement-breakpoint
CREATE INDEX `processing_job_owner_idx` ON `documentProcessingJobs` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `processing_job_status_idx` ON `documentProcessingJobs` (`status`);--> statement-breakpoint
CREATE INDEX `document_lineage_owner_idx` ON `supplierDocumentLineage` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `document_lineage_parent_idx` ON `supplierDocumentLineage` (`parentSourceDocumentId`);--> statement-breakpoint
CREATE INDEX `supplier_price_product_idx` ON `supplierPriceObservations` (`supplierProductId`,`observedAt`);--> statement-breakpoint
CREATE INDEX `supplier_price_owner_idx` ON `supplierPriceObservations` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `supplier_event_owner_idx` ON `supplierProductEvents` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `supplier_event_entity_idx` ON `supplierProductEvents` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `supplier_event_document_idx` ON `supplierProductEvents` (`sourceDocumentId`);--> statement-breakpoint
CREATE INDEX `supplier_event_correlation_idx` ON `supplierProductEvents` (`correlationId`);--> statement-breakpoint
CREATE INDEX `supplier_product_owner_idx` ON `supplierProducts` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `supplier_product_canonical_idx` ON `supplierProducts` (`canonicalProductId`);--> statement-breakpoint
CREATE INDEX `supplier_product_source_idx` ON `supplierProducts` (`sourceDocumentId`);--> statement-breakpoint
CREATE INDEX `supplier_product_status_idx` ON `supplierProducts` (`status`);--> statement-breakpoint
CREATE INDEX `supplier_product_marketplace_idx` ON `supplierProducts` (`marketplaceProductId`);--> statement-breakpoint
CREATE INDEX `supplier_stock_product_idx` ON `supplierStockObservations` (`supplierProductId`,`observedAt`);--> statement-breakpoint
CREATE INDEX `supplier_stock_owner_idx` ON `supplierStockObservations` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `semantic_source_checksum_idx` ON `semanticSourceDocuments` (`ownerUserId`,`workspace`,`checksumSha256`);--> statement-breakpoint
CREATE INDEX `semantic_source_lineage_idx` ON `semanticSourceDocuments` (`parentSourceDocumentId`);--> statement-breakpoint
CREATE INDEX `semantic_source_key_idx` ON `semanticSourceDocuments` (`ownerUserId`,`supplierSourceKey`);