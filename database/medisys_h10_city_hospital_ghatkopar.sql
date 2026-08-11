-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: medisys_h10_city_hospital_ghatkopar
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
-- Table structure for table `beds`
--

DROP TABLE IF EXISTS `beds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `beds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `ward_id` int NOT NULL,
  `bed_number` varchar(20) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'available',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=164 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `beds`
--

LOCK TABLES `beds` WRITE;
/*!40000 ALTER TABLE `beds` DISABLE KEYS */;
INSERT INTO `beds` VALUES (1,10,1,'b-01','occupied','2026-07-30 08:33:05'),(2,10,2,'B-01','occupied','2026-07-30 09:07:36'),(3,10,3,'V-01','occupied','2026-07-30 09:44:45'),(4,10,1,'B-02','available','2026-07-30 10:34:15'),(5,10,2,'B022','available','2026-08-05 10:45:11'),(6,10,1,'B-03','available','2026-08-10 11:11:08'),(7,10,2,'B-033','available','2026-08-10 11:11:22'),(14,10,2,'B-04','available','2026-08-10 12:09:01'),(15,10,2,'B-05','available','2026-08-10 12:09:01'),(16,10,2,'B-06','available','2026-08-10 12:09:01'),(17,10,2,'B-07','available','2026-08-10 12:09:01'),(18,10,2,'B-08','available','2026-08-10 12:09:01'),(19,10,2,'B-09','available','2026-08-10 12:09:01'),(20,10,2,'B-10','available','2026-08-10 12:09:01'),(21,10,2,'B-11','available','2026-08-10 12:09:01'),(22,10,2,'B-12','available','2026-08-10 12:09:01'),(23,10,2,'B-13','available','2026-08-10 12:09:01'),(24,10,2,'B-14','available','2026-08-10 12:09:01'),(25,10,2,'B-15','available','2026-08-10 12:09:01'),(26,10,2,'B-16','available','2026-08-10 12:09:01'),(27,10,2,'B-17','available','2026-08-10 12:09:01'),(28,10,2,'B-18','available','2026-08-10 12:09:01'),(29,10,2,'B-19','available','2026-08-10 12:09:01'),(30,10,2,'B-20','available','2026-08-10 12:09:01'),(31,10,2,'B-21','available','2026-08-10 12:09:01'),(32,10,2,'B-22','available','2026-08-10 12:09:01'),(33,10,2,'B-23','available','2026-08-10 12:09:01'),(34,10,2,'B-24','available','2026-08-10 12:09:01'),(35,10,2,'B-25','available','2026-08-10 12:09:01'),(36,10,2,'B-26','available','2026-08-10 12:09:01'),(37,10,2,'B-27','available','2026-08-10 12:09:01'),(38,10,2,'B-28','available','2026-08-10 12:09:01'),(39,10,2,'B-29','available','2026-08-10 12:09:01'),(40,10,2,'B-30','available','2026-08-10 12:09:01'),(41,10,2,'B-31','available','2026-08-10 12:09:01'),(42,10,2,'B-32','available','2026-08-10 12:09:01'),(43,10,2,'B-33','available','2026-08-10 12:09:01'),(44,10,2,'B-34','available','2026-08-10 12:09:01'),(45,10,2,'B-35','available','2026-08-10 12:09:01'),(46,10,2,'B-36','available','2026-08-10 12:09:01'),(47,10,2,'B-37','available','2026-08-10 12:09:01'),(48,10,2,'B-38','available','2026-08-10 12:09:01'),(49,10,2,'B-39','available','2026-08-10 12:09:01'),(50,10,2,'B-40','available','2026-08-10 12:09:01'),(51,10,2,'B-41','available','2026-08-10 12:09:01'),(52,10,2,'B-42','available','2026-08-10 12:09:01'),(53,10,2,'B-43','available','2026-08-10 12:09:01'),(54,10,2,'B-44','available','2026-08-10 12:09:01'),(55,10,2,'B-45','available','2026-08-10 12:09:01'),(56,10,2,'B-46','available','2026-08-10 12:09:01'),(57,10,2,'B-47','available','2026-08-10 12:09:01'),(58,10,2,'B-48','available','2026-08-10 12:09:01'),(59,10,2,'B-49','available','2026-08-10 12:09:01'),(60,10,2,'B-50','available','2026-08-10 12:09:01'),(61,10,2,'B-51','available','2026-08-10 12:09:01'),(62,10,2,'B-52','available','2026-08-10 12:09:01'),(63,10,2,'B-53','available','2026-08-10 12:09:01'),(64,10,2,'B-54','available','2026-08-10 12:09:01'),(65,10,2,'B-55','available','2026-08-10 12:09:01'),(66,10,2,'B-56','available','2026-08-10 12:09:01'),(67,10,2,'B-57','available','2026-08-10 12:09:01'),(68,10,2,'B-58','available','2026-08-10 12:09:01'),(69,10,2,'B-59','available','2026-08-10 12:09:01'),(70,10,2,'B-60','available','2026-08-10 12:09:01'),(71,10,2,'B-61','available','2026-08-10 12:09:01'),(72,10,2,'B-62','available','2026-08-10 12:09:01'),(73,10,2,'B-63','available','2026-08-10 12:09:01'),(74,10,2,'B-64','available','2026-08-10 12:09:01'),(75,10,2,'B-65','available','2026-08-10 12:09:01'),(76,10,2,'B-66','available','2026-08-10 12:09:01'),(77,10,2,'B-67','available','2026-08-10 12:09:01'),(78,10,2,'B-68','available','2026-08-10 12:09:01'),(79,10,2,'B-69','available','2026-08-10 12:09:01'),(80,10,2,'B-70','available','2026-08-10 12:09:01'),(81,10,2,'B-71','available','2026-08-10 12:09:01'),(82,10,2,'B-72','available','2026-08-10 12:09:01'),(83,10,2,'B-73','available','2026-08-10 12:09:01'),(84,10,2,'B-74','available','2026-08-10 12:09:01'),(85,10,2,'B-75','available','2026-08-10 12:09:01'),(86,10,2,'B-76','available','2026-08-10 12:09:01'),(87,10,2,'B-77','available','2026-08-10 12:09:01'),(88,10,2,'B-78','available','2026-08-10 12:09:01'),(89,10,2,'B-79','available','2026-08-10 12:09:01'),(90,10,2,'B-80','available','2026-08-10 12:09:01'),(91,10,2,'B-81','available','2026-08-10 12:09:01'),(92,10,2,'B-82','available','2026-08-10 12:09:01'),(93,10,2,'B-83','available','2026-08-10 12:09:01'),(94,10,2,'B-84','available','2026-08-10 12:09:01'),(95,10,2,'B-85','available','2026-08-10 12:09:01'),(96,10,2,'B-86','available','2026-08-10 12:09:01'),(97,10,2,'B-87','available','2026-08-10 12:09:01'),(98,10,2,'B-88','available','2026-08-10 12:09:01'),(99,10,2,'B-89','available','2026-08-10 12:09:01'),(100,10,2,'B-90','available','2026-08-10 12:09:01'),(101,10,2,'B-91','available','2026-08-10 12:09:01'),(102,10,2,'B-92','available','2026-08-10 12:09:01'),(103,10,2,'B-93','available','2026-08-10 12:09:01'),(104,10,2,'B-94','available','2026-08-10 12:09:01'),(105,10,2,'B-95','available','2026-08-10 12:09:01'),(106,10,2,'B-96','available','2026-08-10 12:09:01'),(107,10,2,'B-97','available','2026-08-10 12:09:01'),(108,10,2,'B-98','available','2026-08-10 12:09:01'),(109,10,2,'B-99','available','2026-08-10 12:09:01'),(110,10,2,'B-100','occupied','2026-08-10 12:09:01'),(111,10,2,'B-101','available','2026-08-10 12:09:01'),(112,10,2,'B-102','available','2026-08-10 12:09:01'),(113,10,2,'B-103','available','2026-08-10 12:09:01'),(114,10,1,'B-04','available','2026-08-10 12:32:06'),(115,10,1,'B-05','available','2026-08-10 12:32:06'),(116,10,1,'B-06','available','2026-08-10 12:32:06'),(117,10,1,'B-07','available','2026-08-10 12:32:06'),(118,10,1,'B-08','available','2026-08-10 12:32:06'),(119,10,1,'B-09','available','2026-08-10 12:32:06'),(120,10,1,'B-10','available','2026-08-10 12:32:06'),(121,10,1,'B-11','available','2026-08-10 12:32:06'),(122,10,1,'B-12','available','2026-08-10 12:32:06'),(123,10,1,'B-13','available','2026-08-10 12:32:06'),(124,10,1,'B-14','available','2026-08-10 12:32:06'),(125,10,1,'B-15','available','2026-08-10 12:32:06'),(126,10,1,'B-16','available','2026-08-10 12:32:06'),(127,10,1,'B-17','available','2026-08-10 12:32:06'),(128,10,1,'B-18','available','2026-08-10 12:32:06'),(129,10,1,'B-19','available','2026-08-10 12:32:06'),(130,10,1,'B-20','available','2026-08-10 12:32:06'),(131,10,1,'B-21','available','2026-08-10 12:32:06'),(132,10,1,'B-22','available','2026-08-10 12:32:06'),(133,10,1,'B-23','available','2026-08-10 12:32:06'),(134,10,1,'B-24','available','2026-08-10 12:32:06'),(135,10,1,'B-25','available','2026-08-10 12:32:06'),(136,10,1,'B-26','available','2026-08-10 12:32:06'),(137,10,1,'B-27','available','2026-08-10 12:32:06'),(138,10,1,'B-28','available','2026-08-10 12:32:06'),(139,10,1,'B-29','available','2026-08-10 12:32:06'),(140,10,1,'B-30','available','2026-08-10 12:32:06'),(141,10,1,'B-31','available','2026-08-10 12:32:06'),(142,10,1,'B-32','available','2026-08-10 12:32:06'),(143,10,1,'B-33','available','2026-08-10 12:32:06'),(144,10,1,'B-34','available','2026-08-10 12:32:06'),(145,10,1,'B-35','available','2026-08-10 12:32:06'),(146,10,1,'B-36','available','2026-08-10 12:32:06'),(147,10,1,'B-37','available','2026-08-10 12:32:06'),(148,10,1,'B-38','available','2026-08-10 12:32:06'),(149,10,1,'B-39','available','2026-08-10 12:32:06'),(150,10,1,'B-40','available','2026-08-10 12:32:06'),(151,10,1,'B-41','available','2026-08-10 12:32:06'),(152,10,1,'B-42','available','2026-08-10 12:32:06'),(153,10,1,'B-43','available','2026-08-10 12:32:06'),(154,10,1,'B-44','available','2026-08-10 12:32:06'),(155,10,1,'B-45','available','2026-08-10 12:32:06'),(156,10,1,'B-46','available','2026-08-10 12:32:06'),(157,10,1,'B-47','available','2026-08-10 12:32:06'),(158,10,1,'B-48','available','2026-08-10 12:32:06'),(159,10,1,'B-49','available','2026-08-10 12:32:06'),(160,10,1,'B-50','available','2026-08-10 12:32:06'),(161,10,1,'B-51','available','2026-08-10 12:32:06'),(162,10,1,'B-52','available','2026-08-10 12:32:06'),(163,10,1,'B-53','available','2026-08-10 12:32:06');
/*!40000 ALTER TABLE `beds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bill_items`
--

DROP TABLE IF EXISTS `bill_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bill_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `bill_id` int NOT NULL,
  `description` varchar(200) NOT NULL,
  `department` varchar(30) DEFAULT NULL,
  `qty` decimal(10,2) NOT NULL DEFAULT '1.00',
  `rate` decimal(10,2) NOT NULL DEFAULT '0.00',
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bill_items`
--

LOCK TABLES `bill_items` WRITE;
/*!40000 ALTER TABLE `bill_items` DISABLE KEYS */;
INSERT INTO `bill_items` VALUES (1,10,1,'Consultation Fee','OPD',1.00,600.00,600.00),(2,10,1,'Pathology � Test Panel','Pathology',1.00,450.00,450.00),(3,10,2,'Registration Fee','OPD',1.00,100.00,100.00),(4,10,3,'Registration Fee','OPD',1.00,100.00,100.00),(5,10,3,'Consultation Fee','OPD',1.00,600.00,600.00),(6,10,3,'CBC (Complete Blood Count)','Pathology',1.00,300.00,300.00),(7,10,4,'Registration Fee','OPD',1.00,100.00,100.00),(8,10,4,'Consultation Fee','OPD',1.00,600.00,600.00),(9,10,4,'Chest X-Ray','Radiology',1.00,400.00,400.00),(10,10,5,'Registration Fee','OPD',1.00,100.00,100.00),(11,10,5,'Consultation Fee','OPD',1.00,600.00,600.00),(12,10,5,'Chest X-Ray','Radiology',1.00,400.00,400.00),(13,10,5,'CBC (Complete Blood Count)','Pathology',1.00,300.00,300.00),(14,10,5,'Dengue NS1/IgM/IgG','Pathology',1.00,600.00,600.00);
/*!40000 ALTER TABLE `bill_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bill_payments`
--

DROP TABLE IF EXISTS `bill_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bill_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `bill_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `mode` varchar(30) NOT NULL,
  `reference` varchar(50) DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bill_payments`
--

LOCK TABLES `bill_payments` WRITE;
/*!40000 ALTER TABLE `bill_payments` DISABLE KEYS */;
INSERT INTO `bill_payments` VALUES (1,10,1,500.00,'UPI','RCPT-6621','2026-08-10 04:45:54','BS-CHG-24966'),(2,10,1,602.50,'Cash','RCPT-TEST','2026-08-10 04:46:07','BS-CHG-24966'),(3,10,2,100.00,'Cash','RCPT-9448','2026-08-10 05:58:17','BS-CHG-24966'),(4,10,3,1000.00,'UPI','RCPT-5080','2026-08-10 06:02:47','BS-CHG-24966'),(5,10,4,1100.00,'Cash','RCPT-8781','2026-08-10 06:21:24','BS-CHG-46457'),(6,10,5,2000.00,'Cash','RCPT-4103','2026-08-10 07:03:25','BS-CHG-46457');
/*!40000 ALTER TABLE `bill_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `billing_tariff`
--

DROP TABLE IF EXISTS `billing_tariff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `billing_tariff` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `charge_head` varchar(150) NOT NULL,
  `department` varchar(30) NOT NULL,
  `default_rate` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `billing_tariff`
--

LOCK TABLES `billing_tariff` WRITE;
/*!40000 ALTER TABLE `billing_tariff` DISABLE KEYS */;
INSERT INTO `billing_tariff` VALUES (1,10,'Consultation Fee','OPD',600.00,'2026-08-10 04:45:04'),(2,10,'Registration Fee','OPD',100.00,'2026-08-10 04:45:04'),(3,10,'Pathology — Test Panel','Pathology',450.00,'2026-08-10 04:45:04'),(4,10,'Radiology — Imaging','Radiology',1200.00,'2026-08-10 04:45:04'),(5,10,'Bed Charges (per day) — General Ward','IPD',1800.00,'2026-08-10 04:45:04'),(6,10,'Bed Charges (per day) — ICU','IPD',6500.00,'2026-08-10 04:45:04'),(7,10,'Nursing Charges','IPD',300.00,'2026-08-10 04:45:04'),(8,10,'Pharmacy — Medicines','Pharmacy',0.00,'2026-08-10 04:45:04');
/*!40000 ALTER TABLE `billing_tariff` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bills`
--

DROP TABLE IF EXISTS `bills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bills` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `bill_no` varchar(30) NOT NULL,
  `patient_uhid` varchar(30) DEFAULT NULL,
  `patient_name` varchar(150) NOT NULL,
  `abha_id` varchar(50) DEFAULT NULL,
  `department` varchar(30) NOT NULL,
  `doctor_user_id` varchar(50) DEFAULT NULL,
  `bill_date` date NOT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_pct` decimal(5,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `tax_pct` decimal(5,2) NOT NULL DEFAULT '0.00',
  `tax_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` varchar(20) NOT NULL DEFAULT 'Pending',
  `is_insurance` tinyint(1) NOT NULL DEFAULT '0',
  `payer_name` varchar(150) DEFAULT NULL,
  `policy_no` varchar(100) DEFAULT NULL,
  `claim_status` varchar(20) DEFAULT NULL,
  `approved_amount` decimal(10,2) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bills`
--

LOCK TABLES `bills` WRITE;
/*!40000 ALTER TABLE `bills` DISABLE KEYS */;
INSERT INTO `bills` VALUES (1,10,'CN/2026/7665','PAT-CHG-0002','ASHISH',NULL,'OPD','DR-CHG-49545','2026-08-06',1050.00,0.00,0.00,5.00,52.50,1102.50,1102.50,0.00,'Paid',1,'Star Health','SH-88213340','Approved',1102.50,'BS-CHG-24966','2026-08-10 04:45:54'),(2,10,'CN/2026/9679','PAT-CHG-0002','ASHISH',NULL,'OPD',NULL,'2026-08-10',100.00,0.00,0.00,0.00,0.00,100.00,100.00,0.00,'Paid',0,NULL,NULL,NULL,NULL,'BS-CHG-24966','2026-08-10 05:58:17'),(3,10,'CN/2026/9673','PAT-CHG-000008','Sachin',NULL,'OPD',NULL,'2026-08-10',1000.00,0.00,0.00,0.00,0.00,1000.00,1000.00,0.00,'Paid',0,NULL,NULL,NULL,NULL,'BS-CHG-24966','2026-08-10 06:02:47'),(4,10,'CN/2026/8743','PAT-CHG-0005','rosemary',NULL,'OPD',NULL,'2026-08-10',1100.00,0.00,0.00,0.00,0.00,1100.00,1100.00,0.00,'Paid',0,NULL,NULL,NULL,NULL,'BS-CHG-46457','2026-08-10 06:21:24'),(5,10,'CN/2026/2897','PAT-CHG-1002','SAKSHI',NULL,'OPD',NULL,'2026-08-10',2000.00,0.00,0.00,0.00,0.00,2000.00,2000.00,0.00,'Paid',0,NULL,NULL,NULL,NULL,'BS-CHG-46457','2026-08-10 07:03:25');
/*!40000 ALTER TABLE `bills` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blood_billing`
--

DROP TABLE IF EXISTS `blood_billing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blood_billing` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `request_id` int NOT NULL,
  `patient_uhid` varchar(30) DEFAULT NULL,
  `patient_name` varchar(150) NOT NULL,
  `component` varchar(30) NOT NULL,
  `units` int NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `payment_type` varchar(30) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `paid_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blood_billing`
--

LOCK TABLES `blood_billing` WRITE;
/*!40000 ALTER TABLE `blood_billing` DISABLE KEYS */;
INSERT INTO `blood_billing` VALUES (1,10,1,'PAT-CHG-0002','ASHISH','Packed RBC',2,3000.00,'paid','UPI','BB-CHG-92247','2026-08-06 08:23:56','2026-08-06 08:24:07');
/*!40000 ALTER TABLE `blood_billing` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blood_donors`
--

DROP TABLE IF EXISTS `blood_donors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blood_donors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `patient_uhid` varchar(30) DEFAULT NULL,
  `blood_group` varchar(4) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `last_donation_date` date DEFAULT NULL,
  `total_donations` int NOT NULL DEFAULT '0',
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blood_donors`
--

LOCK TABLES `blood_donors` WRITE;
/*!40000 ALTER TABLE `blood_donors` DISABLE KEYS */;
INSERT INTO `blood_donors` VALUES (1,10,'Rahul Trivedi',NULL,'O+','9820011223','2026-08-06',3,'BB-CHG-92247','2026-08-06 08:23:44'),(2,10,'PRANAY',NULL,'O+',NULL,'2026-08-04',0,'BB-CHG-14153','2026-08-10 11:24:40');
/*!40000 ALTER TABLE `blood_donors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blood_inventory_units`
--

DROP TABLE IF EXISTS `blood_inventory_units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blood_inventory_units` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `unit_code` varchar(30) NOT NULL,
  `blood_group` varchar(4) NOT NULL,
  `component` varchar(30) NOT NULL,
  `donor_id` int DEFAULT NULL,
  `collected_at` timestamp NOT NULL,
  `expiry_at` timestamp NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'available',
  `issued_to_request_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blood_inventory_units`
--

LOCK TABLES `blood_inventory_units` WRITE;
/*!40000 ALTER TABLE `blood_inventory_units` DISABLE KEYS */;
INSERT INTO `blood_inventory_units` VALUES (1,10,'BU-7405','O+','Packed RBC',1,'2026-08-06 08:23:45','2026-09-10 08:23:45','issued',1,'2026-08-06 08:23:44'),(2,10,'BU-6538','O+','Packed RBC',1,'2026-08-06 08:23:45','2026-09-10 08:23:45','issued',1,'2026-08-06 08:23:44'),(3,10,'BU-7565','O+','Packed RBC',1,'2026-08-06 08:23:45','2026-09-10 08:23:45','available',NULL,'2026-08-06 08:23:44'),(4,10,'BU-8149','B+','Whole Blood',NULL,'2026-08-06 08:24:25','2026-09-10 08:24:25','available',NULL,'2026-08-06 08:24:25');
/*!40000 ALTER TABLE `blood_inventory_units` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blood_patient_donations`
--

DROP TABLE IF EXISTS `blood_patient_donations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blood_patient_donations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `patient_uhid` varchar(30) NOT NULL,
  `donor_name` varchar(150) NOT NULL,
  `blood_group` varchar(4) NOT NULL,
  `component` varchar(30) NOT NULL,
  `units` int NOT NULL DEFAULT '1',
  `weight` decimal(5,1) DEFAULT NULL,
  `hb` decimal(4,1) DEFAULT NULL,
  `systolic` int DEFAULT NULL,
  `diastolic` int DEFAULT NULL,
  `pulse` int DEFAULT NULL,
  `temperature` decimal(4,1) DEFAULT NULL,
  `flags` json DEFAULT NULL,
  `eligible` tinyint(1) NOT NULL,
  `ineligible_reasons` text,
  `consent` tinyint(1) NOT NULL DEFAULT '0',
  `recorded_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blood_patient_donations`
--

LOCK TABLES `blood_patient_donations` WRITE;
/*!40000 ALTER TABLE `blood_patient_donations` DISABLE KEYS */;
INSERT INTO `blood_patient_donations` VALUES (1,10,'PAT-CHG-0003','VIKRAM','B+','Whole Blood',1,70.0,13.5,120,80,72,36.8,'{}',1,NULL,1,'BB-CHG-92247','2026-08-06 08:24:25');
/*!40000 ALTER TABLE `blood_patient_donations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blood_requests`
--

DROP TABLE IF EXISTS `blood_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blood_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `request_code` varchar(30) NOT NULL,
  `patient_uhid` varchar(30) DEFAULT NULL,
  `patient_name` varchar(150) NOT NULL,
  `age` int DEFAULT NULL,
  `sex` varchar(4) DEFAULT NULL,
  `blood_group` varchar(4) NOT NULL,
  `component` varchar(30) NOT NULL,
  `units_required` int NOT NULL DEFAULT '1',
  `priority` varchar(20) NOT NULL DEFAULT 'Routine',
  `ward_location` varchar(150) DEFAULT NULL,
  `ref_physician` varchar(150) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'requested',
  `assigned_staff_id` varchar(50) DEFAULT NULL,
  `crossmatch_sample` tinyint(1) NOT NULL DEFAULT '0',
  `crossmatch_abo` tinyint(1) NOT NULL DEFAULT '0',
  `crossmatch_screen` tinyint(1) NOT NULL DEFAULT '0',
  `notes` text,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `issued_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blood_requests`
--

LOCK TABLES `blood_requests` WRITE;
/*!40000 ALTER TABLE `blood_requests` DISABLE KEYS */;
INSERT INTO `blood_requests` VALUES (1,10,'BB-4501','PAT-CHG-0002','ASHISH',45,'M','O+','Packed RBC',2,'STAT','ICU Bed 4','Dr. Shubham','issued','BB-CHG-14153',1,1,1,'Issued 2 unit(s): BU-7405, BU-6538','BB-CHG-92247','2026-08-06 08:23:55','2026-08-06 08:23:56');
/*!40000 ALTER TABLE `blood_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `consultations`
--

DROP TABLE IF EXISTS `consultations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `opd_visit_id` int NOT NULL,
  `patient_uhid` varchar(30) NOT NULL,
  `doctor_user_id` varchar(50) NOT NULL,
  `symptoms` text,
  `notes` text,
  `decision` varchar(60) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consultations`
--

LOCK TABLES `consultations` WRITE;
/*!40000 ALTER TABLE `consultations` DISABLE KEYS */;
INSERT INTO `consultations` VALUES (1,10,1,'UH-CHG-000001','DR-CHG-49545',NULL,NULL,'order_tests','2026-07-30 08:42:57'),(2,10,4,'PAT-CHG-0003','DR-CHG-49545','bawasir','normal','admit','2026-07-30 09:41:53'),(3,10,5,'PAT-CHG-0004','DR-CHG-49545','NO PAIN NO GAIN',NULL,'admit','2026-07-30 10:33:15'),(4,10,6,'PAT-CHG-1001','DR-CHG-49545','HIGH FEVERR','NEED TO REST FOR 15 DAYS','order_tests','2026-08-05 09:29:31'),(6,10,13,'PAT-CHG-1002','DR-CHG-49545','HIGH FEVER','NEED TO TAKE REST FOR 3 DAYS','prescribe,order_tests','2026-08-05 10:32:34'),(7,10,16,'PAT-CHG-000008','DR-CHG-49545','Fatigue',NULL,'order_tests','2026-08-10 06:02:27'),(8,10,17,'PAT-CHG-0005','DR-CHG-49545',NULL,NULL,'order_tests','2026-08-10 06:16:03'),(9,10,18,'PAT-CHG-1003','DR-CHG-49545','HIGH FEVER','TAKE A REST','prescribe,order_tests,admit','2026-08-10 11:10:09');
/*!40000 ALTER TABLE `consultations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
INSERT INTO `departments` VALUES (1,10,'Cardiology','AD-CHG-64701','2026-08-05 10:19:21');
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doctor_calendar_availability`
--

DROP TABLE IF EXISTS `doctor_calendar_availability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctor_calendar_availability` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `doctor_user_id` varchar(50) NOT NULL,
  `avail_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `slot_minutes` int NOT NULL DEFAULT '15',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_doctor_date_start` (`doctor_user_id`,`avail_date`,`start_time`)
) ENGINE=InnoDB AUTO_INCREMENT=140 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doctor_calendar_availability`
--

LOCK TABLES `doctor_calendar_availability` WRITE;
/*!40000 ALTER TABLE `doctor_calendar_availability` DISABLE KEYS */;
INSERT INTO `doctor_calendar_availability` VALUES (4,10,'DR-CHG-49545','2026-10-04','09:00:00','10:00:00',15,'2026-08-05 12:04:30'),(5,10,'DR-CHG-49545','2026-08-15','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(6,10,'DR-CHG-49545','2026-09-04','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(7,10,'DR-CHG-49545','2026-09-24','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(8,10,'DR-CHG-49545','2026-08-05','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(9,10,'DR-CHG-49545','2026-08-25','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(10,10,'DR-CHG-49545','2026-09-14','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(13,10,'DR-CHG-49545','2026-08-16','09:00:00','10:00:00',15,'2026-08-05 12:04:30'),(14,10,'DR-CHG-49545','2026-09-05','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(15,10,'DR-CHG-49545','2026-09-25','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(16,10,'DR-CHG-49545','2026-08-06','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(17,10,'DR-CHG-49545','2026-08-26','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(18,10,'DR-CHG-49545','2026-09-15','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(21,10,'DR-CHG-49545','2026-09-06','09:00:00','10:00:00',15,'2026-08-05 12:04:30'),(22,10,'DR-CHG-49545','2026-09-26','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(23,10,'DR-CHG-49545','2026-08-07','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(24,10,'DR-CHG-49545','2026-08-27','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(25,10,'DR-CHG-49545','2026-09-16','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(26,10,'DR-CHG-49545','2026-08-17','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(30,10,'DR-CHG-49545','2026-09-27','09:00:00','10:00:00',15,'2026-08-05 12:04:30'),(31,10,'DR-CHG-49545','2026-08-08','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(32,10,'DR-CHG-49545','2026-08-28','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(33,10,'DR-CHG-49545','2026-09-17','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(34,10,'DR-CHG-49545','2026-08-18','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(35,10,'DR-CHG-49545','2026-09-07','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(39,10,'DR-CHG-49545','2026-08-09','09:00:00','10:00:00',15,'2026-08-05 12:04:30'),(40,10,'DR-CHG-49545','2026-08-29','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(41,10,'DR-CHG-49545','2026-09-18','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(42,10,'DR-CHG-49545','2026-08-19','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(43,10,'DR-CHG-49545','2026-09-08','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(44,10,'DR-CHG-49545','2026-09-28','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(48,10,'DR-CHG-49545','2026-08-30','09:00:00','10:00:00',15,'2026-08-05 12:04:30'),(49,10,'DR-CHG-49545','2026-09-19','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(50,10,'DR-CHG-49545','2026-08-20','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(51,10,'DR-CHG-49545','2026-09-09','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(52,10,'DR-CHG-49545','2026-09-29','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(53,10,'DR-CHG-49545','2026-08-10','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(57,10,'DR-CHG-49545','2026-09-20','09:00:00','10:00:00',15,'2026-08-05 12:04:30'),(58,10,'DR-CHG-49545','2026-08-21','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(59,10,'DR-CHG-49545','2026-09-10','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(60,10,'DR-CHG-49545','2026-09-30','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(61,10,'DR-CHG-49545','2026-08-11','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(62,10,'DR-CHG-49545','2026-08-31','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(65,10,'DR-CHG-49545','2026-08-22','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(66,10,'DR-CHG-49545','2026-09-11','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(67,10,'DR-CHG-49545','2026-10-01','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(68,10,'DR-CHG-49545','2026-08-12','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(69,10,'DR-CHG-49545','2026-09-01','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(70,10,'DR-CHG-49545','2026-09-21','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(73,10,'DR-CHG-49545','2026-08-23','09:00:00','10:00:00',15,'2026-08-05 12:04:30'),(74,10,'DR-CHG-49545','2026-09-12','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(75,10,'DR-CHG-49545','2026-10-02','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(76,10,'DR-CHG-49545','2026-08-13','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(77,10,'DR-CHG-49545','2026-09-02','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(78,10,'DR-CHG-49545','2026-09-22','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(81,10,'DR-CHG-49545','2026-09-13','09:00:00','10:00:00',15,'2026-08-05 12:04:30'),(82,10,'DR-CHG-49545','2026-10-03','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(83,10,'DR-CHG-49545','2026-08-14','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(84,10,'DR-CHG-49545','2026-09-03','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(85,10,'DR-CHG-49545','2026-09-23','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(86,10,'DR-CHG-49545','2026-08-24','09:00:00','20:00:00',15,'2026-08-05 12:04:30'),(139,10,'DR-CHG-1616','2026-08-06','09:00:00','13:00:00',15,'2026-08-05 12:25:58');
/*!40000 ALTER TABLE `doctor_calendar_availability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doctor_nurse_teams`
--

DROP TABLE IF EXISTS `doctor_nurse_teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctor_nurse_teams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `doctor_user_id` varchar(50) NOT NULL,
  `nurse_user_id` varchar(50) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doctor_nurse_teams`
--

LOCK TABLES `doctor_nurse_teams` WRITE;
/*!40000 ALTER TABLE `doctor_nurse_teams` DISABLE KEYS */;
INSERT INTO `doctor_nurse_teams` VALUES (1,10,'DR-CHG-1616','NR-CHG-88859','2026-08-05 10:19:55'),(2,10,'DR-CHG-49545','NR-CHG-88859','2026-08-05 10:19:59');
/*!40000 ALTER TABLE `doctor_nurse_teams` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doctor_orders`
--

DROP TABLE IF EXISTS `doctor_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctor_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `ipd_admission_id` int NOT NULL,
  `order_type` varchar(20) NOT NULL,
  `description` text NOT NULL,
  `ordered_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doctor_orders`
--

LOCK TABLES `doctor_orders` WRITE;
/*!40000 ALTER TABLE `doctor_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `doctor_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `doctor_schedules`
--

DROP TABLE IF EXISTS `doctor_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `doctor_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `doctor_user_id` varchar(50) NOT NULL,
  `day_of_week` tinyint NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `slot_minutes` int NOT NULL DEFAULT '15',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doctor_schedules`
--

LOCK TABLES `doctor_schedules` WRITE;
/*!40000 ALTER TABLE `doctor_schedules` DISABLE KEYS */;
INSERT INTO `doctor_schedules` VALUES (3,10,'DR-CHG-49545',1,'09:00:00','20:00:00',15,'2026-07-30 09:38:52'),(4,10,'DR-CHG-49545',2,'09:00:00','20:00:00',15,'2026-07-30 09:38:52'),(5,10,'DR-CHG-49545',3,'09:00:00','20:00:00',15,'2026-07-30 09:38:52'),(6,10,'DR-CHG-49545',4,'09:00:00','20:00:00',15,'2026-07-30 09:38:52'),(7,10,'DR-CHG-49545',5,'09:00:00','20:00:00',15,'2026-07-30 09:38:52'),(8,10,'DR-CHG-49545',6,'09:00:00','20:00:00',15,'2026-07-30 09:38:52'),(9,10,'DR-CHG-49545',0,'09:00:00','10:00:00',15,'2026-08-05 09:24:56'),(10,10,'DR-CHG-1616',0,'09:00:00','13:00:00',15,'2026-08-05 10:24:51'),(11,10,'DR-CHG-1616',1,'09:00:00','13:00:00',15,'2026-08-05 10:24:55'),(12,10,'DR-CHG-1616',2,'09:00:00','13:00:00',15,'2026-08-05 10:24:59');
/*!40000 ALTER TABLE `doctor_schedules` ENABLE KEYS */;
UNLOCK TABLES;

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
  `short_code` varchar(10) DEFAULT NULL,
  `admin_user_id` varchar(50) DEFAULT NULL,
  `nurse_assignment_mode` enum('ward_based','doctor_team') NOT NULL DEFAULT 'ward_based',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hospitals`
--

LOCK TABLES `hospitals` WRITE;
/*!40000 ALTER TABLE `hospitals` DISABLE KEYS */;
INSERT INTO `hospitals` VALUES (10,'City Hospital Ghatkopar',NULL,NULL,NULL,'A-704, Regnecy Garden Purnima Kalyan west','Kalyan','Maharashtra','421301',NULL,NULL,'Rashmi Shetty','rashmi.shetty@core5.co.in','[\"opd\", \"radiology\", \"billing\", \"pharmacy\", \"pathology\", \"laboratory\"]',1,'active',NULL,NULL,'C5-202226','2026-07-29 11:17:01','CHG','AD-CHG-64701','doctor_team');
/*!40000 ALTER TABLE `hospitals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ipd_admissions`
--

DROP TABLE IF EXISTS `ipd_admissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ipd_admissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `patient_uhid` varchar(30) NOT NULL,
  `admitting_doctor_user_id` varchar(50) DEFAULT NULL,
  `ward_id` int DEFAULT NULL,
  `bed_id` int DEFAULT NULL,
  `consent_obtained` tinyint(1) NOT NULL DEFAULT '0',
  `id_proof_note` varchar(150) DEFAULT NULL,
  `admission_notes` text,
  `status` varchar(20) NOT NULL DEFAULT 'requested',
  `opd_visit_id` int DEFAULT NULL,
  `assigned_nurse_id` varchar(50) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `admitted_at` timestamp NULL DEFAULT NULL,
  `discharged_at` timestamp NULL DEFAULT NULL,
  `discharged_by` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ipd_admissions`
--

LOCK TABLES `ipd_admissions` WRITE;
/*!40000 ALTER TABLE `ipd_admissions` DISABLE KEYS */;
INSERT INTO `ipd_admissions` VALUES (2,10,'UH-CHG-000001','DR-CHG-49545',1,1,1,NULL,NULL,'admitted',NULL,NULL,'OPD-CHG-70518','2026-07-30 08:53:05','2026-07-30 08:56:58',NULL,NULL),(3,10,'PAT-CHG-0002','DR-CHG-49545',2,2,0,NULL,NULL,'admitted',NULL,NULL,'OPD-CHG-70518','2026-07-30 09:06:37','2026-07-30 09:07:49',NULL,NULL),(6,10,'PAT-CHG-0003','DR-CHG-49545',3,3,1,NULL,NULL,'admitted',NULL,NULL,'OPD-CHG-70518','2026-07-30 09:42:49','2026-07-30 09:44:57',NULL,NULL),(7,10,'PAT-CHG-0004','DR-CHG-49545',1,4,0,NULL,NULL,'discharged',5,NULL,'DR-CHG-49545','2026-07-30 10:33:15','2026-07-30 10:34:28','2026-08-10 12:28:42','NR-CHG-88859'),(8,10,'PAT-CHG-1003','DR-CHG-49545',2,110,0,NULL,NULL,'admitted',18,'NR-CHG-88859','DR-CHG-49545','2026-08-10 11:10:09','2026-08-10 12:09:29',NULL,NULL);
/*!40000 ALTER TABLE `ipd_admissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ipd_notes`
--

DROP TABLE IF EXISTS `ipd_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ipd_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `ipd_admission_id` int NOT NULL,
  `note_type` varchar(20) NOT NULL,
  `message` text NOT NULL,
  `flagged_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ipd_notes`
--

LOCK TABLES `ipd_notes` WRITE;
/*!40000 ALTER TABLE `ipd_notes` DISABLE KEYS */;
INSERT INTO `ipd_notes` VALUES (1,10,2,'complication','all normal , just slight fever','NR-CHG-88859','2026-07-30 08:58:49');
/*!40000 ALTER TABLE `ipd_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lab_order_images`
--

DROP TABLE IF EXISTS `lab_order_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lab_order_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `lab_order_id` int NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `uploaded_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lab_order_images`
--

LOCK TABLES `lab_order_images` WRITE;
/*!40000 ALTER TABLE `lab_order_images` DISABLE KEYS */;
INSERT INTO `lab_order_images` VALUES (2,10,2,'1785922266199-799324468.png','PRANAY KHUSPE.png','PATHOLOGY-CHG-0001','2026-08-05 09:31:06'),(3,10,3,'1785922544600-575023253.jpg','Normal_posteroanterior_(PA)_chest_radiograph_(X-ray).jpg','RADIO-CHG-0001','2026-08-05 09:35:44'),(4,10,12,'1785926052711-667057918.jpg','Normal_posteroanterior_(PA)_chest_radiograph_(X-ray).jpg','RADIO-CHG-0001','2026-08-05 10:34:12'),(5,10,13,'1785926209635-870127507.png','Architecture.drawio.png','PATHOLAB-CHG-0001','2026-08-05 10:36:49'),(6,10,14,'1785926271555-62151013.png','high_resolution_image (1).png','PATHOLAB-CHG-0001','2026-08-05 10:37:51'),(7,10,17,'1786360407396-955956025.jpg','CBC.jpg','PATHOLOGY-CHG-0001','2026-08-10 11:13:27'),(8,10,18,'1786360471282-597760391.jpg','Normal_posteroanterior_(PA)_chest_radiograph_(X-ray).jpg','RADIO-CHG-0001','2026-08-10 11:14:31');
/*!40000 ALTER TABLE `lab_order_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lab_orders`
--

DROP TABLE IF EXISTS `lab_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lab_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `opd_visit_id` int DEFAULT NULL,
  `ipd_admission_id` int DEFAULT NULL,
  `patient_uhid` varchar(30) NOT NULL,
  `test_id` int NOT NULL,
  `doctor_user_id` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `assigned_to` varchar(50) DEFAULT NULL,
  `result_notes` text,
  `result_file_path` varchar(255) DEFAULT NULL,
  `result_file_name` varchar(255) DEFAULT NULL,
  `completed_by` varchar(50) DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `priority` enum('routine','urgent','stat') NOT NULL DEFAULT 'routine',
  `verified_by` varchar(50) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lab_orders`
--

LOCK TABLES `lab_orders` WRITE;
/*!40000 ALTER TABLE `lab_orders` DISABLE KEYS */;
INSERT INTO `lab_orders` VALUES (2,10,6,NULL,'PAT-CHG-1001',1,'DR-CHG-49545','verified','PATHOLAB-CHG-0001',NULL,NULL,NULL,'PATHOLAB-CHG-0001','2026-08-05 09:33:20','2026-08-05 09:29:31','urgent','PATHOLAB-CHG-0001','2026-08-05 09:33:20'),(3,10,6,NULL,'PAT-CHG-1001',24,'DR-CHG-49545','verified','RADIO-CHG-0001','TECHNIQUE: Plain radiograph, single view.\n\nFINDINGS:\nLung fields: \nCardiac silhouette: \nBony thorax: \n\nIMPRESSION:\n',NULL,NULL,'RADIO-CHG-0001','2026-08-05 09:36:00','2026-08-05 09:29:31','routine','RADIO-CHG-0001','2026-08-05 09:36:00'),(4,10,6,NULL,'PAT-CHG-1001',3,'DR-CHG-49545','pending',NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 09:29:31','routine',NULL,NULL),(5,10,6,NULL,'PAT-CHG-1001',8,'DR-CHG-49545','pending',NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 09:29:31','routine',NULL,NULL),(6,10,6,NULL,'PAT-CHG-1001',6,'DR-CHG-49545','pending',NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 09:29:31','routine',NULL,NULL),(7,10,6,NULL,'PAT-CHG-1001',26,'DR-CHG-49545','in_progress','RA-CHG-33409',NULL,NULL,NULL,NULL,NULL,'2026-08-05 09:29:31','routine',NULL,NULL),(8,10,6,NULL,'PAT-CHG-1001',27,'DR-CHG-49545','pending',NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 09:29:31','routine',NULL,NULL),(9,10,6,NULL,'PAT-CHG-1001',22,'DR-CHG-49545','pending',NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 09:29:31','routine',NULL,NULL),(10,10,6,NULL,'PAT-CHG-1001',28,'DR-CHG-49545','pending',NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-05 09:29:31','routine',NULL,NULL),(12,10,13,NULL,'PAT-CHG-1002',24,'DR-CHG-49545','verified','RA-CHG-33409','TECHNIQUE: Plain CT, axial sections.\n\nFINDINGS:\nLung parenchyma: \nMediastinum: \nPleura: \nBones: \n\nIMPRESSION:\n',NULL,NULL,'RADIO-CHG-0001','2026-08-05 10:34:32','2026-08-05 10:32:35','urgent','RADIO-CHG-0001','2026-08-05 10:34:32'),(13,10,13,NULL,'PAT-CHG-1002',1,'DR-CHG-49545','verified','PATHOLAB-CHG-0001',NULL,NULL,NULL,'PATHOLAB-CHG-0001','2026-08-05 10:36:55','2026-08-05 10:32:35','routine','PATHOLAB-CHG-0001','2026-08-05 10:36:55'),(14,10,13,NULL,'PAT-CHG-1002',22,'DR-CHG-49545','verified','PATHOLAB-CHG-0001',NULL,NULL,NULL,'PATHOLAB-CHG-0001','2026-08-05 10:37:57','2026-08-05 10:32:35','routine','PATHOLAB-CHG-0001','2026-08-05 10:37:57'),(15,10,16,NULL,'PAT-CHG-000008',1,'DR-CHG-49545','pending',NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-10 06:02:27','routine',NULL,NULL),(16,10,17,NULL,'PAT-CHG-0005',24,'DR-CHG-49545','pending',NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-10 06:16:03','routine',NULL,NULL),(17,10,18,NULL,'PAT-CHG-1003',1,'DR-CHG-49545','verified','PATHOLOGY-CHG-0001',NULL,NULL,NULL,'PATHOLOGY-CHG-0001','2026-08-10 11:13:39','2026-08-10 11:10:09','routine','PATHOLOGY-CHG-0001','2026-08-10 11:13:39'),(18,10,18,NULL,'PAT-CHG-1003',24,'DR-CHG-49545','verified','RADIO-CHG-0001',NULL,NULL,NULL,'RADIO-CHG-0001','2026-08-10 11:14:35','2026-08-10 11:10:09','routine','RADIO-CHG-0001','2026-08-10 11:14:35'),(19,10,18,NULL,'PAT-CHG-1003',22,'DR-CHG-49545','pending',NULL,NULL,NULL,NULL,NULL,NULL,'2026-08-10 11:10:09','routine',NULL,NULL);
/*!40000 ALTER TABLE `lab_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `medication_administration`
--

DROP TABLE IF EXISTS `medication_administration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medication_administration` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `ipd_admission_id` int NOT NULL,
  `doctor_order_id` int DEFAULT NULL,
  `medicine_name` varchar(150) NOT NULL,
  `dose` varchar(50) DEFAULT NULL,
  `administered_by` varchar(50) DEFAULT NULL,
  `administered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `medication_administration`
--

LOCK TABLES `medication_administration` WRITE;
/*!40000 ALTER TABLE `medication_administration` DISABLE KEYS */;
INSERT INTO `medication_administration` VALUES (1,10,2,NULL,'PARA','500MG','NR-CHG-88859','2026-07-30 08:57:59','take morning and night before dinner');
/*!40000 ALTER TABLE `medication_administration` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nurse_shift_roster`
--

DROP TABLE IF EXISTS `nurse_shift_roster`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nurse_shift_roster` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `nurse_user_id` varchar(50) NOT NULL,
  `ward_id` int NOT NULL,
  `shift` varchar(20) NOT NULL,
  `day_of_week` tinyint NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nurse_shift_roster`
--

LOCK TABLES `nurse_shift_roster` WRITE;
/*!40000 ALTER TABLE `nurse_shift_roster` DISABLE KEYS */;
INSERT INTO `nurse_shift_roster` VALUES (1,10,'NR-CHG-88859',1,'Evening',1,'2026-08-05 10:19:40');
/*!40000 ALTER TABLE `nurse_shift_roster` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opd_visits`
--

DROP TABLE IF EXISTS `opd_visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opd_visits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `token_number` int NOT NULL,
  `patient_uhid` varchar(30) NOT NULL,
  `doctor_user_id` varchar(50) NOT NULL,
  `visit_date` date NOT NULL,
  `slot_time` time DEFAULT NULL,
  `source` varchar(20) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'waiting',
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opd_visits`
--

LOCK TABLES `opd_visits` WRITE;
/*!40000 ALTER TABLE `opd_visits` DISABLE KEYS */;
INSERT INTO `opd_visits` VALUES (1,10,1,'UH-CHG-000001','DR-CHG-49545','2026-07-30',NULL,'walk-in','completed','OPD-CHG-70518','2026-07-30 08:40:17'),(2,10,1,'PAT-CHG-0002','DR-CHG-49545','2026-08-01',NULL,'walk-in','waiting','OPD-CHG-70518','2026-07-30 09:05:51'),(3,10,2,'PAT-CHG-0002','DR-CHG-49545','2026-08-01',NULL,'walk-in','waiting','OPD-CHG-70518','2026-07-30 09:06:01'),(4,10,2,'PAT-CHG-0003','DR-CHG-49545','2026-07-30','09:45:00','appointment','completed','OPD-CHG-70518','2026-07-30 09:40:29'),(5,10,3,'PAT-CHG-0004','DR-CHG-49545','2026-07-30','12:15:00','appointment','completed','OPD-CHG-70518','2026-07-30 10:31:58'),(6,10,1,'PAT-CHG-1001','DR-CHG-49545','2026-08-05','15:00:00','appointment','completed','OPD-CHG-70518','2026-08-05 09:24:04'),(13,10,2,'PAT-CHG-1002','DR-CHG-49545','2026-08-05','17:15:00','appointment','completed','OPD-CHG-70518','2026-08-05 10:30:08'),(16,10,1,'PAT-CHG-000008','DR-CHG-49545','2026-08-10',NULL,'walk-in','completed','OPD-CHG-70518','2026-08-10 06:02:16'),(17,10,2,'PAT-CHG-0005','DR-CHG-49545','2026-08-10','10:00:00','appointment','completed','OPD-CHG-70518','2026-08-10 06:14:40'),(18,10,3,'PAT-CHG-1003','DR-CHG-49545','2026-08-10','19:00:00','appointment','completed','OPD-CHG-70518','2026-08-10 11:06:52');
/*!40000 ALTER TABLE `opd_visits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patient_charges`
--

DROP TABLE IF EXISTS `patient_charges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_charges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `patient_uhid` varchar(30) NOT NULL,
  `source_type` varchar(20) NOT NULL,
  `source_id` int NOT NULL,
  `description` varchar(200) NOT NULL,
  `department` varchar(30) NOT NULL,
  `rate` decimal(10,2) NOT NULL DEFAULT '0.00',
  `bill_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_patient_charge_source` (`hospital_id`,`source_type`,`source_id`)
) ENGINE=InnoDB AUTO_INCREMENT=677 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patient_charges`
--

LOCK TABLES `patient_charges` WRITE;
/*!40000 ALTER TABLE `patient_charges` DISABLE KEYS */;
INSERT INTO `patient_charges` VALUES (1,10,'PAT-CHG-0002','registration',3,'Registration Fee','OPD',100.00,2,'2026-08-10 05:57:45'),(2,10,'PAT-CHG-0003','registration',4,'Registration Fee','OPD',100.00,NULL,'2026-08-10 05:57:45'),(3,10,'PAT-CHG-0004','registration',5,'Registration Fee','OPD',100.00,NULL,'2026-08-10 05:57:45'),(4,10,'PAT-CHG-1001','registration',6,'Registration Fee','OPD',100.00,NULL,'2026-08-10 05:57:45'),(5,10,'PAT-CHG-1002','registration',7,'Registration Fee','OPD',100.00,5,'2026-08-10 05:57:45'),(6,10,'PAT-CHG-1111','registration',2,'Registration Fee','OPD',100.00,NULL,'2026-08-10 05:57:45'),(7,10,'UH-CHG-000001','registration',1,'Registration Fee','OPD',100.00,NULL,'2026-08-10 05:57:45'),(8,10,'UH-CHG-000001','opd_visit',1,'Consultation Fee','OPD',600.00,NULL,'2026-08-10 05:57:45'),(9,10,'PAT-CHG-0002','opd_visit',2,'Consultation Fee','OPD',600.00,NULL,'2026-08-10 05:57:45'),(10,10,'PAT-CHG-0002','opd_visit',3,'Consultation Fee','OPD',600.00,NULL,'2026-08-10 05:57:45'),(11,10,'PAT-CHG-0003','opd_visit',4,'Consultation Fee','OPD',600.00,NULL,'2026-08-10 05:57:45'),(12,10,'PAT-CHG-0004','opd_visit',5,'Consultation Fee','OPD',600.00,NULL,'2026-08-10 05:57:45'),(13,10,'PAT-CHG-1001','opd_visit',6,'Consultation Fee','OPD',600.00,NULL,'2026-08-10 05:57:45'),(14,10,'PAT-CHG-1002','opd_visit',13,'Consultation Fee','OPD',600.00,5,'2026-08-10 05:57:45'),(15,10,'PAT-CHG-1001','lab_order',2,'CBC (Complete Blood Count)','Pathology',300.00,NULL,'2026-08-10 05:57:45'),(16,10,'PAT-CHG-1001','lab_order',3,'Chest X-Ray','Radiology',400.00,NULL,'2026-08-10 05:57:45'),(17,10,'PAT-CHG-1001','lab_order',4,'Hemoglobin (Hb)','Pathology',100.00,NULL,'2026-08-10 05:57:45'),(18,10,'PAT-CHG-1001','lab_order',5,'Blood Sugar (PP)','Pathology',100.00,NULL,'2026-08-10 05:57:45'),(19,10,'PAT-CHG-1001','lab_order',6,'KFT (Kidney Function Test)','Pathology',600.00,NULL,'2026-08-10 05:57:45'),(20,10,'PAT-CHG-1001','lab_order',7,'CT Scan (Plain)','Radiology',3500.00,NULL,'2026-08-10 05:57:45'),(21,10,'PAT-CHG-1001','lab_order',8,'MRI (Plain)','Radiology',6000.00,NULL,'2026-08-10 05:57:45'),(22,10,'PAT-CHG-1001','lab_order',9,'Dengue NS1/IgM/IgG','Pathology',600.00,NULL,'2026-08-10 05:57:45'),(23,10,'PAT-CHG-1001','lab_order',10,'ECG','Radiology',250.00,NULL,'2026-08-10 05:57:45'),(24,10,'PAT-CHG-1002','lab_order',12,'Chest X-Ray','Radiology',400.00,5,'2026-08-10 05:57:45'),(25,10,'PAT-CHG-1002','lab_order',13,'CBC (Complete Blood Count)','Pathology',300.00,5,'2026-08-10 05:57:45'),(26,10,'PAT-CHG-1002','lab_order',14,'Dengue NS1/IgM/IgG','Pathology',600.00,5,'2026-08-10 05:57:45'),(30,10,'UH-CHG-000001','ipd_admission',2,'Bed Charges — ICU (Bed b-01)','IPD',6500.00,NULL,'2026-08-10 05:57:45'),(31,10,'PAT-CHG-0002','ipd_admission',3,'Bed Charges — GENRAL (Bed B-01)','IPD',1800.00,NULL,'2026-08-10 05:57:45'),(32,10,'PAT-CHG-0003','ipd_admission',6,'Bed Charges — VENTILATOR (Bed V-01)','IPD',1800.00,NULL,'2026-08-10 05:57:45'),(33,10,'PAT-CHG-0004','ipd_admission',7,'Bed Charges — ICU (Bed B-02)','IPD',6500.00,NULL,'2026-08-10 05:57:45'),(55,10,'PAT-CHG-000008','registration',8,'Registration Fee','OPD',100.00,3,'2026-08-10 06:02:05'),(65,10,'PAT-CHG-000008','opd_visit',16,'Consultation Fee','OPD',600.00,3,'2026-08-10 06:02:16'),(73,10,'PAT-CHG-000008','lab_order',15,'CBC (Complete Blood Count)','Pathology',300.00,3,'2026-08-10 06:02:27'),(92,10,'PAT-CHG-0005','registration',9,'Registration Fee','OPD',100.00,4,'2026-08-10 06:06:34'),(233,10,'PAT-CHG-0005','opd_visit',17,'Consultation Fee','OPD',600.00,4,'2026-08-10 06:15:14'),(248,10,'PAT-CHG-0005','lab_order',16,'Chest X-Ray','Radiology',400.00,4,'2026-08-10 06:16:26'),(568,10,'PAT-CHG-1003','registration',10,'Registration Fee','OPD',100.00,NULL,'2026-08-10 11:20:05'),(569,10,'PAT-CHG-1003','opd_visit',18,'Consultation Fee','OPD',600.00,NULL,'2026-08-10 11:20:05'),(570,10,'PAT-CHG-1003','lab_order',17,'CBC (Complete Blood Count)','Pathology',300.00,NULL,'2026-08-10 11:20:05'),(571,10,'PAT-CHG-1003','lab_order',18,'Chest X-Ray','Radiology',400.00,NULL,'2026-08-10 11:20:05'),(572,10,'PAT-CHG-1003','lab_order',19,'Dengue NS1/IgM/IgG','Pathology',600.00,NULL,'2026-08-10 11:20:05'),(612,10,'PAT-CHG-1003','ipd_admission',8,'Bed Charges — GENRAL (Bed B-100)','IPD',1800.00,NULL,'2026-08-11 04:31:59'),(670,10,'PAT-CHG-000008','opd_visit',19,'Consultation Fee','OPD',600.00,NULL,'2026-08-11 06:46:13');
/*!40000 ALTER TABLE `patient_charges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patients`
--

DROP TABLE IF EXISTS `patients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `uhid` varchar(30) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `dob` date DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `emergency_contact_name` varchar(150) DEFAULT NULL,
  `emergency_contact_phone` varchar(20) DEFAULT NULL,
  `abha_id` varchar(50) DEFAULT NULL,
  `category` varchar(20) DEFAULT NULL,
  `registered_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `blood_group` varchar(4) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uhid` (`uhid`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patients`
--

LOCK TABLES `patients` WRITE;
/*!40000 ALTER TABLE `patients` DISABLE KEYS */;
INSERT INTO `patients` VALUES (1,10,'UH-CHG-000001',NULL,'abhi','2002-09-17','Male',NULL,NULL,NULL,NULL,NULL,'walk-in','OPD-CHG-70518','2026-07-30 06:44:10',NULL),(2,10,'PAT-CHG-1111','$2b$12$dGXobHUILjyO1n9whtYIKeapXfsBOeDOHHsb9AfP9lUFS08daJm0O','pranay','2026-07-30','Male',NULL,NULL,NULL,NULL,NULL,'walk-in','OPD-CHG-70518','2026-07-30 06:49:25',NULL),(3,10,'PAT-CHG-0002','$2b$10$EtdK7ZCti96Zb.s5HzLA3O.rkSRdnc8lRadei9kZtWQdhpRRdrgOS','ASHISH',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'referral','OPD-CHG-70518','2026-07-30 09:02:52',NULL),(4,10,'PAT-CHG-0003','$2b$10$EtdK7ZCti96Zb.s5HzLA3O.rkSRdnc8lRadei9kZtWQdhpRRdrgOS','VIKRAM',NULL,NULL,'9137731642','A-704, Regnecy Garden Purnima Kalyan west',NULL,NULL,NULL,'walk-in','OPD-CHG-70518','2026-07-30 09:25:11','B+'),(5,10,'PAT-CHG-0004','$2b$10$EtdK7ZCti96Zb.s5HzLA3O.rkSRdnc8lRadei9kZtWQdhpRRdrgOS','NITISH',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'walk-in','OPD-CHG-70518','2026-07-30 10:31:18',NULL),(6,10,'PAT-CHG-1001','$2b$12$la785cUg4SmKGYY3lSWcMerwhV.M92hDeOICq.kJUGin7wpDkbtF6','RASHMI SHETTY',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'walk-in','OPD-CHG-70518','2026-08-05 09:23:01',NULL),(7,10,'PAT-CHG-1002','$2b$12$hysfLzNQUFaCqYQsCFz5GeQrfKZW8GQgbMAXNAN/93qKwmhWZKT.K','SAKSHI',NULL,'Female',NULL,NULL,NULL,NULL,NULL,'walk-in','OPD-CHG-70518','2026-08-05 10:22:37',NULL),(8,10,'PAT-CHG-000008','$2b$12$9eXDoUS0e2nWOOyh2EOtRu1ou1wXXygchMr1VWoq2D8eLYYIDj/jq','Sachin',NULL,'Male','9900011122',NULL,NULL,NULL,NULL,'walk-in','OPD-CHG-70518','2026-08-10 06:01:52',NULL),(9,10,'PAT-CHG-0005','$2b$12$5MZ4DksGNTZ4PmtfF/NgvewP6ZFkoErKeRonY0rVCYiUsuWo9jUD2','rosemary',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'walk-in','OPD-CHG-70518','2026-08-10 06:06:01',NULL),(10,10,'PAT-CHG-1003','$2b$12$2Kvoq50Cl74WldYx9fCBd.E/oKHZManSCf58efGIumWs6Ayf1QWNy','SURAJ',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'walk-in','OPD-CHG-70518','2026-08-10 11:06:13',NULL);
/*!40000 ALTER TABLE `patients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pharmacy_invoices`
--

DROP TABLE IF EXISTS `pharmacy_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pharmacy_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `order_id` int DEFAULT NULL,
  `patient_uhid` varchar(30) NOT NULL,
  `patient_name` varchar(150) NOT NULL,
  `payment_type` varchar(30) NOT NULL DEFAULT 'Cash',
  `item_count` int NOT NULL DEFAULT '1',
  `total_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `payment_status` varchar(20) NOT NULL DEFAULT 'Pending',
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `paid_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pharmacy_invoices`
--

LOCK TABLES `pharmacy_invoices` WRITE;
/*!40000 ALTER TABLE `pharmacy_invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `pharmacy_invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pharmacy_orders`
--

DROP TABLE IF EXISTS `pharmacy_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pharmacy_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `opd_visit_id` int DEFAULT NULL,
  `ipd_admission_id` int DEFAULT NULL,
  `patient_uhid` varchar(30) NOT NULL,
  `doctor_user_id` varchar(50) NOT NULL,
  `medicine_name` varchar(150) NOT NULL,
  `dosage` varchar(100) NOT NULL,
  `duration` varchar(50) NOT NULL,
  `urgency` enum('routine','urgent') NOT NULL DEFAULT 'routine',
  `status` varchar(20) NOT NULL DEFAULT 'pending_pharmacy',
  `dispensed_by` varchar(50) DEFAULT NULL,
  `dispensed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `amount` decimal(10,2) DEFAULT NULL,
  `payment_mode` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pharmacy_orders`
--

LOCK TABLES `pharmacy_orders` WRITE;
/*!40000 ALTER TABLE `pharmacy_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `pharmacy_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pharmacy_purchase_orders`
--

DROP TABLE IF EXISTS `pharmacy_purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pharmacy_purchase_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `po_number` varchar(50) NOT NULL,
  `supplier_name` varchar(150) NOT NULL,
  `items_summary` varchar(255) NOT NULL,
  `total_items` int NOT NULL DEFAULT '1',
  `status` varchar(30) NOT NULL DEFAULT 'Submitted',
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `po_number` (`po_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pharmacy_purchase_orders`
--

LOCK TABLES `pharmacy_purchase_orders` WRITE;
/*!40000 ALTER TABLE `pharmacy_purchase_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `pharmacy_purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pharmacy_stock`
--

DROP TABLE IF EXISTS `pharmacy_stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pharmacy_stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `medicine_name` varchar(150) NOT NULL,
  `category` varchar(50) NOT NULL,
  `batch_number` varchar(50) NOT NULL,
  `expiry_date` date NOT NULL,
  `stock_quantity` int NOT NULL DEFAULT '0',
  `min_stock_level` int NOT NULL DEFAULT '10',
  `unit_price` decimal(10,2) DEFAULT NULL,
  `added_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pharmacy_stock`
--

LOCK TABLES `pharmacy_stock` WRITE;
/*!40000 ALTER TABLE `pharmacy_stock` DISABLE KEYS */;
/*!40000 ALTER TABLE `pharmacy_stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `test_catalog`
--

DROP TABLE IF EXISTS `test_catalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `test_catalog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `name` varchar(150) NOT NULL,
  `category` varchar(30) NOT NULL,
  `department` varchar(50) DEFAULT NULL,
  `sample_type` varchar(50) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `turnaround_hours` int NOT NULL DEFAULT '24',
  `is_panel` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `test_catalog`
--

LOCK TABLES `test_catalog` WRITE;
/*!40000 ALTER TABLE `test_catalog` DISABLE KEYS */;
INSERT INTO `test_catalog` VALUES (1,10,'CBC (Complete Blood Count)','Hematology','Pathology','Blood',300.00,6,0,'2026-08-03 04:53:54'),(2,10,'ESR','Hematology','Pathology','Blood',150.00,6,0,'2026-08-03 04:53:54'),(3,10,'Hemoglobin (Hb)','Hematology','Pathology','Blood',100.00,4,0,'2026-08-03 04:53:54'),(4,10,'Peripheral Smear','Hematology','Pathology','Blood',250.00,12,0,'2026-08-03 04:53:54'),(5,10,'LFT (Liver Function Test)','Biochemistry','Pathology','Blood',600.00,12,0,'2026-08-03 04:53:54'),(6,10,'KFT (Kidney Function Test)','Biochemistry','Pathology','Blood',600.00,12,0,'2026-08-03 04:53:54'),(7,10,'Blood Sugar (Fasting)','Biochemistry','Pathology','Blood',100.00,4,0,'2026-08-03 04:53:54'),(8,10,'Blood Sugar (PP)','Biochemistry','Pathology','Blood',100.00,4,0,'2026-08-03 04:53:54'),(9,10,'Lipid Profile','Biochemistry','Pathology','Blood',700.00,12,0,'2026-08-03 04:53:54'),(10,10,'Electrolytes (Na/K/Cl)','Biochemistry','Pathology','Blood',400.00,6,0,'2026-08-03 04:53:54'),(11,10,'Urine Culture & Sensitivity','Microbiology','Pathology','Urine',500.00,48,0,'2026-08-03 04:53:54'),(12,10,'Blood Culture & Sensitivity','Microbiology','Pathology','Blood',800.00,72,0,'2026-08-03 04:53:54'),(13,10,'Sputum Culture & Sensitivity','Microbiology','Pathology','Sputum',500.00,48,0,'2026-08-03 04:53:54'),(14,10,'Wound Swab Culture','Microbiology','Pathology','Swab',500.00,48,0,'2026-08-03 04:53:54'),(15,10,'Biopsy - Histopathology','Histopathology','Pathology','Tissue',1500.00,96,0,'2026-08-03 04:53:54'),(16,10,'FNAC (Fine Needle Aspiration Cytology)','Histopathology','Pathology','Tissue',1200.00,72,0,'2026-08-03 04:53:54'),(17,10,'HIV (ELISA)','Serology','Pathology','Blood',400.00,24,0,'2026-08-03 04:53:54'),(18,10,'HBsAg','Serology','Pathology','Blood',350.00,24,0,'2026-08-03 04:53:54'),(19,10,'HCV','Serology','Pathology','Blood',400.00,24,0,'2026-08-03 04:53:54'),(20,10,'VDRL','Serology','Pathology','Blood',200.00,12,0,'2026-08-03 04:53:54'),(21,10,'Widal Test','Serology','Pathology','Blood',200.00,12,0,'2026-08-03 04:53:54'),(22,10,'Dengue NS1/IgM/IgG','Serology','Pathology','Blood',600.00,12,0,'2026-08-03 04:53:54'),(23,10,'Malaria Antigen Test','Serology','Pathology','Blood',300.00,4,0,'2026-08-03 04:53:54'),(24,10,'Chest X-Ray','Radiology','Radiology','N/A',400.00,4,0,'2026-08-03 04:53:54'),(25,10,'Ultrasound Abdomen','Radiology','Radiology','N/A',1000.00,6,0,'2026-08-03 04:53:54'),(26,10,'CT Scan (Plain)','Radiology','Radiology','N/A',3500.00,24,0,'2026-08-03 04:53:54'),(27,10,'MRI (Plain)','Radiology','Radiology','N/A',6000.00,24,0,'2026-08-03 04:53:54'),(28,10,'ECG','Radiology','Radiology','N/A',250.00,1,0,'2026-08-03 04:53:54');
/*!40000 ALTER TABLE `test_catalog` ENABLE KEYS */;
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
INSERT INTO `user_directory` VALUES ('AD-CHG-64701',10,'2026-07-29 12:15:45','staff'),('BB-CHG-14153',10,'2026-08-06 08:34:24','staff'),('BB-CHG-92247',10,'2026-08-06 08:23:27','staff'),('BS-CHG-24966',10,'2026-08-10 04:45:45','staff'),('BS-CHG-46457',10,'2026-08-10 04:56:18','staff'),('DR-CHG-1616',10,'2026-08-05 10:16:56','staff'),('DR-CHG-49545',10,'2026-07-30 08:35:18','staff'),('NR-CHG-88859',10,'2026-07-30 08:31:37','staff'),('OPD-CHG-70518',10,'2026-07-30 04:36:36','staff'),('PAT-CHG-000008',10,'2026-08-10 06:01:52','patient'),('PAT-CHG-0002',10,'2026-07-30 09:02:52','patient'),('PAT-CHG-0003',10,'2026-07-30 09:25:11','patient'),('PAT-CHG-0004',10,'2026-07-30 10:31:18','patient'),('PAT-CHG-0005',10,'2026-08-10 06:06:01','patient'),('PAT-CHG-1001',10,'2026-08-05 09:23:01','patient'),('PAT-CHG-1002',10,'2026-08-05 10:22:37','patient'),('PAT-CHG-1003',10,'2026-08-10 11:06:13','patient'),('PAT-CHG-1111',10,'2026-08-03 05:45:42','patient'),('PATHOLAB-CHG-0001',10,'2026-08-03 05:04:48','staff'),('PATHOLOGY-CHG-0001',10,'2026-08-03 05:04:48','staff'),('PHARMA-CHG-0001',10,'2026-08-05 10:07:34','staff'),('RA-CHG-33409',10,'2026-07-31 06:07:25','staff'),('RADIO-CHG-0001',10,'2026-08-03 05:04:48','staff');
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
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `hospital_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'C5-202226','$2b$10$EtdK7ZCti96Zb.s5HzLA3O.rkSRdnc8lRadei9kZtWQdhpRRdrgOS','Core5 Super Admin','superadmin','2026-07-29 09:12:39',NULL,NULL,NULL,NULL,NULL),(2,'superadmin','$2b$12$R4vVNgm8vGhKw5qKHN/ADeum8prl40jQZy.S/Gy7A5AvA3FtetONK','Core5 Super Admin','superadmin','2026-08-03 04:31:11',NULL,NULL,NULL,NULL,NULL),(3,'AD-CHG-64701','$2b$10$EtdK7ZCti96Zb.s5HzLA3O.rkSRdnc8lRadei9kZtWQdhpRRdrgOS','Rashmi Shetty','hospital_admin','2026-07-29 11:17:02',NULL,NULL,NULL,NULL,10),(4,'OPD-CHG-70518','$2b$10$EtdK7ZCti96Zb.s5HzLA3O.rkSRdnc8lRadei9kZtWQdhpRRdrgOS','Jhon Jacob','receptionist','2026-07-30 04:36:36','jhon.jacob@gmail.com',NULL,'{\"shift\": \"Morning\"}',NULL,10),(5,'NR-CHG-88859','$2b$10$EtdK7ZCti96Zb.s5HzLA3O.rkSRdnc8lRadei9kZtWQdhpRRdrgOS','dipti','nurse','2026-07-30 08:31:37','dipti@core5.co.in',NULL,'{\"ward\": \"4A\", \"shift\": \"Morning\", \"qualification\": \"\"}',NULL,10),(6,'DR-CHG-49545','$2b$10$EtdK7ZCti96Zb.s5HzLA3O.rkSRdnc8lRadei9kZtWQdhpRRdrgOS','Shubham','doctor','2026-07-30 08:35:18','shubham@core5.co.in',NULL,'{\"licenseNumber\": \"\", \"qualification\": \"\", \"specialization\": \"\"}',NULL,10),(7,'RA-CHG-33409','$2b$12$cdKc0u6PrQ.15PYjqN6S/.ETzIm/2HtppR4IXGd9gtD5VQIapBXsu','Aniket','pathology_staff','2026-07-31 06:07:25','aniket.singh@core5.co.in','09137731642','{\"designation\": \"Radiologist\", \"certification\": \"\", \"licenseNumber\": \"\"}',NULL,10),(8,'PATHOLOGY-CHG-0001','$2b$12$dGXobHUILjyO1n9whtYIKeapXfsBOeDOHHsb9AfP9lUFS08daJm0O','Ram','pathology_staff','2026-08-03 05:04:48','ram.pathology@chg.medisys.local',NULL,'{\"designation\": \"Pathologist\"}',NULL,10),(9,'PATHOLAB-CHG-0001','$2b$12$dGXobHUILjyO1n9whtYIKeapXfsBOeDOHHsb9AfP9lUFS08daJm0O','Sham','pathology_staff','2026-08-03 05:04:48','sham.labassistant@chg.medisys.local',NULL,'{\"designation\": \"Lab Assistant\"}',NULL,10),(10,'RADIO-CHG-0001','$2b$12$dGXobHUILjyO1n9whtYIKeapXfsBOeDOHHsb9AfP9lUFS08daJm0O','Dham','pathology_staff','2026-08-03 05:04:48','dham.radiology@chg.medisys.local',NULL,'{\"designation\": \"Radiologist\"}',NULL,10),(26,'PHARMA-CHG-0001','$2b$12$dLvDaX.Mzg/6oUuewFxqeO1DZmEV8L9Mtb1hbtINnf1Dq26q8yg7e','YUVRAJ','pharmacist','2026-08-05 10:07:34','yuvraj@core5.co.in',NULL,'{\"licenseNumber\": \"\", \"qualification\": \"\"}',NULL,10),(27,'DR-CHG-1616','$2b$12$YpA.tziLl7oQc2y6AdZC1.9EQPGQLIUVMBe4eygZfz6rA0QXWqyzu','ARYAN GUPTA','doctor','2026-08-05 10:16:56','aryan@core5.co.in',NULL,'{\"licenseNumber\": \"\", \"qualification\": \"\", \"specialization\": \"CARDIOLOGY\"}',NULL,10),(28,'BB-CHG-92247','$2b$12$k0jdURweev2tdC0wHCZS9.SIDr60ZaqxwLA6V3ueKmOXiiU.8UCNy','Reena Fernandes','blood_bank_staff','2026-08-06 08:23:27','reena@chg.medisys.local','9822033445','{\"certification\": \"BB Tech Cert\", \"licenseNumber\": \"BBL-9012\"}',NULL,10),(29,'BB-CHG-14153','$2b$12$dP8/QFwRreuZhTqqSogbPeTz6P0ABKyZaKf6Tb/eA76J.Lx9cX1Ly','pradip','blood_bank_staff','2026-08-06 08:34:24','aniket.singh@core5.co.in',NULL,'{\"certification\": \"\", \"licenseNumber\": \"\"}',NULL,10),(30,'BS-CHG-24966','$2b$12$Lf0PS5S2TNdTkOTQm1SwDOxcci8nNuFoeW7KdE/IW.qGcpe7NZCOK','Priya Nair','billing_staff','2026-08-10 04:45:45','priya@chg.medisys.local','9822099887','{\"department\": \"Billing\"}',NULL,10),(31,'BS-CHG-46457','$2b$12$vKkmPU9dU4WUETsDY3Y82ObRms4yb/eJEPJuM4e3PGD81kIodWHYe','Amit','billing_staff','2026-08-10 04:56:18','amit@core5.co.in',NULL,'{\"department\": \"Billing\"}',NULL,10);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vitals`
--

DROP TABLE IF EXISTS `vitals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vitals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `patient_uhid` varchar(30) NOT NULL,
  `opd_visit_id` int DEFAULT NULL,
  `ipd_admission_id` int DEFAULT NULL,
  `bp` varchar(20) DEFAULT NULL,
  `temperature` varchar(10) DEFAULT NULL,
  `weight` varchar(10) DEFAULT NULL,
  `spo2` varchar(10) DEFAULT NULL,
  `recorded_by` varchar(50) DEFAULT NULL,
  `recorded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vitals`
--

LOCK TABLES `vitals` WRITE;
/*!40000 ALTER TABLE `vitals` DISABLE KEYS */;
INSERT INTO `vitals` VALUES (1,10,'UH-CHG-000001',NULL,2,'100','102','64',NULL,'NR-CHG-88859','2026-07-30 08:58:24'),(2,10,'UH-CHG-000001',1,NULL,'100','102','64','80','NR-CHG-88859','2026-07-30 09:15:19'),(3,10,'PAT-CHG-1001',6,NULL,'120','100','70','99','NR-CHG-88859','2026-08-05 10:44:22'),(4,10,'PAT-CHG-1003',18,NULL,'120','98.6','78','100','NR-CHG-88859','2026-08-10 11:12:15'),(5,10,'PAT-CHG-1003',18,NULL,NULL,NULL,NULL,NULL,'NR-CHG-88859','2026-08-10 11:48:04');
/*!40000 ALTER TABLE `vitals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wards`
--

DROP TABLE IF EXISTS `wards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `department_id` int DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wards`
--

LOCK TABLES `wards` WRITE;
/*!40000 ALTER TABLE `wards` DISABLE KEYS */;
INSERT INTO `wards` VALUES (1,10,'ICU',NULL,'NR-CHG-88859','2026-07-30 08:32:50'),(2,10,'GENRAL',NULL,'NR-CHG-88859','2026-07-30 09:07:29'),(3,10,'VENTILATOR',NULL,'NR-CHG-88859','2026-07-30 09:44:37');
/*!40000 ALTER TABLE `wards` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-11 13:51:54
