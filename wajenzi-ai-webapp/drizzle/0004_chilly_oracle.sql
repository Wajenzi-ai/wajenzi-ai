CREATE TABLE `user_contexts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`activeWorkspaceId` int NOT NULL,
	`activeProjectEntityId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_contexts_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_contexts_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `user_contexts` ADD CONSTRAINT `user_contexts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_contexts` ADD CONSTRAINT `user_contexts_activeWorkspaceId_workspaces_id_fk` FOREIGN KEY (`activeWorkspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_contexts` ADD CONSTRAINT `user_contexts_activeProjectEntityId_registry_entities_id_fk` FOREIGN KEY (`activeProjectEntityId`) REFERENCES `registry_entities`(`id`) ON DELETE no action ON UPDATE no action;