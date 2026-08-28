CREATE TABLE `erpSyncConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`provider` varchar(100) NOT NULL,
	`status` enum('not_configured','pending_credentials','connected','paused','error') NOT NULL DEFAULT 'not_configured',
	`direction` enum('outbound','inbound','bidirectional') NOT NULL DEFAULT 'outbound',
	`resourceMapping` json,
	`lastSyncAt` timestamp,
	`lastError` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `erpSyncConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `erp_connection_org_provider_unique` UNIQUE(`organizationId`,`provider`)
);
--> statement-breakpoint
CREATE TABLE `erpSyncRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionId` int NOT NULL,
	`status` enum('queued','processing','completed','failed','skipped') NOT NULL DEFAULT 'queued',
	`direction` enum('outbound','inbound','bidirectional') NOT NULL,
	`resourceType` varchar(80) NOT NULL,
	`resourceId` varchar(120) NOT NULL,
	`correlationId` varchar(80) NOT NULL,
	`payloadSummary` json,
	`errorSummary` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `erpSyncRuns_id` PRIMARY KEY(`id`),
	CONSTRAINT `erpSyncRuns_correlationId_unique` UNIQUE(`correlationId`)
);
--> statement-breakpoint
CREATE TABLE `supplierVerificationDecisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierProfileId` int NOT NULL,
	`organizationId` int NOT NULL,
	`decision` enum('submitted','verified','rejected','needs_evidence') NOT NULL DEFAULT 'submitted',
	`evidence` json,
	`rationale` text,
	`decidedByUserId` int,
	`decidedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplierVerificationDecisions_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplierVerificationDecisions_supplierProfileId_unique` UNIQUE(`supplierProfileId`)
);
--> statement-breakpoint
CREATE TABLE `supplierVerificationPolicies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`minimumScore` int NOT NULL DEFAULT 70,
	`requiredEvidence` json,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplierVerificationPolicies_id` PRIMARY KEY(`id`),
	CONSTRAINT `supplierVerificationPolicies_organizationId_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE INDEX `erp_connection_org_idx` ON `erpSyncConnections` (`organizationId`);--> statement-breakpoint
CREATE INDEX `erp_run_connection_idx` ON `erpSyncRuns` (`connectionId`);--> statement-breakpoint
CREATE INDEX `erp_run_status_idx` ON `erpSyncRuns` (`status`);--> statement-breakpoint
CREATE INDEX `verification_decision_org_idx` ON `supplierVerificationDecisions` (`organizationId`);--> statement-breakpoint
CREATE INDEX `verification_decision_status_idx` ON `supplierVerificationDecisions` (`decision`);