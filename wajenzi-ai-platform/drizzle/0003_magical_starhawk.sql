CREATE TABLE `catalogImports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`supplierId` int NOT NULL DEFAULT 0,
	`originalName` varchar(255) NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`storageUrl` varchar(600) NOT NULL,
	`status` enum('processing','completed','completed_with_warnings','failed') NOT NULL DEFAULT 'processing',
	`totalRows` int NOT NULL DEFAULT 0,
	`importedRows` int NOT NULL DEFAULT 0,
	`skippedRows` int NOT NULL DEFAULT 0,
	`errorSummary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `catalogImports_id` PRIMARY KEY(`id`),
	CONSTRAINT `catalogImports_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
ALTER TABLE `productCatalogItems` ADD `salePriceKes` int;--> statement-breakpoint
ALTER TABLE `productCatalogItems` ADD `supplierName` varchar(180);--> statement-breakpoint
ALTER TABLE `productCatalogItems` ADD `description` text;--> statement-breakpoint
ALTER TABLE `productCatalogItems` ADD `imageUrl` varchar(600);--> statement-breakpoint
ALTER TABLE `productCatalogItems` ADD `externalUrl` varchar(600);--> statement-breakpoint
ALTER TABLE `productCatalogItems` ADD `buttonText` varchar(60);--> statement-breakpoint
ALTER TABLE `productCatalogItems` ADD `importRecordId` int;--> statement-breakpoint
ALTER TABLE `productCatalogItems` ADD `createdAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `productCatalogItems` ADD CONSTRAINT `catalog_supplier_sku_unique` UNIQUE(`supplierId`,`sku`);--> statement-breakpoint
CREATE INDEX `catalog_import_owner_idx` ON `catalogImports` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `catalog_import_created_idx` ON `catalogImports` (`createdAt`);--> statement-breakpoint
CREATE INDEX `catalog_import_idx` ON `productCatalogItems` (`importRecordId`);