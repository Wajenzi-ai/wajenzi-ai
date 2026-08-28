CREATE TABLE `roleWorkItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`organizationId` int,
	`projectId` int,
	`workspace` varchar(64) NOT NULL,
	`workType` enum('project','boq','procurement','document','approval','delivery','finance','registry','task') NOT NULL,
	`title` varchar(220) NOT NULL,
	`description` text,
	`status` enum('draft','in_progress','review','approved','completed','cancelled') NOT NULL DEFAULT 'draft',
	`context` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roleWorkItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `role_work_owner_idx` ON `roleWorkItems` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `role_work_workspace_idx` ON `roleWorkItems` (`workspace`);--> statement-breakpoint
CREATE INDEX `role_work_project_idx` ON `roleWorkItems` (`projectId`);--> statement-breakpoint
CREATE INDEX `role_work_status_idx` ON `roleWorkItems` (`status`);