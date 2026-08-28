ALTER TABLE `semanticProductRecords` ADD `marketplaceProductId` int;--> statement-breakpoint
ALTER TABLE `semanticProductRecords` ADD `marketplaceStatus` enum('not_published','published','unpublished') DEFAULT 'not_published' NOT NULL;--> statement-breakpoint
ALTER TABLE `semanticProductRecords` ADD `marketplacePublishedAt` timestamp;--> statement-breakpoint
ALTER TABLE `semanticProductRecords` ADD `marketplacePublishedByUserId` int;--> statement-breakpoint
CREATE INDEX `semantic_product_marketplace_idx` ON `semanticProductRecords` (`marketplaceProductId`);