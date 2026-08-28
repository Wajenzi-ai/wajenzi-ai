CREATE TABLE `projectMemberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`projectRole` enum('project_owner','project_manager','architect','engineer','quantity_surveyor','contractor','buyer','supplier_viewer','finance_reviewer','logistics_coordinator') NOT NULL,
	`permissions` json,
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectMemberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_membership_user_project_role_unique` UNIQUE(`userId`,`projectId`,`projectRole`)
);
--> statement-breakpoint
ALTER TABLE `workspaceMemberships` ADD `permissions` json;--> statement-breakpoint
ALTER TABLE `workspaceMemberships` ADD `status` enum('active','suspended') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaceMemberships` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `workspaceMemberships` ADD CONSTRAINT `membership_user_org_role_unique` UNIQUE(`userId`,`organizationId`,`workspaceRole`);--> statement-breakpoint
CREATE INDEX `project_membership_project_idx` ON `projectMemberships` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_membership_user_idx` ON `projectMemberships` (`userId`);--> statement-breakpoint
CREATE INDEX `project_membership_org_idx` ON `projectMemberships` (`organizationId`);--> statement-breakpoint
CREATE INDEX `memberships_status_idx` ON `workspaceMemberships` (`status`);