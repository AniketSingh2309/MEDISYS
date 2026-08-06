-- MySQL dump 10.13  Distrib 9.5.0, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: medisys_pharmacy
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
-- Current Database: `medisys_pharmacy`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `medisys_pharmacy` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `medisys_pharmacy`;

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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pharmacy_invoices`
--

LOCK TABLES `pharmacy_invoices` WRITE;
/*!40000 ALTER TABLE `pharmacy_invoices` DISABLE KEYS */;
INSERT INTO `pharmacy_invoices` VALUES (1,10,'PHINV-9086',1,'PAT-CHG-1002','SAKSHI','UPI',1,20.00,'Paid','PHARMA-CHG-0001','2026-08-06 05:23:14','2026-08-06 05:39:51'),(2,10,'PHINV-9342',2,'PAT-CHG-1002','SAKSHI','UPI',1,18.00,'Paid','PHARMA-CHG-0001','2026-08-06 05:23:16','2026-08-06 05:39:48'),(3,10,'PHINV-9399',1,'PAT-CHG-1002','SAKSHI','Cash',2,30.00,'Paid','PHARMA-CHG-0001','2026-08-06 05:37:52','2026-08-06 05:39:45'),(4,10,'PHINV-9168',3,'PAT-CHG-0002','ASHISH','Cash',1,180.00,'Paid','PHARMA-CHG-0001','2026-08-06 05:39:58','2026-08-06 05:46:55'),(5,10,'PHINV-8985',4,'PAT-CHG-0002','ASHISH','Cash',1,15.00,'Paid','PHARMA-CHG-0001','2026-08-06 05:45:33','2026-08-06 05:45:34'),(6,10,'PHINV-9794',NULL,'WALKIN-OTC','abhishek','Cash',1,15.00,'Paid','PHARMA-CHG-0001','2026-08-06 05:56:22','2026-08-06 05:56:28');
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
  `invoice_id` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pharmacy_orders`
--

