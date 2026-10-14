-- Estate & Co. database: schema + reference data + property catalogue.
-- Run in MySQL Workbench or:  mysql -u root -p < database/realestate.sql
-- Creates database realestate_dev. Accounts are NOT included: run  npm run db:accounts  afterwards.

DROP DATABASE IF EXISTS realestate_dev;
CREATE DATABASE realestate_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE realestate_dev;
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `agent_profiles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `agency_name` varchar(160) DEFAULT NULL,
  `license_number` varchar(100) DEFAULT NULL,
  `bio` text,
  `approval_status` enum('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_agent_profiles_user` (`user_id`),
  UNIQUE KEY `uq_agent_profiles_license` (`license_number`),
  KEY `idx_agent_profiles_approval` (`approval_status`),
  CONSTRAINT `agent_profiles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `amenities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `category` varchar(60) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_amenities_name` (`name`),
  UNIQUE KEY `uq_amenities_slug` (`slug`),
  KEY `idx_amenities_category_active` (`category`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `app_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `type` varchar(40) NOT NULL,
  `title` varchar(160) NOT NULL,
  `body` varchar(500) DEFAULT NULL,
  `link` varchar(200) DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_app_notifications_user` (`user_id`,`read_at`,`created_at`),
  CONSTRAINT `app_notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `actor_user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(80) NOT NULL,
  `entity_id` varchar(80) DEFAULT NULL,
  `before_data` json DEFAULT NULL,
  `after_data` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `request_id` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_entity_date` (`entity_type`,`entity_id`,`created_at`),
  KEY `idx_audit_actor_date` (`actor_user_id`,`created_at`),
  KEY `idx_audit_action_date` (`action`,`created_at`),
  CONSTRAINT `audit_logs_actor_user_id_foreign` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `banners` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(180) NOT NULL,
  `subtitle` varchar(255) DEFAULT NULL,
  `image_key` varchar(500) NOT NULL,
  `alt_text` varchar(255) NOT NULL,
  `target_url` varchar(500) DEFAULT NULL,
  `placement` enum('home_hero','home_featured','search','other') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `starts_at` timestamp NULL DEFAULT NULL,
  `ends_at` timestamp NULL DEFAULT NULL,
  `created_by_user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `banners_created_by_user_id_foreign` (`created_by_user_id`),
  KEY `idx_banners_active_schedule` (`placement`,`is_active`,`starts_at`,`ends_at`),
  CONSTRAINT `banners_created_by_user_id_foreign` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_banners_schedule_range` CHECK (((`ends_at` is null) or (`starts_at` is null) or (`ends_at` > `starts_at`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `blog_posts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `author_user_id` bigint unsigned DEFAULT NULL,
  `title` varchar(220) NOT NULL,
  `slug` varchar(240) NOT NULL,
  `excerpt` text NOT NULL,
  `body` longtext NOT NULL,
  `cover_image_key` varchar(500) DEFAULT NULL,
  `status` enum('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft',
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blog_posts_slug` (`slug`),
  KEY `blog_posts_author_user_id_foreign` (`author_user_id`),
  KEY `idx_blog_posts_publish` (`status`,`published_at`),
  CONSTRAINT `blog_posts_author_user_id_foreign` FOREIGN KEY (`author_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `builder_profiles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `company_name` varchar(180) NOT NULL,
  `company_registration_number` varchar(100) DEFAULT NULL,
  `description` text,
  `approval_status` enum('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_builder_profiles_user` (`user_id`),
  UNIQUE KEY `uq_builder_profiles_registration` (`company_registration_number`),
  KEY `idx_builder_profiles_approval` (`approval_status`),
  CONSTRAINT `builder_profiles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `contact_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(160) NOT NULL,
  `email` varchar(254) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `topic` varchar(60) NOT NULL DEFAULT 'general',
  `message` text NOT NULL,
  `status` enum('new','read','replied','archived') NOT NULL DEFAULT 'new',
  `user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `contact_messages_user_id_foreign` (`user_id`),
  KEY `idx_contact_status_created` (`status`,`created_at`),
  CONSTRAINT `contact_messages_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `enquiry_replies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `message_id` bigint unsigned NOT NULL,
  `author_user_id` bigint unsigned DEFAULT NULL,
  `body` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `enquiry_replies_author_user_id_foreign` (`author_user_id`),
  KEY `idx_replies_message_created` (`message_id`,`created_at`),
  CONSTRAINT `enquiry_replies_author_user_id_foreign` FOREIGN KEY (`author_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `enquiry_replies_message_id_foreign` FOREIGN KEY (`message_id`) REFERENCES `contact_messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `follow_up_activities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `lead_id` bigint unsigned NOT NULL,
  `actor_user_id` bigint unsigned NOT NULL,
  `activity_type` enum('call','email','message','note','status_change','visit_update') NOT NULL,
  `notes` text NOT NULL,
  `next_follow_up_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_followups_lead_date` (`lead_id`,`created_at`),
  KEY `idx_followups_actor_date` (`actor_user_id`,`created_at`),
  CONSTRAINT `follow_up_activities_actor_user_id_foreign` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `follow_up_activities_lead_id_foreign` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `knex_migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `batch` int DEFAULT NULL,
  `migration_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `knex_migrations_lock` (
  `index` int unsigned NOT NULL AUTO_INCREMENT,
  `is_locked` int DEFAULT NULL,
  PRIMARY KEY (`index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `lead_assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `lead_id` bigint unsigned NOT NULL,
  `agent_profile_id` bigint unsigned NOT NULL,
  `assigned_by_user_id` bigint unsigned NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `unassigned_at` timestamp NULL DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`),
  KEY `lead_assignments_assigned_by_user_id_foreign` (`assigned_by_user_id`),
  KEY `idx_lead_assignments_lead_date` (`lead_id`,`assigned_at`),
  KEY `idx_lead_assignments_agent_active` (`agent_profile_id`,`unassigned_at`),
  CONSTRAINT `lead_assignments_agent_profile_id_foreign` FOREIGN KEY (`agent_profile_id`) REFERENCES `agent_profiles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `lead_assignments_assigned_by_user_id_foreign` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `lead_assignments_lead_id_foreign` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `lead_progress` (
  `message_id` bigint unsigned NOT NULL,
  `stage` enum('new','contacted','visit_scheduled','follow_up','closed_won','closed_lost') NOT NULL DEFAULT 'new',
  `property_slug` varchar(200) DEFAULT NULL,
  `owner_user_id` bigint unsigned DEFAULT NULL,
  `assigned_agent_user_id` bigint unsigned DEFAULT NULL,
  `follow_up_at` datetime DEFAULT NULL,
  `follow_up_note` varchar(300) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  KEY `idx_lead_progress_stage` (`stage`),
  KEY `idx_lead_progress_owner` (`owner_user_id`,`stage`),
  KEY `idx_lead_progress_agent` (`assigned_agent_user_id`,`stage`),
  KEY `idx_lead_progress_follow_up` (`follow_up_at`),
  CONSTRAINT `lead_progress_assigned_agent_user_id_foreign` FOREIGN KEY (`assigned_agent_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lead_progress_message_id_foreign` FOREIGN KEY (`message_id`) REFERENCES `contact_messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `lead_progress_owner_user_id_foreign` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `leads` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `property_id` bigint unsigned NOT NULL,
  `customer_user_id` bigint unsigned DEFAULT NULL,
  `contact_name` varchar(160) NOT NULL,
  `phone_e164` varchar(16) NOT NULL,
  `email` varchar(254) DEFAULT NULL,
  `message` text,
  `source` enum('callback','inquiry','whatsapp','site_visit','other') NOT NULL,
  `status` enum('new','contacted','qualified','site_visit_scheduled','closed_won','closed_lost','spam') NOT NULL DEFAULT 'new',
  `consent_at` timestamp NOT NULL,
  `consent_text_version` varchar(40) NOT NULL,
  `idempotency_key` varchar(128) DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_leads_id_property` (`id`,`property_id`),
  UNIQUE KEY `uq_leads_idempotency` (`idempotency_key`),
  KEY `idx_leads_property_status_created` (`property_id`,`status`,`created_at`),
  KEY `idx_leads_customer_created` (`customer_user_id`,`created_at`),
  KEY `idx_leads_phone_created` (`phone_e164`,`created_at`),
  CONSTRAINT `leads_customer_user_id_foreign` FOREIGN KEY (`customer_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `leads_property_id_foreign` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `locations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` bigint unsigned DEFAULT NULL,
  `name` varchar(120) NOT NULL,
  `slug` varchar(140) NOT NULL,
  `location_type` enum('country','state','city','locality') NOT NULL,
  `country_code` varchar(2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_locations_slug` (`slug`),
  KEY `idx_locations_parent_type` (`parent_id`,`location_type`),
  KEY `idx_locations_active_type` (`is_active`,`location_type`),
  CONSTRAINT `locations_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `channel` enum('in_app','email','sms','whatsapp') NOT NULL,
  `provider` varchar(60) DEFAULT NULL,
  `provider_reference` varchar(180) DEFAULT NULL,
  `subject` varchar(200) DEFAULT NULL,
  `body` text NOT NULL,
  `status` enum('queued','sent','delivered','failed','read') NOT NULL DEFAULT 'queued',
  `sent_at` timestamp NULL DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_status_date` (`user_id`,`status`,`created_at`),
  KEY `idx_notifications_delivery` (`channel`,`status`,`created_at`),
  CONSTRAINT `notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `password_resets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_password_resets_token` (`token_hash`),
  KEY `idx_password_resets_user` (`user_id`,`used_at`),
  CONSTRAINT `password_resets_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `payment_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `subscription_id` bigint unsigned DEFAULT NULL,
  `user_id` bigint unsigned NOT NULL,
  `provider` varchar(40) NOT NULL,
  `provider_order_id` varchar(180) DEFAULT NULL,
  `provider_payment_id` varchar(180) DEFAULT NULL,
  `idempotency_key` varchar(128) DEFAULT NULL,
  `amount` decimal(15,2) unsigned NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'INR',
  `status` enum('created','pending','authorized','captured','failed','refunded') NOT NULL DEFAULT 'created',
  `signature_verified_at` timestamp NULL DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `provider_metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_provider_order` (`provider_order_id`),
  UNIQUE KEY `uq_payments_provider_payment` (`provider_payment_id`),
  UNIQUE KEY `uq_payments_idempotency` (`idempotency_key`),
  KEY `idx_payments_user_date` (`user_id`,`created_at`),
  KEY `idx_payments_subscription_status` (`subscription_id`,`status`),
  CONSTRAINT `payment_transactions_subscription_id_foreign` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `payment_transactions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(80) NOT NULL,
  `description` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permissions_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `properties` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `owner_user_id` bigint unsigned DEFAULT NULL,
  `agent_profile_id` bigint unsigned DEFAULT NULL,
  `builder_profile_id` bigint unsigned DEFAULT NULL,
  `location_id` bigint unsigned NOT NULL,
  `title` varchar(180) NOT NULL,
  `slug` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `listing_type` enum('sale','rent','lease') NOT NULL,
  `property_type` enum('apartment','villa','house','plot','office','retail','warehouse','other') NOT NULL,
  `status` enum('draft','pending','published','rejected','archived') NOT NULL DEFAULT 'draft',
  `price` decimal(15,2) unsigned NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'INR',
  `area_sqft` decimal(12,2) unsigned NOT NULL,
  `bedrooms` tinyint unsigned DEFAULT NULL,
  `bathrooms` tinyint unsigned DEFAULT NULL,
  `floor_number` smallint unsigned DEFAULT NULL,
  `total_floors` smallint unsigned DEFAULT NULL,
  `furnishing` enum('unfurnished','semi_furnished','furnished') DEFAULT NULL,
  `possession_status` varchar(80) DEFAULT NULL,
  `rera_number` varchar(100) DEFAULT NULL,
  `rera_verified_at` timestamp NULL DEFAULT NULL,
  `is_featured` tinyint(1) NOT NULL DEFAULT '0',
  `is_demo` tinyint(1) NOT NULL DEFAULT '0',
  `available_from` date DEFAULT NULL,
  `view_count` int unsigned NOT NULL DEFAULT '0',
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_properties_slug` (`slug`),
  KEY `properties_location_id_foreign` (`location_id`),
  KEY `idx_properties_search` (`status`,`listing_type`,`property_type`,`location_id`),
  KEY `idx_properties_price_area` (`price`,`area_sqft`),
  KEY `idx_properties_owner_status` (`owner_user_id`,`status`),
  KEY `idx_properties_agent_status` (`agent_profile_id`,`status`),
  KEY `idx_properties_builder_status` (`builder_profile_id`,`status`),
  KEY `idx_properties_demo_status` (`is_demo`,`status`),
  CONSTRAINT `properties_agent_profile_id_foreign` FOREIGN KEY (`agent_profile_id`) REFERENCES `agent_profiles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `properties_builder_profile_id_foreign` FOREIGN KEY (`builder_profile_id`) REFERENCES `builder_profiles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `properties_location_id_foreign` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `properties_owner_user_id_foreign` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_properties_floor_range` CHECK (((`floor_number` is null) or (`total_floors` is null) or (`floor_number` <= `total_floors`))),
  CONSTRAINT `chk_properties_positive_area` CHECK ((`area_sqft` > 0)),
  CONSTRAINT `chk_properties_positive_price` CHECK ((`price` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `property_amenities` (
  `property_id` bigint unsigned NOT NULL,
  `amenity_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`property_id`,`amenity_id`),
  KEY `property_amenities_amenity_id_foreign` (`amenity_id`),
  CONSTRAINT `property_amenities_amenity_id_foreign` FOREIGN KEY (`amenity_id`) REFERENCES `amenities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `property_amenities_property_id_foreign` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `property_details` (
  `property_id` bigint unsigned NOT NULL,
  `tag` varchar(80) DEFAULT NULL,
  `type_label` varchar(80) NOT NULL,
  `location_label` varchar(180) NOT NULL,
  `city_label` varchar(80) NOT NULL,
  `is_luxury` tinyint(1) NOT NULL DEFAULT '0',
  `is_new_project` tinyint(1) NOT NULL DEFAULT '0',
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `facing` varchar(80) DEFAULT NULL,
  `floor_label` varchar(80) DEFAULT NULL,
  `parking` varchar(80) DEFAULT NULL,
  `age_years` smallint unsigned DEFAULT NULL,
  `palette` varchar(20) DEFAULT NULL,
  `highlights` text,
  PRIMARY KEY (`property_id`),
  KEY `idx_property_details_city` (`city_label`),
  KEY `idx_property_details_flags` (`is_luxury`,`is_new_project`),
  CONSTRAINT `property_details_property_id_foreign` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `property_images` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `property_id` bigint unsigned NOT NULL,
  `storage_key` varchar(500) NOT NULL,
  `storage_provider` enum('local','cloudinary') NOT NULL DEFAULT 'local',
  `alt_text` varchar(255) NOT NULL,
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `is_cover` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_property_images_order` (`property_id`,`sort_order`),
  KEY `idx_property_images_cover` (`property_id`,`is_cover`),
  CONSTRAINT `property_images_property_id_foreign` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `recently_viewed_properties` (
  `user_id` bigint unsigned NOT NULL,
  `property_id` bigint unsigned NOT NULL,
  `viewed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`property_id`),
  KEY `recently_viewed_properties_property_id_foreign` (`property_id`),
  KEY `idx_recent_views_user_viewed` (`user_id`,`viewed_at`),
  CONSTRAINT `recently_viewed_properties_property_id_foreign` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE,
  CONSTRAINT `recently_viewed_properties_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `reviews` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `property_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `rating` tinyint unsigned NOT NULL,
  `title` varchar(160) NOT NULL,
  `body` text NOT NULL,
  `status` enum('pending','published','rejected','hidden') NOT NULL DEFAULT 'pending',
  `moderated_at` timestamp NULL DEFAULT NULL,
  `moderated_by_user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reviews_property_user` (`property_id`,`user_id`),
  KEY `reviews_user_id_foreign` (`user_id`),
  KEY `reviews_moderated_by_user_id_foreign` (`moderated_by_user_id`),
  KEY `idx_reviews_property_status` (`property_id`,`status`,`created_at`),
  CONSTRAINT `reviews_moderated_by_user_id_foreign` FOREIGN KEY (`moderated_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `reviews_property_id_foreign` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reviews_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_reviews_rating_range` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `role_permissions` (
  `role_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `role_permissions_permission_id_foreign` (`permission_id`),
  CONSTRAINT `role_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(40) NOT NULL,
  `description` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `saved_properties` (
  `user_id` bigint unsigned NOT NULL,
  `property_id` bigint unsigned NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`property_id`),
  KEY `idx_saved_property_created` (`property_id`,`created_at`),
  CONSTRAINT `saved_properties_property_id_foreign` FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE CASCADE,
  CONSTRAINT `saved_properties_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `sessions` (
  `id` varchar(128) NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `data` text NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sessions_user_expiry` (`user_id`,`expires_at`),
  KEY `idx_sessions_expiry` (`expires_at`),
  CONSTRAINT `sessions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `site_visits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `lead_id` bigint unsigned NOT NULL,
  `property_id` bigint unsigned NOT NULL,
  `requested_by_user_id` bigint unsigned DEFAULT NULL,
  `assigned_agent_profile_id` bigint unsigned DEFAULT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime DEFAULT NULL,
  `status` enum('requested','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'requested',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `site_visits_requested_by_user_id_foreign` (`requested_by_user_id`),
  KEY `site_visits_lead_id_property_id_foreign` (`lead_id`,`property_id`),
  KEY `idx_visits_property_schedule` (`property_id`,`starts_at`,`status`),
  KEY `idx_visits_agent_schedule` (`assigned_agent_profile_id`,`starts_at`),
  KEY `idx_visits_lead_created` (`lead_id`,`created_at`),
  CONSTRAINT `site_visits_assigned_agent_profile_id_foreign` FOREIGN KEY (`assigned_agent_profile_id`) REFERENCES `agent_profiles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `site_visits_lead_id_property_id_foreign` FOREIGN KEY (`lead_id`, `property_id`) REFERENCES `leads` (`id`, `property_id`) ON DELETE RESTRICT,
  CONSTRAINT `site_visits_requested_by_user_id_foreign` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_site_visits_time_range` CHECK (((`ends_at` is null) or (`ends_at` > `starts_at`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `subscription_plans` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `description` text NOT NULL,
  `billing_cycle` enum('monthly','quarterly','annual') NOT NULL,
  `price` decimal(12,2) unsigned NOT NULL,
  `currency` varchar(3) NOT NULL DEFAULT 'INR',
  `listing_limit` smallint unsigned NOT NULL DEFAULT '0',
  `features` json NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_demo` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_subscription_plans_name` (`name`),
  UNIQUE KEY `uq_subscription_plans_slug` (`slug`),
  KEY `idx_subscription_plans_active_cycle` (`is_active`,`billing_cycle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `subscriptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `plan_id` bigint unsigned NOT NULL,
  `status` enum('pending','trialing','active','past_due','cancelled','expired') NOT NULL DEFAULT 'pending',
  `starts_at` timestamp NULL DEFAULT NULL,
  `ends_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `subscriptions_plan_id_foreign` (`plan_id`),
  KEY `idx_subscriptions_user_status` (`user_id`,`status`),
  KEY `idx_subscriptions_status_expiry` (`status`,`ends_at`),
  CONSTRAINT `subscriptions_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `subscriptions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `user_roles` (
  `user_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `user_roles_role_id_foreign` (`role_id`),
  CONSTRAINT `user_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(254) DEFAULT NULL,
  `phone_e164` varchar(16) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(80) NOT NULL,
  `last_name` varchar(80) DEFAULT NULL,
  `status` enum('pending','active','suspended','deleted') NOT NULL DEFAULT 'pending',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `phone_verified_at` timestamp NULL DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_phone_e164` (`phone_e164`),
  KEY `idx_users_status_created` (`status`,`created_at`),
  CONSTRAINT `chk_users_contact_method` CHECK (((`email` is not null) or (`phone_e164` is not null)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `visit_schedules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `message_id` bigint unsigned NOT NULL,
  `property_slug` varchar(200) DEFAULT NULL,
  `property_title` varchar(180) DEFAULT NULL,
  `agent_user_id` bigint unsigned DEFAULT NULL,
  `scheduled_at` datetime NOT NULL,
  `status` enum('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_visit_schedules_when` (`scheduled_at`,`status`),
  KEY `idx_visit_schedules_agent` (`agent_user_id`,`scheduled_at`),
  KEY `idx_visit_schedules_message` (`message_id`),
  CONSTRAINT `visit_schedules_agent_user_id_foreign` FOREIGN KEY (`agent_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `visit_schedules_message_id_foreign` FOREIGN KEY (`message_id`) REFERENCES `contact_messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

LOCK TABLES `knex_migrations` WRITE;
/*!40000 ALTER TABLE `knex_migrations` DISABLE KEYS */;
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (1,'202610090001_create_identity_and_catalog.js',1,'2026-10-12 22:43:45'),(2,'202610090002_create_customer_and_lead_workflows.js',1,'2026-10-12 22:43:47'),(3,'202610090003_create_commerce_and_publishing.js',1,'2026-10-12 22:43:49'),(4,'202610120001_create_contact_messages.js',1,'2026-10-12 22:43:50'),(5,'202610130001_create_property_details.js',1,'2026-10-12 22:43:50'),(6,'202610140001_create_engagement.js',2,'2026-10-12 23:36:49'),(7,'202610150001_create_lead_progress.js',3,'2026-10-12 23:57:54'),(8,'202610160001_create_password_resets.js',4,'2026-10-14 00:20:14');
/*!40000 ALTER TABLE `knex_migrations` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES (1,'customer','Property seeker or buyer.','2026-10-13 04:13:50','2026-10-13 04:13:50'),(2,'agent','Approved property agent.','2026-10-13 04:13:50','2026-10-13 04:13:50'),(3,'builder','Approved property developer.','2026-10-13 04:13:50','2026-10-13 04:13:50'),(4,'admin','Marketplace administrator.','2026-10-13 04:13:50','2026-10-13 04:13:50');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES (1,'property:read','Read published property listings.','2026-10-13 04:13:50','2026-10-13 04:13:50'),(2,'property:manage','Manage owned property listings.','2026-10-13 04:13:50','2026-10-13 04:13:50'),(3,'property:moderate','Moderate property listings.','2026-10-13 04:13:50','2026-10-13 04:13:50'),(4,'lead:read','Read leads assigned to the user.','2026-10-13 04:13:50','2026-10-13 04:13:50'),(5,'lead:manage','Manage assigned leads and follow-ups.','2026-10-13 04:13:50','2026-10-13 04:13:50'),(6,'lead:assign','Assign leads to agents.','2026-10-13 04:13:50','2026-10-13 04:13:50'),(7,'user:manage','Manage marketplace user accounts.','2026-10-13 04:13:50','2026-10-13 04:13:50'),(8,'subscription:manage','Manage subscription plans.','2026-10-13 04:13:50','2026-10-13 04:13:50'),(9,'content:manage','Manage editorial content and banners.','2026-10-13 04:13:50','2026-10-13 04:13:50'),(10,'audit:read','Read administrative audit records.','2026-10-13 04:13:50','2026-10-13 04:13:50');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` (`role_id`, `permission_id`) VALUES (1,1),(2,1),(3,1),(4,1),(2,2),(3,2),(4,2),(4,3),(2,4),(3,4),(4,4),(2,5),(3,5),(4,5),(4,6),(4,7),(4,8),(4,9),(4,10);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `locations` WRITE;
/*!40000 ALTER TABLE `locations` DISABLE KEYS */;
INSERT INTO `locations` (`id`, `parent_id`, `name`, `slug`, `location_type`, `country_code`, `is_active`, `created_at`, `updated_at`) VALUES (1,NULL,'India','india','country','IN',1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(2,1,'Karnataka','karnataka','state',NULL,1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(3,1,'Maharashtra','maharashtra','state',NULL,1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(4,2,'Bengaluru','bengaluru','city',NULL,1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(5,3,'Mumbai','mumbai','city',NULL,1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(6,3,'Pune','pune','city',NULL,1,'2026-10-13 04:13:50','2026-10-13 04:13:51'),(7,4,'Whitefield','whitefield','locality',NULL,1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(8,5,'Bandra West','bandra-west','locality',NULL,1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(9,6,'Koregaon Park','koregaon-park','locality',NULL,1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(10,1,'Alibaug','alibaug','city',NULL,1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(13,1,'Kochi','kochi','city',NULL,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(15,1,'Delhi NCR','delhi-ncr','city',NULL,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(16,1,'Hyderabad','hyderabad','city',NULL,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(17,1,'Goa','goa','city',NULL,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(18,1,'Chennai','chennai','city',NULL,1,'2026-10-13 04:13:51','2026-10-13 04:13:51');
/*!40000 ALTER TABLE `locations` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `amenities` WRITE;
/*!40000 ALTER TABLE `amenities` DISABLE KEYS */;
INSERT INTO `amenities` (`id`, `name`, `slug`, `category`, `is_active`, `created_at`, `updated_at`) VALUES (1,'24-hour security','24-hour-security','security',1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(2,'Clubhouse','clubhouse','community',1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(3,'Covered parking','covered-parking','parking',1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(4,'Fitness centre','fitness-centre','wellness',1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(5,'Garden','garden','outdoor',1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(6,'Power backup','power-backup','utilities',1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(7,'Swimming pool','swimming-pool','wellness',1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(8,'Visitor parking','visitor-parking','parking',1,'2026-10-13 04:13:50','2026-10-13 04:13:50');
/*!40000 ALTER TABLE `amenities` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `subscription_plans` WRITE;
/*!40000 ALTER TABLE `subscription_plans` DISABLE KEYS */;
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `description`, `billing_cycle`, `price`, `currency`, `listing_limit`, `features`, `is_active`, `is_demo`, `created_at`, `updated_at`) VALUES (1,'Essentials','essentials','A simple starting point for a small property portfolio.','monthly',0.00,'INR',3,'[\"3 active listings\", \"Basic lead inbox\"]',1,0,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(2,'Studio','studio','More room for independent property professionals.','monthly',2499.00,'INR',20,'[\"20 active listings\", \"Lead management\"]',1,0,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(3,'Portfolio','portfolio','A larger listing allowance for growing property teams.','monthly',7999.00,'INR',100,'[\"100 active listings\", \"Team lead workflow\"]',1,0,'2026-10-13 04:13:50','2026-10-13 04:13:50');
/*!40000 ALTER TABLE `subscription_plans` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

LOCK TABLES `properties` WRITE;
/*!40000 ALTER TABLE `properties` DISABLE KEYS */;
INSERT INTO `properties` (`id`, `owner_user_id`, `agent_profile_id`, `builder_profile_id`, `location_id`, `title`, `slug`, `description`, `listing_type`, `property_type`, `status`, `price`, `currency`, `area_sqft`, `bedrooms`, `bathrooms`, `floor_number`, `total_floors`, `furnishing`, `possession_status`, `rera_number`, `rera_verified_at`, `is_featured`, `is_demo`, `available_from`, `view_count`, `published_at`, `created_at`, `updated_at`) VALUES (1,NULL,NULL,NULL,10,'The Courtyard House','alibaug-courtyard','A quiet, light-filled retreat shaped around a private garden, with limewashed walls and long verandahs made for slow afternoons.','sale','villa','published',48500000.00,'INR',3240.00,4,4,NULL,NULL,'semi_furnished','Ready to move',NULL,NULL,1,0,NULL,9,'2026-10-13 04:13:50','2026-10-13 04:13:50','2026-10-13 04:13:50'),(2,NULL,NULL,NULL,5,'House on the Palm Avenue','juhu-residence','An expansive, considered home above the tree canopy, with a deep balcony and a rare west-facing view of the Arabian Sea.','sale','apartment','published',92500000.00,'INR',2180.00,3,3,NULL,NULL,'unfurnished','Ready to move',NULL,NULL,1,0,NULL,47,'2026-10-13 04:13:50','2026-10-13 04:13:50','2026-10-13 04:13:50'),(3,NULL,NULL,NULL,4,'A Garden in Indiranagar','bengaluru-courtyard','A leafy independent home where generous openings and a sheltered central courtyard bring the garden into everyday life.','sale','house','published',64000000.00,'INR',2860.00,4,3,NULL,NULL,'semi_furnished','Under construction, ready in 8 months',NULL,NULL,0,0,NULL,1,'2026-10-13 04:13:51','2026-10-13 04:13:51','2026-10-13 04:13:51'),(4,NULL,NULL,NULL,13,'The Old Harbour House','fort-kochi-residence','A carefully restored waterfront residence with high timber ceilings, a shaded inner court and a view into old Kochi.','rent','house','published',165000.00,'INR',2040.00,3,3,NULL,NULL,'furnished','Available now',NULL,NULL,0,0,NULL,0,'2026-10-13 04:13:51','2026-10-13 04:13:51','2026-10-13 04:13:51'),(5,NULL,NULL,NULL,5,'A Quiet Address on Pali Hill','pali-hill-apartment','An understated, furnished residence tucked along a leafy lane, with soft morning light and a deeply private balcony.','rent','apartment','published',285000.00,'INR',1920.00,3,3,NULL,NULL,'furnished','Available now',NULL,NULL,0,0,NULL,0,'2026-10-13 04:13:51','2026-10-13 04:13:51','2026-10-13 04:13:51'),(6,NULL,NULL,NULL,6,'The Atelier at Koregaon Park','pune-studio','A calm, generous studio with a separate work nook, oak-toned finishes and an address close to the best of the neighbourhood.','rent','apartment','published',75000.00,'INR',840.00,1,1,NULL,NULL,'semi_furnished','Available now',NULL,NULL,0,0,NULL,0,'2026-10-13 04:13:51','2026-10-13 04:13:51','2026-10-13 04:13:51'),(7,NULL,NULL,NULL,4,'Courtyard Works','whitefield-workspace','A bright, flexible workspace arranged around a planted courtyard, with room for a growing independent team.','lease','office','published',360000.00,'INR',4400.00,NULL,2,NULL,NULL,'semi_furnished','Available now',NULL,NULL,0,0,NULL,0,'2026-10-13 04:13:51','2026-10-13 04:13:51','2026-10-13 04:13:51'),(8,NULL,NULL,NULL,5,'The Mill District Studio','lower-parel-studio','A distinctive street-level space with tall windows and a beautiful old brick shell, suited to a thoughtful retail or studio concept.','lease','retail','published',225000.00,'INR',1280.00,NULL,1,NULL,NULL,'unfurnished','Available now',NULL,NULL,0,0,NULL,1,'2026-10-13 04:13:51','2026-10-13 04:13:51','2026-10-13 04:13:51'),(9,NULL,NULL,NULL,5,'The Sky Penthouse, Worli','worli-sky-penthouse','A full-floor penthouse with 270-degree views of the Sea Link and skyline, a private terrace pool and concierge service.','sale','apartment','published',185000000.00,'INR',4650.00,5,6,NULL,NULL,'furnished','Ready to move',NULL,NULL,1,0,NULL,5,'2026-10-13 04:13:51','2026-10-13 04:13:51','2026-10-13 04:13:51'),(10,NULL,NULL,NULL,15,'Garden Estate Villa','gurugram-garden-villa','A grand villa in a low-density gated estate, with a landscaped lawn, home theatre and a separate guest wing.','sale','villa','published',112000000.00,'INR',6100.00,5,6,NULL,NULL,'semi_furnished','Ready to move',NULL,NULL,1,0,NULL,1,'2026-10-13 04:13:51','2026-10-13 04:13:51','2026-10-13 04:13:51'),(11,NULL,NULL,NULL,16,'Lakeview Residences, Phase 1','hyderabad-lakeview-launch','A pre-launch tower of three- and four-bedroom homes overlooking a lake, with a podium garden and co-working lounge.','sale','apartment','published',17500000.00,'INR',1850.00,3,3,NULL,NULL,'unfurnished','Possession in 24 months',NULL,NULL,0,0,NULL,1,'2026-10-13 04:13:51','2026-10-13 04:13:51','2026-10-13 04:13:51'),(12,NULL,NULL,NULL,17,'Casa Azul, Candolim','goa-beach-villa','A Portuguese-inspired pool villa a short walk from the beach, with shaded verandahs, a mature garden and a separate studio.','sale','villa','published',78000000.00,'INR',3800.00,4,5,NULL,NULL,'furnished','Ready to move',NULL,NULL,1,0,NULL,1,'2026-10-13 04:13:51','2026-10-13 04:13:51','2026-10-13 04:13:51'),(13,NULL,NULL,NULL,6,'Baner Hillside Homes','pune-baner-launch','Hillside apartments with deep balconies and a landscaped central green, close to schools and the Baner-Balewadi tech corridor.','sale','apartment','published',14200000.00,'INR',1420.00,3,2,NULL,NULL,'unfurnished','Possession in 18 months',NULL,NULL,0,0,NULL,1,'2026-10-13 04:13:51','2026-10-13 04:13:51','2026-10-13 04:13:51'),(14,NULL,NULL,NULL,18,'Seaview Apartment, ECR','chennai-seaview-rent','A breezy sea-facing apartment with a long balcony, modular kitchen and fitted wardrobes in a quiet beachside community.','rent','apartment','published',95000.00,'INR',1650.00,3,3,NULL,NULL,'semi_furnished','Available now',NULL,NULL,0,0,NULL,1,'2026-10-13 04:13:51','2026-10-13 04:13:51','2026-10-13 04:13:51'),(15,NULL,NULL,NULL,15,'Skyline Business Floors','noida-tech-office','A full Grade-A floor with glass facade, central air-conditioning, conference suites and metro connectivity.','lease','office','published',520000.00,'INR',6200.00,NULL,4,NULL,NULL,'semi_furnished','Available now',NULL,NULL,0,0,NULL,2,'2026-10-13 04:13:51','2026-10-13 04:13:51','2026-10-13 04:13:51');
/*!40000 ALTER TABLE `properties` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

LOCK TABLES `property_details` WRITE;
/*!40000 ALTER TABLE `property_details` DISABLE KEYS */;
INSERT INTO `property_details` (`property_id`, `tag`, `type_label`, `location_label`, `city_label`, `is_luxury`, `is_new_project`, `is_verified`, `facing`, `floor_label`, `parking`, `age_years`, `palette`, `highlights`) VALUES (1,'Coastal retreat','Villa','Kihim, Alibaug','Alibaug',1,0,1,'West','Ground + 1','3 covered',2,'sand','[\"Private courtyard garden\",\"10-minute walk to Kihim beach\",\"Double-height living room\",\"Staff quarters\"]'),(2,'Sea-facing','Apartment','Juhu, Mumbai','Mumbai',1,0,1,'West (sea view)','14 of 22','2 covered',4,'clay','[\"Uninterrupted sea view\",\"Deep wraparound balcony\",\"Private lift lobby\",\"Walk to Juhu beach\"]'),(3,'Garden home','Independent house','Indiranagar, Bengaluru','Bengaluru',0,1,1,'East','Ground + 2','2 covered',0,'sage','[\"Central courtyard\",\"Mature garden\",\"Rooftop terrace\",\"Quiet tree-lined lane\"]'),(4,'Restored heritage','Heritage home','Fort Kochi, Kochi','Kochi',0,0,1,'North','Ground + 1','1 covered',90,'ochre','[\"Restored teak ceilings\",\"Shaded inner court\",\"Harbour views\",\"Walk to the waterfront\"]'),(5,'Furnished','Apartment','Bandra West, Mumbai','Mumbai',0,0,1,'South-east','6 of 9','1 covered',6,'rose','[\"Fully furnished\",\"Leafy, quiet lane\",\"Private balcony\",\"Walk to Bandra cafés\"]'),(6,'Move-in ready','Studio','Koregaon Park, Pune','Pune',0,0,0,'North','3 of 5','1 open',8,'blue','[\"Separate work nook\",\"Oak-toned finishes\",\"Walk to cafés\",\"Quiet courtyard\"]'),(7,'Garden office','Office','Whitefield, Bengaluru','Bengaluru',0,0,1,'North-east','2 of 3','12 covered',3,'sage','[\"Planted central courtyard\",\"Flexible floor plate\",\"Meeting rooms\",\"Cafeteria\"]'),(8,'Street-level','Retail / studio','Lower Parel, Mumbai','Mumbai',0,0,0,'East','Ground','Street',60,'clay','[\"Original brick shell\",\"Tall street windows\",\"High footfall\",\"Mezzanine storage\"]'),(9,'Signature residence','Penthouse','Worli, Mumbai','Mumbai',1,0,1,'West (sea link)','42 of 44','4 covered',1,'blue','[\"Private terrace pool\",\"270-degree skyline views\",\"Private elevator\",\"Concierge service\"]'),(10,'Gated estate','Villa','Golf Course Road, Gurugram','Delhi NCR',1,0,1,'North-east','Ground + 2','4 covered',3,'sage','[\"Landscaped half-acre lawn\",\"Home theatre\",\"Separate guest wing\",\"Golf-course frontage\"]'),(11,'New launch','Apartment','Gachibowli, Hyderabad','Hyderabad',0,1,1,'Lake-facing','Towers up to 32 floors','2 covered',0,'sand','[\"Lake-facing homes\",\"Podium garden\",\"Co-working lounge\",\"Metro 600 m away\"]'),(12,'Pool villa','Villa','Candolim, Goa','Goa',1,0,0,'South','Ground + 1','3 covered',5,'ochre','[\"Private pool\",\"Walk to Candolim beach\",\"Separate studio\",\"Mature tropical garden\"]'),(13,'New launch','Apartment','Baner, Pune','Pune',0,1,1,'Hill-facing','Towers up to 18 floors','1 covered',0,'rose','[\"Hill-facing balconies\",\"Central landscaped green\",\"Near top schools\",\"Tech corridor access\"]'),(14,'Sea view','Apartment','East Coast Road, Chennai','Chennai',0,0,1,'East (sea view)','9 of 14','2 covered',5,'blue','[\"Sea-facing balcony\",\"Modular kitchen\",\"Fitted wardrobes\",\"Beach access\"]'),(15,'Grade-A office','Office','Sector 62, Noida','Delhi NCR',0,0,1,'North','7 of 12','20 covered',2,'sage','[\"Full floor, Grade-A\",\"Conference suites\",\"Metro connectivity\",\"100% power backup\"]'),(23,'Beach-facing','House','Hinjewadi','Pune',1,0,1,NULL,NULL,NULL,NULL,NULL,'[\"Walk to metro\"]');
/*!40000 ALTER TABLE `property_details` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `property_images` WRITE;
/*!40000 ALTER TABLE `property_images` DISABLE KEYS */;
INSERT INTO `property_images` (`id`, `property_id`, `storage_key`, `storage_provider`, `alt_text`, `sort_order`, `is_cover`, `created_at`, `updated_at`) VALUES (1,1,'unsplash/1600596542815-ffad4c1539a9','local','The Courtyard House, photo 1',0,1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(2,1,'unsplash/1600585154526-990dced4db0d','local','The Courtyard House, photo 2',1,0,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(3,1,'unsplash/1600566752355-35792bedcfea','local','The Courtyard House, photo 3',2,0,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(4,1,'unsplash/1600573472550-8090b5e0745e','local','The Courtyard House, photo 4',3,0,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(5,1,'unsplash/1613977257363-707ba9348227','local','The Courtyard House, photo 5',4,0,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(6,2,'unsplash/1613490493576-7fde63acd811','local','House on the Palm Avenue, photo 1',0,1,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(7,2,'unsplash/1600607687939-ce8a6c25118c','local','House on the Palm Avenue, photo 2',1,0,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(8,2,'unsplash/1613977257363-707ba9348227','local','House on the Palm Avenue, photo 3',2,0,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(9,2,'unsplash/1600585154340-be6161a56a0c','local','House on the Palm Avenue, photo 4',3,0,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(10,2,'unsplash/1570129477492-45c003edd2be','local','House on the Palm Avenue, photo 5',4,0,'2026-10-13 04:13:50','2026-10-13 04:13:50'),(11,3,'unsplash/1512917774080-9991f1c4c750','local','A Garden in Indiranagar, photo 1',0,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(12,3,'unsplash/1600566752355-35792bedcfea','local','A Garden in Indiranagar, photo 2',1,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(13,3,'unsplash/1600573472550-8090b5e0745e','local','A Garden in Indiranagar, photo 3',2,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(14,3,'unsplash/1600596542815-ffad4c1539a9','local','A Garden in Indiranagar, photo 4',3,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(15,3,'unsplash/1613977257363-707ba9348227','local','A Garden in Indiranagar, photo 5',4,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(16,4,'unsplash/1600607687939-ce8a6c25118c','local','The Old Harbour House, photo 1',0,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(17,4,'unsplash/1600607686527-6fb886090705','local','The Old Harbour House, photo 2',1,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(18,4,'unsplash/1600607687644-c7171b42498f','local','The Old Harbour House, photo 3',2,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(19,4,'unsplash/1600585154363-67eb9e2e2099','local','The Old Harbour House, photo 4',3,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(20,4,'unsplash/1613977257363-707ba9348227','local','The Old Harbour House, photo 5',4,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(21,5,'unsplash/1600585154340-be6161a56a0c','local','A Quiet Address on Pali Hill, photo 1',0,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(22,5,'unsplash/1560448204-e02f11c3d0e2','local','A Quiet Address on Pali Hill, photo 2',1,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(23,5,'unsplash/1613977257363-707ba9348227','local','A Quiet Address on Pali Hill, photo 3',2,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(24,5,'unsplash/1502672260266-1c1ef2d93688','local','A Quiet Address on Pali Hill, photo 4',3,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(25,5,'unsplash/1618221195710-dd6b41faaea6','local','A Quiet Address on Pali Hill, photo 5',4,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(26,6,'unsplash/1600047509807-ba8f99d2cdde','local','The Atelier at Koregaon Park, photo 1',0,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(27,6,'unsplash/1560448204-e02f11c3d0e2','local','The Atelier at Koregaon Park, photo 2',1,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(28,6,'unsplash/1502672260266-1c1ef2d93688','local','The Atelier at Koregaon Park, photo 3',2,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(29,6,'unsplash/1618221195710-dd6b41faaea6','local','The Atelier at Koregaon Park, photo 4',3,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(30,6,'unsplash/1613977257363-707ba9348227','local','The Atelier at Koregaon Park, photo 5',4,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(31,7,'unsplash/1497366216548-37526070297c','local','Courtyard Works, photo 1',0,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(32,7,'unsplash/1486406146926-c627a92ad1ab','local','Courtyard Works, photo 2',1,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(33,7,'unsplash/1600566753190-17f0baa2a6c3','local','Courtyard Works, photo 3',2,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(34,7,'unsplash/1600573472550-8090b5e0745e','local','Courtyard Works, photo 4',3,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(35,7,'unsplash/1613977257363-707ba9348227','local','Courtyard Works, photo 5',4,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(36,8,'unsplash/1486406146926-c627a92ad1ab','local','The Mill District Studio, photo 1',0,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(37,8,'unsplash/1497366216548-37526070297c','local','The Mill District Studio, photo 2',1,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(38,8,'unsplash/1600566753190-17f0baa2a6c3','local','The Mill District Studio, photo 3',2,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(39,8,'unsplash/1600573472550-8090b5e0745e','local','The Mill District Studio, photo 4',3,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(40,8,'unsplash/1613977257363-707ba9348227','local','The Mill District Studio, photo 5',4,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(41,9,'unsplash/1600607687920-4e2a09cf159d','local','The Sky Penthouse, Worli, photo 1',0,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(42,9,'unsplash/1613490493576-7fde63acd811','local','The Sky Penthouse, Worli, photo 2',1,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(43,9,'unsplash/1512917774080-9991f1c4c750','local','The Sky Penthouse, Worli, photo 3',2,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(44,9,'unsplash/1613977257363-707ba9348227','local','The Sky Penthouse, Worli, photo 4',3,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(45,9,'unsplash/1570129477492-45c003edd2be','local','The Sky Penthouse, Worli, photo 5',4,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(46,10,'unsplash/1613977257363-707ba9348227','local','Garden Estate Villa, photo 1',0,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(47,10,'unsplash/1600596542815-ffad4c1539a9','local','Garden Estate Villa, photo 2',1,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(48,10,'unsplash/1600585154526-990dced4db0d','local','Garden Estate Villa, photo 3',2,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(49,10,'unsplash/1600566752355-35792bedcfea','local','Garden Estate Villa, photo 4',3,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(50,10,'unsplash/1512917774080-9991f1c4c750','local','Garden Estate Villa, photo 5',4,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(51,11,'unsplash/1600566753086-00f18fb6b3ea','local','Lakeview Residences, Phase 1, photo 1',0,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(52,11,'unsplash/1600585154340-be6161a56a0c','local','Lakeview Residences, Phase 1, photo 2',1,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(53,11,'unsplash/1560448204-e02f11c3d0e2','local','Lakeview Residences, Phase 1, photo 3',2,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(54,11,'unsplash/1613977257363-707ba9348227','local','Lakeview Residences, Phase 1, photo 4',3,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(55,11,'unsplash/1600607687920-4e2a09cf159d','local','Lakeview Residences, Phase 1, photo 5',4,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(56,12,'unsplash/1512917774080-9991f1c4c750','local','Casa Azul, Candolim, photo 1',0,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(57,12,'unsplash/1600585154526-990dced4db0d','local','Casa Azul, Candolim, photo 2',1,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(58,12,'unsplash/1613490493576-7fde63acd811','local','Casa Azul, Candolim, photo 3',2,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(59,12,'unsplash/1600596542815-ffad4c1539a9','local','Casa Azul, Candolim, photo 4',3,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(60,12,'unsplash/1613977257363-707ba9348227','local','Casa Azul, Candolim, photo 5',4,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(61,13,'unsplash/1600585154340-be6161a56a0c','local','Baner Hillside Homes, photo 1',0,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(62,13,'unsplash/1600566753086-00f18fb6b3ea','local','Baner Hillside Homes, photo 2',1,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(63,13,'unsplash/1560448204-e02f11c3d0e2','local','Baner Hillside Homes, photo 3',2,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(64,13,'unsplash/1502672260266-1c1ef2d93688','local','Baner Hillside Homes, photo 4',3,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(65,13,'unsplash/1618221195710-dd6b41faaea6','local','Baner Hillside Homes, photo 5',4,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(66,14,'unsplash/1600607687939-ce8a6c25118c','local','Seaview Apartment, ECR, photo 1',0,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(67,14,'unsplash/1560448204-e02f11c3d0e2','local','Seaview Apartment, ECR, photo 2',1,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(68,14,'unsplash/1502672260266-1c1ef2d93688','local','Seaview Apartment, ECR, photo 3',2,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(69,14,'unsplash/1618221195710-dd6b41faaea6','local','Seaview Apartment, ECR, photo 4',3,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(70,14,'unsplash/1613977257363-707ba9348227','local','Seaview Apartment, ECR, photo 5',4,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(71,15,'unsplash/1486406146926-c627a92ad1ab','local','Skyline Business Floors, photo 1',0,1,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(72,15,'unsplash/1497366216548-37526070297c','local','Skyline Business Floors, photo 2',1,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(73,15,'unsplash/1600566753190-17f0baa2a6c3','local','Skyline Business Floors, photo 3',2,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(74,15,'unsplash/1600607687920-4e2a09cf159d','local','Skyline Business Floors, photo 4',3,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(75,15,'unsplash/1613977257363-707ba9348227','local','Skyline Business Floors, photo 5',4,0,'2026-10-13 04:13:51','2026-10-13 04:13:51'),(83,23,'unsplash//uploads/properties/6b989e10ef45644e0f4a0c04.jpg','local','Sunlit 3BHK, photo 1',0,1,'2026-10-13 09:05:21','2026-10-13 09:05:21');
/*!40000 ALTER TABLE `property_images` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `property_amenities` WRITE;
/*!40000 ALTER TABLE `property_amenities` DISABLE KEYS */;
INSERT INTO `property_amenities` (`property_id`, `amenity_id`) VALUES (1,1),(2,1),(3,1),(5,1),(6,1),(7,1),(8,1),(9,1),(10,1),(11,1),(12,1),(13,1),(14,1),(15,1),(23,1),(2,2),(9,2),(10,2),(11,2),(13,2),(23,2),(1,3),(2,3),(3,3),(4,3),(5,3),(7,3),(9,3),(10,3),(11,3),(12,3),(13,3),(14,3),(15,3),(2,4),(5,4),(9,4),(10,4),(11,4),(13,4),(14,4),(1,5),(3,5),(4,5),(10,5),(11,5),(12,5),(13,5),(1,6),(2,6),(3,6),(4,6),(5,6),(6,6),(7,6),(8,6),(9,6),(10,6),(11,6),(12,6),(13,6),(14,6),(15,6),(1,7),(2,7),(9,7),(10,7),(11,7),(12,7),(14,7),(23,7),(6,8),(7,8),(15,8),(23,8);
/*!40000 ALTER TABLE `property_amenities` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

SET FOREIGN_KEY_CHECKS=1;
