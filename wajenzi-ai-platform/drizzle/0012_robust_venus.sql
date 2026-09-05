CREATE TABLE `marketplaceSearchEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int,
	`query` varchar(180),
	`filters` json,
	`resultCount` int NOT NULL DEFAULT 0,
	`selectedProductId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketplaceSearchEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `search_event_owner_idx` ON `marketplaceSearchEvents` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `search_event_created_idx` ON `marketplaceSearchEvents` (`createdAt`);--> statement-breakpoint
CREATE INDEX `search_event_query_idx` ON `marketplaceSearchEvents` (`query`);