LOCK TABLES `pharmacy_orders` WRITE;
/*!40000 ALTER TABLE `pharmacy_orders` DISABLE KEYS */;
INSERT INTO `pharmacy_orders` VALUES (1,10,13,NULL,'PAT-CHG-1002','DR-CHG-49545','Dolo 650','1 tablet twice daily','3 days','routine','dispensed','PHARMA-CHG-0001','2026-08-06 05:23:14','2026-08-06 05:08:51',NULL,NULL,3),(2,10,13,NULL,'PAT-CHG-1002','DR-CHG-49545','Crocin 500','1 tablet as needed for fever','3 days','routine','dispensed','PHARMA-CHG-0001','2026-08-06 05:23:16','2026-08-06 05:08:51',NULL,NULL,3),(3,10,NULL,NULL,'PAT-CHG-0002','DR-CHG-49545','Augmentin 625','1 tablet twice daily','5 days','routine','dispensed','PHARMA-CHG-0001','2026-08-06 05:38:19','2026-08-06 05:38:19',180.00,NULL,4),(4,10,NULL,NULL,'PAT-CHG-0002','DR-CHG-49545','Cetrizine 10mg','1 tablet at night','5 days','routine','dispensed','PHARMA-CHG-0001','2026-08-06 05:42:39','2026-08-06 05:42:39',15.00,NULL,5);
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
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pharmacy_stock`
--

LOCK TABLES `pharmacy_stock` WRITE;
/*!40000 ALTER TABLE `pharmacy_stock` DISABLE KEYS */;
INSERT INTO `pharmacy_stock` VALUES (1,10,'Dolo 650','Analgesic','B2026-001','2026-06-26',99,40,20.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:23:14'),(2,10,'Crocin 500','Analgesic','B2026-002','2028-06-06',98,40,18.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:23:16'),(3,10,'Paracetamol 500mg','Analgesic','B2026-003','2027-05-06',6,50,12.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(4,10,'Combiflam','Analgesic','B2026-004','2028-02-19',87,30,25.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(5,10,'Disprin','Analgesic','B2026-005','2027-04-23',213,30,15.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:56:22'),(6,10,'Saridon','Analgesic','B2026-006','2027-02-04',240,20,22.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(7,10,'Zerodol-SP','Analgesic','B2026-007','2027-02-08',363,20,85.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(8,10,'Augmentin 625','Antibiotic','B2026-008','2028-01-08',205,25,180.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:38:19'),(9,10,'Azithral 500','Antibiotic','B2026-009','2027-09-16',230,20,95.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(10,10,'Amoxyclav 625','Antibiotic','B2026-010','2028-06-29',219,20,150.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(11,10,'Ciplox 500','Antibiotic','B2026-011','2028-05-16',0,20,60.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(12,10,'Zifi 200','Antibiotic','B2026-012','2026-08-16',1,15,140.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(13,10,'Taxim-O 200','Antibiotic','B2026-013','2027-08-06',1,15,165.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(14,10,'Monocef 1g','Antibiotic','B2026-014','2026-06-29',170,15,90.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(15,10,'Metrogyl 400','Antibiotic','B2026-015','2028-07-06',279,25,35.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(16,10,'Pantop 40','Gastro','B2026-016','2028-05-26',254,30,45.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(17,10,'Rantac 150','Gastro','B2026-017','2027-05-11',369,30,30.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(18,10,'Digene','Gastro','B2026-018','2027-05-03',428,20,40.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(19,10,'Eno','Gastro','B2026-019','2027-10-30',235,20,20.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(20,10,'Cyclopam','Gastro','B2026-020','2028-01-31',55,20,28.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(21,10,'Meftal Spas','Gastro','B2026-021','2027-02-26',0,20,55.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(22,10,'Pan-D','Gastro','B2026-022','2027-12-20',4,25,130.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(23,10,'Cetrizine 10mg','Antihistamine','B2026-023','2026-09-07',1,30,15.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:42:39'),(24,10,'Allegra 120','Antihistamine','B2026-024','2027-02-17',485,20,110.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(25,10,'Avil 25','Antihistamine','B2026-025','2027-10-04',378,20,18.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(26,10,'Sinarest','Antihistamine','B2026-026','2027-02-20',481,25,32.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(27,10,'Cheston Cold','Antihistamine','B2026-027','2026-06-28',353,20,38.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(28,10,'Glycomet 500','Antidiabetic','B2026-028','2028-04-23',273,30,45.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(29,10,'Januvia 100','Antidiabetic','B2026-029','2027-02-07',225,10,420.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(30,10,'Glimepiride 2mg','Antidiabetic','B2026-030','2027-12-29',424,20,60.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(31,10,'Amlodac 5','Cardiac','B2026-031','2027-03-02',0,25,35.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(32,10,'Telma 40','Cardiac','B2026-032','2027-04-30',2,20,95.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(33,10,'Ecosprin 75','Cardiac','B2026-033','2027-02-18',1,40,20.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(34,10,'Atorva 10','Cardiac','B2026-034','2026-09-05',111,25,75.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(35,10,'Concor 5','Cardiac','B2026-035','2028-01-13',436,15,110.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(36,10,'Becosules','Vitamin','B2026-036','2027-02-05',255,30,25.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(37,10,'Shelcal 500','Vitamin','B2026-037','2027-08-24',382,25,90.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(38,10,'Zincovit','Vitamin','B2026-038','2028-02-03',212,20,105.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(39,10,'Neurobion Forte','Vitamin','B2026-039','2027-07-17',175,20,55.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(40,10,'Limcee','Vitamin','B2026-040','2026-07-03',306,25,30.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(41,10,'Revital H','Vitamin','B2026-041','2027-09-02',0,10,480.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(42,10,'Asthalin Inhaler','Respiratory','B2026-042','2027-07-28',7,12,140.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(43,10,'Montair LC','Respiratory','B2026-043','2027-11-13',1,15,130.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(44,10,'Ascoril LS Syrup','Respiratory','B2026-044','2027-05-01',118,15,95.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(45,10,'Budecort Inhaler','Respiratory','B2026-045','2026-09-22',263,10,320.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(46,10,'Betnovate Cream','Dermatology','B2026-046','2027-05-30',123,15,60.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(47,10,'Candid Powder','Dermatology','B2026-047','2027-12-19',420,15,85.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(48,10,'Soframycin Ointment','Dermatology','B2026-048','2028-01-03',491,15,45.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(49,10,'Normal Saline 500ml','IV Fluid','B2026-049','2027-12-21',453,60,40.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(50,10,'Ringer Lactate','IV Fluid','B2026-050','2028-06-14',346,60,45.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13'),(51,10,'ORS Sachet','IV Fluid','B2026-051','2027-04-12',0,100,8.00,'PHARMA-CHG-0001','2026-08-06 05:20:13','2026-08-06 05:20:13');
/*!40000 ALTER TABLE `pharmacy_stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'medisys_pharmacy'
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

-- Dump completed on 2026-08-06 11:36:11
