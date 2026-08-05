-- MEDISYS Dedicated Pharmacy Database Schema
CREATE DATABASE IF NOT EXISTS `medisys_pharmacy`;
USE `medisys_pharmacy`;

-- 1. Pharmacy Orders (Doctor Prescriptions)
CREATE TABLE IF NOT EXISTS `pharmacy_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hospital_id` INT NOT NULL,
  `opd_visit_id` INT NULL,
  `ipd_admission_id` INT NULL,
  `patient_uhid` VARCHAR(30) NOT NULL,
  `doctor_user_id` VARCHAR(50) NOT NULL,
  `medicine_name` VARCHAR(150) NOT NULL,
  `dosage` VARCHAR(100) NOT NULL,
  `duration` VARCHAR(50) NOT NULL,
  `urgency` ENUM('routine', 'urgent') NOT NULL DEFAULT 'routine',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending_pharmacy',
  `dispensed_by` VARCHAR(50) NULL,
  `dispensed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `amount` DECIMAL(10,2) NULL,
  `payment_mode` VARCHAR(20) NULL
);

-- 2. Pharmacy Stock (FEFO Inventory)
CREATE TABLE IF NOT EXISTS `pharmacy_stock` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hospital_id` INT NOT NULL,
  `medicine_name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `batch_number` VARCHAR(50) NOT NULL,
  `expiry_date` DATE NOT NULL,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `min_stock_level` INT NOT NULL DEFAULT 10,
  `unit_price` DECIMAL(10,2) NULL,
  `added_by` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Pharmacy Purchase Orders (Reorders & POs)
CREATE TABLE IF NOT EXISTS `pharmacy_purchase_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hospital_id` INT NOT NULL,
  `po_number` VARCHAR(50) NOT NULL UNIQUE,
  `supplier_name` VARCHAR(150) NOT NULL,
  `items_summary` VARCHAR(255) NOT NULL,
  `total_items` INT NOT NULL DEFAULT 1,
  `status` VARCHAR(30) NOT NULL DEFAULT 'Submitted',
  `created_by` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Pharmacy Invoices (Billing & Payments)
CREATE TABLE IF NOT EXISTS `pharmacy_invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `hospital_id` INT NOT NULL,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `order_id` INT NULL,
  `patient_uhid` VARCHAR(30) NOT NULL,
  `patient_name` VARCHAR(150) NOT NULL,
  `payment_type` VARCHAR(30) NOT NULL DEFAULT 'Cash',
  `item_count` INT NOT NULL DEFAULT 1,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_status` VARCHAR(20) NOT NULL DEFAULT 'Pending',
  `created_by` VARCHAR(50) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `paid_at` TIMESTAMP NULL
);
