CREATE TABLE `marketplaceCartItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cartId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`productCatalogItemId` int,
	`supplierProductId` int,
	`canonicalProductId` int,
	`quantity` int NOT NULL,
	`requiredBy` timestamp,
	`sourceSnapshot` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplaceCartItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplaceCarts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`organizationId` int,
	`projectId` int,
	`status` enum('open','submitted','converted','abandoned') NOT NULL DEFAULT 'open',
	`deliveryLocation` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplaceCarts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplaceOrderTrackingEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`status` varchar(80) NOT NULL,
	`location` varchar(255),
	`note` text,
	`evidenceFileId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplaceOrderTrackingEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplacePurchaseOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfqId` int,
	`quoteId` int,
	`ownerUserId` int NOT NULL,
	`organizationId` int,
	`projectId` int,
	`reference` varchar(90) NOT NULL,
	`status` enum('pending_approval','approved','submitted','fulfilling','delivered','invoiced','cancelled') NOT NULL DEFAULT 'pending_approval',
	`subtotalKes` int NOT NULL DEFAULT 0,
	`deliveryKes` int NOT NULL DEFAULT 0,
	`totalKes` int NOT NULL DEFAULT 0,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplacePurchaseOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplacePurchaseOrders_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `marketplaceQuotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfqId` int NOT NULL,
	`supplierOrganizationId` int NOT NULL,
	`supplierUserId` int NOT NULL,
	`status` enum('draft','submitted','accepted','declined','expired') NOT NULL DEFAULT 'draft',
	`subtotalKes` int NOT NULL DEFAULT 0,
	`deliveryKes` int NOT NULL DEFAULT 0,
	`totalKes` int NOT NULL DEFAULT 0,
	`validUntil` timestamp,
	`leadTimeDays` int,
	`deliveryPromise` varchar(255),
	`evidence` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplaceQuotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplaceRfqItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rfqId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`productCatalogItemId` int,
	`supplierProductId` int,
	`canonicalProductId` int,
	`description` varchar(500) NOT NULL,
	`quantity` int NOT NULL,
	`unit` varchar(40),
	`requiredBy` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplaceRfqItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplaceRfqRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`organizationId` int,
	`projectId` int,
	`title` varchar(220) NOT NULL,
	`deliveryLocation` varchar(255),
	`needBy` timestamp,
	`status` enum('draft','sent','quoted','awarded','cancelled') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplaceRfqRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplaceSavedItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`productCatalogItemId` int,
	`supplierProductId` int,
	`canonicalProductId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplaceSavedItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_item_list_product_unique` UNIQUE(`listId`,`productCatalogItemId`,`supplierProductId`)
);
--> statement-breakpoint
CREATE TABLE `marketplaceSavedLists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`organizationId` int,
	`name` varchar(180) NOT NULL,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplaceSavedLists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`siteId` int,
	`assetType` enum('building','team_member','document','drawing','boq','task','risk','cost','site_record','inspection','issue','delivery','photo','approval') NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text,
	`status` varchar(80) NOT NULL DEFAULT 'open',
	`assignedToUserId` int,
	`dueDate` timestamp,
	`amountKes` int,
	`linkedRecordId` varchar(120),
	`fileId` int,
	`metadata` json,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectEventLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(120) NOT NULL,
	`previousState` json,
	`nextState` json,
	`evidence` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectEventLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectOperations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`projectType` varchar(120),
	`scope` text,
	`stage` varchar(100),
	`timelineStart` timestamp,
	`timelineEnd` timestamp,
	`ownerUserId` int,
	`contractorOrganizationId` int,
	`forecastKes` int NOT NULL DEFAULT 0,
	`actualSpendKes` int NOT NULL DEFAULT 0,
	`cashFlow` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectOperations_id` PRIMARY KEY(`id`),
	CONSTRAINT `projectOperations_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `projectSites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`address` varchar(255),
	`latitude` varchar(40),
	`longitude` varchar(40),
	`metadata` json,
	`status` enum('planning','active','closed') NOT NULL DEFAULT 'planning',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectSites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplierFacilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierOrganizationId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`location` varchar(255) NOT NULL,
	`deliveryZones` json,
	`businessHours` json,
	`paymentTerms` varchar(180),
	`status` enum('draft','active','suspended') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplierFacilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplierReliabilityMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierOrganizationId` int NOT NULL,
	`fulfilmentRate` int NOT NULL DEFAULT 0,
	`onTimeRate` int NOT NULL DEFAULT 0,
	`responseRate` int NOT NULL DEFAULT 0,
	`disputeRate` int NOT NULL DEFAULT 0,
	`completedOrders` int NOT NULL DEFAULT 0,
	`evidence` json,
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplierReliabilityMetrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplierReliabilityMetrics_supplierOrganizationId_unique` UNIQUE(`supplierOrganizationId`)
);
--> statement-breakpoint
CREATE TABLE `supplierVerifiedReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierOrganizationId` int NOT NULL,
	`reviewerUserId` int NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`rating` int NOT NULL,
	`reviewText` text,
	`verificationEvidence` json,
	`status` enum('submitted','published','hidden') NOT NULL DEFAULT 'submitted',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplierVerifiedReviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_review_order_reviewer_unique` UNIQUE(`purchaseOrderId`,`reviewerUserId`)
);
--> statement-breakpoint
CREATE INDEX `cart_item_cart_idx` ON `marketplaceCartItems` (`cartId`);--> statement-breakpoint
CREATE INDEX `cart_item_owner_idx` ON `marketplaceCartItems` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `cart_owner_idx` ON `marketplaceCarts` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `cart_org_idx` ON `marketplaceCarts` (`organizationId`);--> statement-breakpoint
CREATE INDEX `cart_project_idx` ON `marketplaceCarts` (`projectId`);--> statement-breakpoint
CREATE INDEX `cart_status_idx` ON `marketplaceCarts` (`status`);--> statement-breakpoint
CREATE INDEX `order_event_order_idx` ON `marketplaceOrderTrackingEvents` (`purchaseOrderId`);--> statement-breakpoint
CREATE INDEX `order_event_owner_idx` ON `marketplaceOrderTrackingEvents` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `market_po_owner_idx` ON `marketplacePurchaseOrders` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `market_po_org_idx` ON `marketplacePurchaseOrders` (`organizationId`);--> statement-breakpoint
CREATE INDEX `market_po_project_idx` ON `marketplacePurchaseOrders` (`projectId`);--> statement-breakpoint
CREATE INDEX `market_po_status_idx` ON `marketplacePurchaseOrders` (`status`);--> statement-breakpoint
CREATE INDEX `market_quote_rfq_idx` ON `marketplaceQuotes` (`rfqId`);--> statement-breakpoint
CREATE INDEX `market_quote_supplier_idx` ON `marketplaceQuotes` (`supplierOrganizationId`);--> statement-breakpoint
CREATE INDEX `market_quote_status_idx` ON `marketplaceQuotes` (`status`);--> statement-breakpoint
CREATE INDEX `market_rfq_item_rfq_idx` ON `marketplaceRfqItems` (`rfqId`);--> statement-breakpoint
CREATE INDEX `market_rfq_item_owner_idx` ON `marketplaceRfqItems` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `market_rfq_item_canonical_idx` ON `marketplaceRfqItems` (`canonicalProductId`);--> statement-breakpoint
CREATE INDEX `market_rfq_owner_idx` ON `marketplaceRfqRequests` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `market_rfq_org_idx` ON `marketplaceRfqRequests` (`organizationId`);--> statement-breakpoint
CREATE INDEX `market_rfq_project_idx` ON `marketplaceRfqRequests` (`projectId`);--> statement-breakpoint
CREATE INDEX `market_rfq_status_idx` ON `marketplaceRfqRequests` (`status`);--> statement-breakpoint
CREATE INDEX `saved_item_list_idx` ON `marketplaceSavedItems` (`listId`);--> statement-breakpoint
CREATE INDEX `saved_item_owner_idx` ON `marketplaceSavedItems` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `saved_list_owner_idx` ON `marketplaceSavedLists` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `saved_list_org_idx` ON `marketplaceSavedLists` (`organizationId`);--> statement-breakpoint
CREATE INDEX `saved_list_status_idx` ON `marketplaceSavedLists` (`status`);--> statement-breakpoint
CREATE INDEX `project_asset_project_idx` ON `projectAssets` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_asset_org_idx` ON `projectAssets` (`organizationId`);--> statement-breakpoint
CREATE INDEX `project_asset_type_idx` ON `projectAssets` (`assetType`);--> statement-breakpoint
CREATE INDEX `project_asset_status_idx` ON `projectAssets` (`status`);--> statement-breakpoint
CREATE INDEX `project_event_project_idx` ON `projectEventLog` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_event_org_idx` ON `projectEventLog` (`organizationId`);--> statement-breakpoint
CREATE INDEX `project_event_entity_idx` ON `projectEventLog` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `project_event_created_idx` ON `projectEventLog` (`createdAt`);--> statement-breakpoint
CREATE INDEX `project_ops_org_idx` ON `projectOperations` (`organizationId`);--> statement-breakpoint
CREATE INDEX `project_ops_owner_idx` ON `projectOperations` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `project_site_project_idx` ON `projectSites` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_site_org_idx` ON `projectSites` (`organizationId`);--> statement-breakpoint
CREATE INDEX `facility_supplier_idx` ON `supplierFacilities` (`supplierOrganizationId`);--> statement-breakpoint
CREATE INDEX `facility_status_idx` ON `supplierFacilities` (`status`);--> statement-breakpoint
CREATE INDEX `supplier_review_supplier_idx` ON `supplierVerifiedReviews` (`supplierOrganizationId`);--> statement-breakpoint
CREATE INDEX `supplier_review_order_idx` ON `supplierVerifiedReviews` (`purchaseOrderId`);