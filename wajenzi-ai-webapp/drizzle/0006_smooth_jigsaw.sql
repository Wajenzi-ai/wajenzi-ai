CREATE TABLE `delivery_intents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`wajenziId` varchar(40) NOT NULL,
	`status` enum('planned','scheduled','in_transit','delivered','partially_delivered','failed','cancelled') NOT NULL DEFAULT 'planned',
	`expectedAt` timestamp,
	`deliveryAddress` text,
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `delivery_intents_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_intents_wajenziId_unique` UNIQUE(`wajenziId`)
);
--> statement-breakpoint
CREATE TABLE `procurement_request_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`procurementRequestId` int NOT NULL,
	`canonicalProductEntityId` int,
	`canonicalVariantEntityId` int,
	`requestedDescription` varchar(1000) NOT NULL,
	`quantity` decimal(16,3) NOT NULL,
	`unitOfMeasure` varchar(64) NOT NULL,
	`targetUnit` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `procurement_request_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procurement_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`projectId` int NOT NULL,
	`wajenziId` varchar(40) NOT NULL,
	`requestingOrganizationEntityId` int,
	`title` varchar(500) NOT NULL,
	`notes` text,
	`needBy` timestamp,
	`closingAt` timestamp,
	`status` enum('draft','open','closed','awarded','cancelled') NOT NULL DEFAULT 'draft',
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `procurement_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `procurement_requests_wajenziId_unique` UNIQUE(`wajenziId`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`projectId` int NOT NULL,
	`procurementRequestId` int NOT NULL,
	`supplierQuoteId` int NOT NULL,
	`wajenziId` varchar(40) NOT NULL,
	`buyerOrganizationEntityId` int,
	`supplierOrganizationEntityId` int NOT NULL,
	`status` enum('draft','pending_approval','approved','issued','acknowledged','cancelled','closed') NOT NULL DEFAULT 'draft',
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_wajenziId_unique` UNIQUE(`wajenziId`),
	CONSTRAINT `purchase_order_quote_unique` UNIQUE(`supplierQuoteId`)
);
--> statement-breakpoint
CREATE TABLE `rfq_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`procurementRequestId` int NOT NULL,
	`supplierOrganizationEntityId` int NOT NULL,
	`status` enum('invited','viewed','declined','quoted','withdrawn') NOT NULL DEFAULT 'invited',
	`invitedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rfq_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `rfq_invitation_unique` UNIQUE(`procurementRequestId`,`supplierOrganizationEntityId`)
);
--> statement-breakpoint
CREATE TABLE `supplier_quote_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierQuoteId` int NOT NULL,
	`procurementRequestLineId` int NOT NULL,
	`offerId` int,
	`quotedDescription` varchar(1000) NOT NULL,
	`quantity` decimal(16,3) NOT NULL,
	`unitOfMeasure` varchar(64) NOT NULL,
	`unitPrice` decimal(16,2) NOT NULL,
	`leadTimeHours` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supplier_quote_lines_id` PRIMARY KEY(`id`),
	CONSTRAINT `quote_line_rfq_line_unique` UNIQUE(`supplierQuoteId`,`procurementRequestLineId`)
);
--> statement-breakpoint
CREATE TABLE `supplier_quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`procurementRequestId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`wajenziId` varchar(40) NOT NULL,
	`supplierOrganizationEntityId` int NOT NULL,
	`currencyCode` varchar(3) NOT NULL DEFAULT 'KES',
	`taxBasis` enum('inclusive','exclusive','unknown') NOT NULL DEFAULT 'unknown',
	`validUntil` timestamp,
	`notes` text,
	`status` enum('draft','submitted','withdrawn','accepted','rejected','expired') NOT NULL DEFAULT 'draft',
	`submittedByUserId` int,
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplier_quotes_wajenziId_unique` UNIQUE(`wajenziId`)
);
--> statement-breakpoint
ALTER TABLE `delivery_intents` ADD CONSTRAINT `delivery_intents_purchaseOrderId_purchase_orders_id_fk` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_intents` ADD CONSTRAINT `delivery_intents_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_intents` ADD CONSTRAINT `delivery_intents_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_request_lines` ADD CONSTRAINT `fk_prl_rfq` FOREIGN KEY (`procurementRequestId`) REFERENCES `procurement_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_request_lines` ADD CONSTRAINT `fk_prl_product` FOREIGN KEY (`canonicalProductEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_request_lines` ADD CONSTRAINT `fk_prl_variant` FOREIGN KEY (`canonicalVariantEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_requests` ADD CONSTRAINT `fk_rfq_workspace` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_requests` ADD CONSTRAINT `fk_rfq_project` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_requests` ADD CONSTRAINT `fk_rfq_requestor` FOREIGN KEY (`requestingOrganizationEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `procurement_requests` ADD CONSTRAINT `fk_rfq_creator` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_workspace` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_project` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_rfq` FOREIGN KEY (`procurementRequestId`) REFERENCES `procurement_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_quote` FOREIGN KEY (`supplierQuoteId`) REFERENCES `supplier_quotes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_buyer` FOREIGN KEY (`buyerOrganizationEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplierOrganizationEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `fk_po_creator` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_invitations` ADD CONSTRAINT `fk_rfqinv_rfq` FOREIGN KEY (`procurementRequestId`) REFERENCES `procurement_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_invitations` ADD CONSTRAINT `fk_rfqinv_supplier` FOREIGN KEY (`supplierOrganizationEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rfq_invitations` ADD CONSTRAINT `fk_rfqinv_creator` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_quote_lines` ADD CONSTRAINT `fk_sql_quote` FOREIGN KEY (`supplierQuoteId`) REFERENCES `supplier_quotes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_quote_lines` ADD CONSTRAINT `fk_sql_rfqline` FOREIGN KEY (`procurementRequestLineId`) REFERENCES `procurement_request_lines`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_quote_lines` ADD CONSTRAINT `fk_sql_offer` FOREIGN KEY (`offerId`) REFERENCES `product_offers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_quotes` ADD CONSTRAINT `fk_quote_rfq` FOREIGN KEY (`procurementRequestId`) REFERENCES `procurement_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_quotes` ADD CONSTRAINT `fk_quote_workspace` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_quotes` ADD CONSTRAINT `fk_quote_supplier` FOREIGN KEY (`supplierOrganizationEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supplier_quotes` ADD CONSTRAINT `fk_quote_submitter` FOREIGN KEY (`submittedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `delivery_intent_order_idx` ON `delivery_intents` (`purchaseOrderId`,`status`);--> statement-breakpoint
CREATE INDEX `rfq_workspace_status_idx` ON `procurement_requests` (`workspaceId`,`status`);--> statement-breakpoint
CREATE INDEX `rfq_project_idx` ON `procurement_requests` (`projectId`);--> statement-breakpoint
CREATE INDEX `purchase_order_project_idx` ON `purchase_orders` (`projectId`,`status`);--> statement-breakpoint
CREATE INDEX `supplier_quote_rfq_idx` ON `supplier_quotes` (`procurementRequestId`);--> statement-breakpoint
CREATE INDEX `supplier_quote_supplier_idx` ON `supplier_quotes` (`supplierOrganizationEntityId`,`status`);
