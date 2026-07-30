-- MySQL dump 10.13  Distrib 9.5.0, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: medisys_hmis
-- ------------------------------------------------------
-- Server version	8.0.46

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

--
-- Table structure for table `hospitals`
--

DROP TABLE IF EXISTS `hospitals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hospitals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `license_number` varchar(100) DEFAULT NULL,
  `pan` varchar(20) DEFAULT NULL,
  `hfr_id` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `pincode` varchar(12) DEFAULT NULL,
  `bed_count` int DEFAULT NULL,
  `opd_volume` int DEFAULT NULL,
  `admin_name` varchar(150) DEFAULT NULL,
  `admin_email` varchar(150) NOT NULL,
  `modules` json DEFAULT NULL,
  `dpdp_consent` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('pending_activation','active') NOT NULL DEFAULT 'pending_activation',
  `invite_token` varchar(64) DEFAULT NULL,
  `invite_sent_at` timestamp NULL DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `db_name` varchar(150) DEFAULT NULL,
  `short_code` varchar(10) DEFAULT NULL,
  `admin_user_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hospitals`
--

LOCK TABLES `hospitals` WRITE;
/*!40000 ALTER TABLE `hospitals` DISABLE KEYS */;
INSERT INTO `hospitals` VALUES (10,'City Hospital Ghatkopar',NULL,NULL,NULL,'A-704, Regnecy Garden Purnima Kalyan west','Kalyan','Maharashtra','421301',NULL,NULL,'Rashmi Shetty','rashmi.shetty@core5.co.in','[\"opd\", \"radiology\", \"billing\", \"pharmacy\", \"pathology\", \"laboratory\"]',1,'active',NULL,NULL,'C5-202226','2026-07-29 11:17:01','medisys_h10_city_hospital_ghatkopar','CHG','AD-CHG-64701');
/*!40000 ALTER TABLE `hospitals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_directory`
--

DROP TABLE IF EXISTS `user_directory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_directory` (
  `user_id` varchar(50) NOT NULL,
  `hospital_id` int NOT NULL,
  `db_name` varchar(150) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `account_type` varchar(20) NOT NULL DEFAULT 'staff',
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_directory`
--

LOCK TABLES `user_directory` WRITE;
/*!40000 ALTER TABLE `user_directory` DISABLE KEYS */;
INSERT INTO `user_directory` VALUES ('AD-CHG-64701',10,'medisys_h10_city_hospital_ghatkopar','2026-07-29 12:15:45','staff'),('DR-CHG-49545',10,'medisys_h10_city_hospital_ghatkopar','2026-07-30 08:35:18','staff'),('NR-CHG-88859',10,'medisys_h10_city_hospital_ghatkopar','2026-07-30 08:31:37','staff'),('OPD-CHG-70518',10,'medisys_h10_city_hospital_ghatkopar','2026-07-30 04:36:36','staff'),('PAT-CHG-0002',10,'medisys_h10_city_hospital_ghatkopar','2026-07-30 09:02:52','patient'),('PAT-CHG-0003',10,'medisys_h10_city_hospital_ghatkopar','2026-07-30 09:25:11','patient'),('PAT-CHG-0004',10,'medisys_h10_city_hospital_ghatkopar','2026-07-30 10:31:18','patient');
/*!40000 ALTER TABLE `user_directory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(150) DEFAULT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'C5-202226','$2b$12$uOuhSRQHw3/JtMy85heJFe6cbllyMKMekMr6Chzt/0B23SQxtnN7e','Core5 Super Admin','superadmin','2026-07-29 09:12:39');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'medisys_hmis'
--
--
-- WARNING: can't read the INFORMATION_SCHEMA.libraries table. It's most probably an old server 8.0.46.
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-30 17:02:17
