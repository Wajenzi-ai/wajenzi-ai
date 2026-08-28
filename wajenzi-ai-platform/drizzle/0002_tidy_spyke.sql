CREATE TABLE `workflowActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`workspace` varchar(64) NOT NULL,
	`actionType` varchar(100) NOT NULL,
	`resourceRef` varchar(120) NOT NULL,
	`status` enum('pending','completed','review') NOT NULL DEFAULT 'pending',
	`payload` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workflowActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `workflow_owner_idx` ON `workflowActions` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `workflow_workspace_idx` ON `workflowActions` (`workspace`);--> statement-breakpoint
CREATE INDEX `workflow_action_idx` ON `workflowActions` (`actionType`);