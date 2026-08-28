CREATE TABLE `semanticProductRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceDocumentId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`sourceReference` varchar(180) NOT NULL,
	`supplierProductName` varchar(500) NOT NULL,
	`normalizedProductName` varchar(500) NOT NULL,
	`supplierSku` varchar(140),
	`brand` varchar(180),
	`category` varchar(120),
	`productType` varchar(160),
	`sizeValue` varchar(80),
	`sizeUnit` varchar(24),
	`colour` varchar(80),
	`weightValue` varchar(80),
	`weightUnit` varchar(24),
	`dimensions` varchar(180),
	`packagingUnit` varchar(40),
	`stockQuantity` int,
	`priceKes` int,
	`extractionConfidence` int NOT NULL,
	`classificationConfidence` int NOT NULL,
	`status` enum('ready','needs_review','failed') NOT NULL DEFAULT 'needs_review',
	`fieldEvidence` json,
	`classification` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `semanticProductRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `semanticSourceDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`workspace` enum('supplier','manufacturer') NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`contentType` varchar(160) NOT NULL,
	`byteSize` int NOT NULL,
	`checksumSha256` varchar(64) NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`storageUrl` varchar(600) NOT NULL,
	`documentType` enum('catalogue','price_list','quotation','invoice','stock_list','unknown') NOT NULL DEFAULT 'unknown',
	`status` enum('uploaded','processing','completed','completed_with_review','failed') NOT NULL DEFAULT 'uploaded',
	`rawText` text,
	`documentContext` json,
	`errorSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `semanticSourceDocuments_id` PRIMARY KEY(`id`),
	CONSTRAINT `semanticSourceDocuments_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE INDEX `semantic_product_document_idx` ON `semanticProductRecords` (`sourceDocumentId`);--> statement-breakpoint
CREATE INDEX `semantic_product_owner_idx` ON `semanticProductRecords` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `semantic_product_status_idx` ON `semanticProductRecords` (`status`);--> statement-breakpoint
CREATE INDEX `semantic_product_category_idx` ON `semanticProductRecords` (`category`);--> statement-breakpoint
CREATE INDEX `semantic_source_owner_idx` ON `semanticSourceDocuments` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `semantic_source_workspace_idx` ON `semanticSourceDocuments` (`workspace`);--> statement-breakpoint
CREATE INDEX `semantic_source_status_idx` ON `semanticSourceDocuments` (`status`);