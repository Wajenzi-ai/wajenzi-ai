CREATE TABLE `agent_proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentRunId` int NOT NULL,
	`workspaceId` int NOT NULL,
	`wajenziId` varchar(40) NOT NULL,
	`proposalType` enum('canonicalization','procurement_recommendation','evidence_gap','workflow_plan') NOT NULL,
	`subjectEntityId` int,
	`status` enum('draft','pending_approval','approved','rejected','superseded') NOT NULL DEFAULT 'draft',
	`content` json NOT NULL,
	`approvalRationale` text,
	`decidedByUserId` int,
	`decidedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_proposals_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_proposals_wajenziId_unique` UNIQUE(`wajenziId`)
);
--> statement-breakpoint
CREATE TABLE `agent_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`wajenziId` varchar(40) NOT NULL,
	`agentKey` enum('orchestrator','product_intelligence','procurement','evidence_quality') NOT NULL,
	`status` enum('completed','failed','requires_approval') NOT NULL,
	`inputPayload` json NOT NULL,
	`outputPayload` json,
	`model` varchar(160),
	`confidence` decimal(5,4),
	`createdByUserId` int,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_runs_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_runs_wajenziId_unique` UNIQUE(`wajenziId`)
);
--> statement-breakpoint
ALTER TABLE `agent_proposals` ADD CONSTRAINT `agent_proposals_agentRunId_agent_runs_id_fk` FOREIGN KEY (`agentRunId`) REFERENCES `agent_runs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_proposals` ADD CONSTRAINT `agent_proposals_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_proposals` ADD CONSTRAINT `agent_proposals_subjectEntityId_registry_entities_id_fk` FOREIGN KEY (`subjectEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_proposals` ADD CONSTRAINT `agent_proposals_decidedByUserId_users_id_fk` FOREIGN KEY (`decidedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_runs` ADD CONSTRAINT `agent_runs_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_runs` ADD CONSTRAINT `agent_runs_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `agent_proposal_workspace_status_idx` ON `agent_proposals` (`workspaceId`,`status`);--> statement-breakpoint
CREATE INDEX `agent_proposal_run_idx` ON `agent_proposals` (`agentRunId`);--> statement-breakpoint
CREATE INDEX `agent_run_workspace_time_idx` ON `agent_runs` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `agent_run_agent_status_idx` ON `agent_runs` (`agentKey`,`status`);