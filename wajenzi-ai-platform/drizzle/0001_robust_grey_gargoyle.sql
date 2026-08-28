CREATE TABLE `agentConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`projectId` int,
	`title` varchar(220) NOT NULL,
	`context` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentConversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`status` enum('scheduled','dispatched','in_transit','delivered','exception') NOT NULL DEFAULT 'scheduled',
	`driverName` varchar(120),
	`vehicleLabel` varchar(120),
	`originAddress` varchar(255),
	`destinationAddress` varchar(255),
	`scheduledFor` timestamp,
	`deliveredAt` timestamp,
	`proofFileId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `disputes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`escrowTransactionId` int NOT NULL,
	`openedByUserId` int NOT NULL,
	`category` varchar(100) NOT NULL,
	`status` enum('open','evidence_requested','under_review','resolved') NOT NULL DEFAULT 'open',
	`summary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `disputes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `escrowTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`reference` varchar(90) NOT NULL,
	`amountKes` int NOT NULL,
	`paymentMethod` enum('mobile_money','card','bank_transfer') NOT NULL,
	`status` enum('funded','delivery_confirmed','release_pending','released','disputed','refunded') NOT NULL DEFAULT 'funded',
	`kycState` enum('clear','review','flagged') NOT NULL DEFAULT 'clear',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `escrowTransactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `escrowTransactions_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `fileRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`organizationId` int,
	`originalName` varchar(255) NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`storageUrl` varchar(600) NOT NULL,
	`contentType` varchar(160) NOT NULL,
	`byteSize` int NOT NULL,
	`purpose` enum('supplier_catalog','boq','drawing','compliance','delivery_proof') NOT NULL,
	`accessScope` enum('owner','organization','platform_review') NOT NULL DEFAULT 'owner',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fileRecords_id` PRIMARY KEY(`id`),
	CONSTRAINT `fileRecords_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`kind` enum('homeowner','contractor','supplier','logistics','finance','platform') NOT NULL,
	`status` enum('active','pending','suspended') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurementRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`requestedByUserId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`status` enum('draft','rfq_sent','quoted','approved','ordered','cancelled') NOT NULL DEFAULT 'draft',
	`budgetKes` int NOT NULL DEFAULT 0,
	`needBy` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `procurementRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productCatalogItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`sku` varchar(90) NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL,
	`priceKes` int NOT NULL DEFAULT 0,
	`availableQuantity` int NOT NULL DEFAULT 0,
	`attributes` json,
	`status` enum('active','draft','out_of_stock') NOT NULL DEFAULT 'draft',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productCatalogItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`location` varchar(255),
	`status` enum('planning','procurement','construction','completed','on_hold') NOT NULL DEFAULT 'planning',
	`budgetKes` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rfqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`procurementRequestId` int NOT NULL,
	`supplierId` int NOT NULL,
	`status` enum('sent','responded','accepted','declined','expired') NOT NULL DEFAULT 'sent',
	`quotedKes` int,
	`validUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rfqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplierProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`supplierType` enum('hardware_store','manufacturer','distributor') NOT NULL,
	`verificationStatus` enum('draft','submitted','verified','rejected') NOT NULL DEFAULT 'draft',
	`score` int NOT NULL DEFAULT 0,
	`county` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplierProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaceMemberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`workspaceRole` enum('owner','project_manager','buyer','supplier_admin','dispatcher','finance_operator','support_operator','platform_admin') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspaceMemberships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `conversations_owner_idx` ON `agentConversations` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `conversations_project_idx` ON `agentConversations` (`projectId`);--> statement-breakpoint
CREATE INDEX `deliveries_project_idx` ON `deliveries` (`projectId`);--> statement-breakpoint
CREATE INDEX `deliveries_status_idx` ON `deliveries` (`status`);--> statement-breakpoint
CREATE INDEX `disputes_transaction_idx` ON `disputes` (`escrowTransactionId`);--> statement-breakpoint
CREATE INDEX `disputes_owner_idx` ON `disputes` (`openedByUserId`);--> statement-breakpoint
CREATE INDEX `escrow_project_idx` ON `escrowTransactions` (`projectId`);--> statement-breakpoint
CREATE INDEX `escrow_status_idx` ON `escrowTransactions` (`status`);--> statement-breakpoint
CREATE INDEX `files_owner_idx` ON `fileRecords` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `files_org_idx` ON `fileRecords` (`organizationId`);--> statement-breakpoint
CREATE INDEX `files_purpose_idx` ON `fileRecords` (`purpose`);--> statement-breakpoint
CREATE INDEX `procurement_project_idx` ON `procurementRequests` (`projectId`);--> statement-breakpoint
CREATE INDEX `procurement_requester_idx` ON `procurementRequests` (`requestedByUserId`);--> statement-breakpoint
CREATE INDEX `catalog_supplier_idx` ON `productCatalogItems` (`supplierId`);--> statement-breakpoint
CREATE INDEX `catalog_category_idx` ON `productCatalogItems` (`category`);--> statement-breakpoint
CREATE INDEX `projects_org_idx` ON `projects` (`organizationId`);--> statement-breakpoint
CREATE INDEX `rfqs_request_idx` ON `rfqs` (`procurementRequestId`);--> statement-breakpoint
CREATE INDEX `rfqs_supplier_idx` ON `rfqs` (`supplierId`);--> statement-breakpoint
CREATE INDEX `supplier_profile_org_idx` ON `supplierProfiles` (`organizationId`);--> statement-breakpoint
CREATE INDEX `memberships_user_idx` ON `workspaceMemberships` (`userId`);--> statement-breakpoint
CREATE INDEX `memberships_org_idx` ON `workspaceMemberships` (`organizationId`);