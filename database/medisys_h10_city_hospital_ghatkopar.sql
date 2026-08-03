-- MySQL dump 10.13  Distrib 9.5.0, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: medisys_h10_city_hospital_ghatkopar
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
-- Current Database: `medisys_h10_city_hospital_ghatkopar`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `medisys_h10_city_hospital_ghatkopar` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `medisys_h10_city_hospital_ghatkopar`;

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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `beds`
--

LOCK TABLES `beds` WRITE;
/*!40000 ALTER TABLE `beds` DISABLE KEYS */;
INSERT INTO `beds` VALUES (1,10,1,'b-01','occupied','2026-07-30 08:33:05'),(2,10,2,'B-01','occupied','2026-07-30 09:07:36'),(3,10,3,'V-01','occupied','2026-07-30 09:44:45'),(4,10,1,'B-02','occupied','2026-07-30 10:34:15');
/*!40000 ALTER TABLE `beds` ENABLE KEYS */;
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
  `decision` varchar(20) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consultations`
--

LOCK TABLES `consultations` WRITE;
/*!40000 ALTER TABLE `consultations` DISABLE KEYS */;
INSERT INTO `consultations` VALUES (1,10,1,'UH-CHG-000001','DR-CHG-49545',NULL,NULL,'order_tests','2026-07-30 08:42:57'),(2,10,4,'PAT-CHG-0003','DR-CHG-49545','bawasir','normal','admit','2026-07-30 09:41:53'),(3,10,5,'PAT-CHG-0004','DR-CHG-49545','NO PAIN NO GAIN',NULL,'admit','2026-07-30 10:33:15');
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departments`
--

LOCK TABLES `departments` WRITE;
/*!40000 ALTER TABLE `departments` DISABLE KEYS */;
/*!40000 ALTER TABLE `departments` ENABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doctor_nurse_teams`
--

LOCK TABLES `doctor_nurse_teams` WRITE;
/*!40000 ALTER TABLE `doctor_nurse_teams` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `doctor_schedules`
--

LOCK TABLES `doctor_schedules` WRITE;
/*!40000 ALTER TABLE `doctor_schedules` DISABLE KEYS */;
INSERT INTO `doctor_schedules` VALUES (2,10,'DR-CHG-49545',0,'09:00:00','20:00:00',15,'2026-07-30 09:38:52'),(3,10,'DR-CHG-49545',1,'09:00:00','20:00:00',15,'2026-07-30 09:38:52'),(4,10,'DR-CHG-49545',2,'09:00:00','20:00:00',15,'2026-07-30 09:38:52'),(5,10,'DR-CHG-49545',3,'09:00:00','20:00:00',15,'2026-07-30 09:38:52'),(6,10,'DR-CHG-49545',4,'09:00:00','20:00:00',15,'2026-07-30 09:38:52'),(7,10,'DR-CHG-49545',5,'09:00:00','20:00:00',15,'2026-07-30 09:38:52'),(8,10,'DR-CHG-49545',6,'09:00:00','20:00:00',15,'2026-07-30 09:38:52');
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
INSERT INTO `hospitals` VALUES (10,'City Hospital Ghatkopar',NULL,NULL,NULL,'A-704, Regnecy Garden Purnima Kalyan west','Kalyan','Maharashtra','421301',NULL,NULL,'Rashmi Shetty','rashmi.shetty@core5.co.in','[\"opd\", \"radiology\", \"billing\", \"pharmacy\", \"pathology\", \"laboratory\"]',1,'active',NULL,NULL,'C5-202226','2026-07-29 11:17:01','CHG','AD-CHG-64701','ward_based');
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ipd_admissions`
--

LOCK TABLES `ipd_admissions` WRITE;
/*!40000 ALTER TABLE `ipd_admissions` DISABLE KEYS */;
INSERT INTO `ipd_admissions` VALUES (2,10,'UH-CHG-000001','DR-CHG-49545',1,1,1,NULL,NULL,'admitted',NULL,NULL,'OPD-CHG-70518','2026-07-30 08:53:05','2026-07-30 08:56:58'),(3,10,'PAT-CHG-0002','DR-CHG-49545',2,2,0,NULL,NULL,'admitted',NULL,NULL,'OPD-CHG-70518','2026-07-30 09:06:37','2026-07-30 09:07:49'),(6,10,'PAT-CHG-0003','DR-CHG-49545',3,3,1,NULL,NULL,'admitted',NULL,NULL,'OPD-CHG-70518','2026-07-30 09:42:49','2026-07-30 09:44:57'),(7,10,'PAT-CHG-0004','DR-CHG-49545',1,4,0,NULL,NULL,'admitted',5,NULL,'DR-CHG-49545','2026-07-30 10:33:15','2026-07-30 10:34:28');
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lab_orders`
--

LOCK TABLES `lab_orders` WRITE;
/*!40000 ALTER TABLE `lab_orders` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nurse_shift_roster`
--

LOCK TABLES `nurse_shift_roster` WRITE;
/*!40000 ALTER TABLE `nurse_shift_roster` DISABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opd_visits`
--

LOCK TABLES `opd_visits` WRITE;
/*!40000 ALTER TABLE `opd_visits` DISABLE KEYS */;
INSERT INTO `opd_visits` VALUES (1,10,1,'UH-CHG-000001','DR-CHG-49545','2026-07-30',NULL,'walk-in','completed','OPD-CHG-70518','2026-07-30 08:40:17'),(2,10,1,'PAT-CHG-0002','DR-CHG-49545','2026-08-01',NULL,'walk-in','waiting','OPD-CHG-70518','2026-07-30 09:05:51'),(3,10,2,'PAT-CHG-0002','DR-CHG-49545','2026-08-01',NULL,'walk-in','waiting','OPD-CHG-70518','2026-07-30 09:06:01'),(4,10,2,'PAT-CHG-0003','DR-CHG-49545','2026-07-30','09:45:00','appointment','completed','OPD-CHG-70518','2026-07-30 09:40:29'),(5,10,3,'PAT-CHG-0004','DR-CHG-49545','2026-07-30','12:15:00','appointment','completed','OPD-CHG-70518','2026-07-30 10:31:58');
/*!40000 ALTER TABLE `opd_visits` ENABLE KEYS */;
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `uhid` (`uhid`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patients`
--

LOCK TABLES `patients` WRITE;
/*!40000 ALTER TABLE `patients` DISABLE KEYS */;
INSERT INTO `patients` VALUES (1,10,'UH-CHG-000001',NULL,'abhi','2002-09-17','Male',NULL,NULL,NULL,NULL,NULL,'walk-in','OPD-CHG-70518','2026-07-30 06:44:10'),(2,10,'PAT-CHG-1111','$2b$12$dGXobHUILjyO1n9whtYIKeapXfsBOeDOHHsb9AfP9lUFS08daJm0O','pranay','2026-07-30','Male',NULL,NULL,NULL,NULL,NULL,'walk-in','OPD-CHG-70518','2026-07-30 06:49:25'),(3,10,'PAT-CHG-0002','$2b$12$vutj1d.Uislu6BaAWH2QxefB/va9SwL8cf8wBfmVdMjr./CiwIoq2','ASHISH',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'referral','OPD-CHG-70518','2026-07-30 09:02:52'),(4,10,'PAT-CHG-0003','$2b$12$KnTbjbUcEVhYO/HjUeSvyejV60ernWAv1BboY0LGVlptyZOUkssKW','VIKRAM',NULL,NULL,'9137731642','A-704, Regnecy Garden Purnima Kalyan west',NULL,NULL,NULL,'walk-in','OPD-CHG-70518','2026-07-30 09:25:11'),(5,10,'PAT-CHG-0004','$2b$12$eJQiOFNFdHWPMf3EsW8E3.yfQaCAnTmT0zQ1F3VQZVJVXo8faGxiC','NITISH',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'walk-in','OPD-CHG-70518','2026-07-30 10:31:18');
/*!40000 ALTER TABLE `patients` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
INSERT INTO `user_directory` VALUES ('AD-CHG-64701',10,'2026-07-29 12:15:45','staff'),('DR-CHG-49545',10,'2026-07-30 08:35:18','staff'),('NR-CHG-88859',10,'2026-07-30 08:31:37','staff'),('OPD-CHG-70518',10,'2026-07-30 04:36:36','staff'),('PAT-CHG-0002',10,'2026-07-30 09:02:52','patient'),('PAT-CHG-0003',10,'2026-07-30 09:25:11','patient'),('PAT-CHG-0004',10,'2026-07-30 10:31:18','patient'),('PAT-CHG-1111',10,'2026-08-03 05:45:42','patient'),('PATHOLAB-CHG-0001',10,'2026-08-03 05:04:48','staff'),('PATHOLOGY-CHG-0001',10,'2026-08-03 05:04:48','staff'),('RA-CHG-33409',10,'2026-07-31 06:07:25','staff'),('RADIO-CHG-0001',10,'2026-08-03 05:04:48','staff');
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
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'C5-202226','$2b$12$uOuhSRQHw3/JtMy85heJFe6cbllyMKMekMr6Chzt/0B23SQxtnN7e','Core5 Super Admin','superadmin','2026-07-29 09:12:39',NULL,NULL,NULL,NULL,NULL),(2,'superadmin','$2b$12$R4vVNgm8vGhKw5qKHN/ADeum8prl40jQZy.S/Gy7A5AvA3FtetONK','Core5 Super Admin','superadmin','2026-08-03 04:31:11',NULL,NULL,NULL,NULL,NULL),(3,'AD-CHG-64701','$2b$12$AshppteSWweWBh.u15V8JuDanqC.0mbMp.An6Oh64TDwU5MUR1ioS','Rashmi Shetty','hospital_admin','2026-07-29 11:17:02',NULL,NULL,NULL,NULL,10),(4,'OPD-CHG-70518','$2b$12$Z0DrpL0QD13aS5atcnVmn.24/zOldZZX53GvIa.Iy8FQ5vL/GEJ52','Jhon Jacob','receptionist','2026-07-30 04:36:36','jhon.jacob@gmail.com',NULL,'{\"shift\": \"Morning\"}',NULL,10),(5,'NR-CHG-88859','$2b$12$khDajQZJlZ5t57lO9pyhXe/V35teNRVtjot.4bB6zPxZtU/V8Azb.','dipti','nurse','2026-07-30 08:31:37','dipti@core5.co.in',NULL,'{\"ward\": \"4A\", \"shift\": \"Morning\", \"qualification\": \"\"}',NULL,10),(6,'DR-CHG-49545','$2b$12$gAkUYgFvYkBXXEOoBqFME.s1k.xvSYj9pXXUvfH.gC7GBWaBS50eC','Shubham','doctor','2026-07-30 08:35:18','shubham@core5.co.in',NULL,'{\"licenseNumber\": \"\", \"qualification\": \"\", \"specialization\": \"\"}',NULL,10),(7,'RA-CHG-33409','$2b$12$cdKc0u6PrQ.15PYjqN6S/.ETzIm/2HtppR4IXGd9gtD5VQIapBXsu','Aniket','pathology_staff','2026-07-31 06:07:25','aniket.singh@core5.co.in','09137731642','{\"designation\": \"Radiologist\", \"certification\": \"\", \"licenseNumber\": \"\"}',NULL,10),(8,'PATHOLOGY-CHG-0001','$2b$12$dGXobHUILjyO1n9whtYIKeapXfsBOeDOHHsb9AfP9lUFS08daJm0O','Ram','pathology_staff','2026-08-03 05:04:48','ram.pathology@chg.medisys.local',NULL,'{\"designation\": \"Pathologist\"}',NULL,10),(9,'PATHOLAB-CHG-0001','$2b$12$dGXobHUILjyO1n9whtYIKeapXfsBOeDOHHsb9AfP9lUFS08daJm0O','Sham','pathology_staff','2026-08-03 05:04:48','sham.labassistant@chg.medisys.local',NULL,'{\"designation\": \"Lab Assistant\"}',NULL,10),(10,'RADIO-CHG-0001','$2b$12$dGXobHUILjyO1n9whtYIKeapXfsBOeDOHHsb9AfP9lUFS08daJm0O','Dham','pathology_staff','2026-08-03 05:04:48','dham.radiology@chg.medisys.local',NULL,'{\"designation\": \"Radiologist\"}',NULL,10);
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vitals`
--

LOCK TABLES `vitals` WRITE;
/*!40000 ALTER TABLE `vitals` DISABLE KEYS */;
INSERT INTO `vitals` VALUES (1,10,'UH-CHG-000001',NULL,2,'100','102','64',NULL,'NR-CHG-88859','2026-07-30 08:58:24'),(2,10,'UH-CHG-000001',1,NULL,'100','102','64','80','NR-CHG-88859','2026-07-30 09:15:19');
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wards`
--

LOCK TABLES `wards` WRITE;
/*!40000 ALTER TABLE `wards` DISABLE KEYS */;
INSERT INTO `wards` VALUES (1,10,'ICU',NULL,'NR-CHG-88859','2026-07-30 08:32:50'),(2,10,'GENRAL',NULL,'NR-CHG-88859','2026-07-30 09:07:29'),(3,10,'VENTILATOR',NULL,'NR-CHG-88859','2026-07-30 09:44:37');
/*!40000 ALTER TABLE `wards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'medisys_h10_city_hospital_ghatkopar'
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

-- Dump completed on 2026-08-03 11:18:46
