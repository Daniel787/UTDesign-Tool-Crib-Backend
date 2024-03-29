-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `mydb` DEFAULT CHARACTER SET utf8 ;
USE `mydb` ;

-- -----------------------------------------------------
-- Table `mydb`.`Student`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Student` (
  `net_id` VARCHAR(16) NOT NULL,
  `email` VARCHAR(45) NOT NULL,
  `utd_id` INT NULL,
  `student_hold` TINYINT NULL,
  PRIMARY KEY (`net_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`Groups`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Groups` (
  `group_id` INT NOT NULL,
  `group_name` VARCHAR(45) NULL,
  `group_sponsor` VARCHAR(45) NULL,
  PRIMARY KEY (`group_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`Group_Has_Student`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Group_Has_Student` (
  `group_id` INT NOT NULL,
  `net_id` VARCHAR(16) NOT NULL,
  PRIMARY KEY (`group_id`, `net_id`),
  INDEX `fk_GrouphasStudent_Group1_idx` (`group_id` ASC) VISIBLE,
  INDEX `fk_GrouphasStudent_Student1_idx` (`net_id` ASC) VISIBLE,
  CONSTRAINT `fk_Group_Has_Student1`
    FOREIGN KEY (`net_id`)
    REFERENCES `mydb`.`Student` (`net_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Group_has_Group1`
    FOREIGN KEY (`group_id`)
    REFERENCES `mydb`.`Groups` (`group_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`Transaction`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Transaction` (
  `transaction_id` binary(16) NOT NULL,
  `group_id` INT NOT NULL,
  `net_id` VARCHAR(16) NOT NULL,
  `date` DATETIME(3) NOT NULL,
  `type` VARCHAR(10) NULL,
  PRIMARY KEY (`transaction_id`),
  INDEX `fk_Transaction_Student1_idx` (`net_id` ASC) VISIBLE,
  INDEX `fk_Transaction_Groups1_idx` (`group_id` ASC) VISIBLE,
  CONSTRAINT `fk_Transaction_Student1`
    FOREIGN KEY (`net_id`)
    REFERENCES `mydb`.`Group_Has_Student` (`net_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_Transaction_Groups1`
    FOREIGN KEY (`group_id`)
    REFERENCES `mydb`.`Group_Has_Student` (`group_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`Inventory_Part`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Inventory_Part` (
  `part_id` INT NOT NULL,
  `name` VARCHAR(100) NULL,
  `quantity_available` INT NOT NULL,
  `current_cost` DECIMAL(6,2) NOT NULL,
  PRIMARY KEY (`part_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`Rental_Tool`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Rental_Tool` (
  `tool_id` INT NOT NULL,
  `name` VARCHAR(100) NULL,
  PRIMARY KEY (`tool_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`Rented_Tool`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Rented_Tool` (
  `transaction_id` binary(16) NOT NULL,
  `tool_id` INT NOT NULL,
  `returned_date` DATETIME(3) NULL,
  `notification_sent` TINYINT NULL,
  PRIMARY KEY (`transaction_id`, `tool_id`),
  INDEX `fk_rented_tool_rental_tool1_idx` (`tool_id` ASC) VISIBLE,
  CONSTRAINT `fk_rented_tool_transaction1`
    FOREIGN KEY (`transaction_id`)
    REFERENCES `mydb`.`Transaction` (`transaction_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_rented_tool_rental_tool1`
    FOREIGN KEY (`tool_id`)
    REFERENCES `mydb`.`Rental_Tool` (`tool_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`Purchased_Part`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Purchased_Part` (
  `transaction_id` binary(16) NOT NULL,
  `part_id` INT NOT NULL,
  `quantity_purchased` INT NOT NULL,
  `purchased_cost` DECIMAL(6,2) NOT NULL,
  PRIMARY KEY (`transaction_id`, `part_id`),
  INDEX `fk_purchased_part_inventory_part1_idx` (`part_id` ASC) VISIBLE,
  CONSTRAINT `fk_purchased_part_transaction1`
    FOREIGN KEY (`transaction_id`)
    REFERENCES `mydb`.`Transaction` (`transaction_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_purchased_part_inventory_part1`
    FOREIGN KEY (`part_id`)
    REFERENCES `mydb`.`Inventory_Part` (`part_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`Printer`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Printer` (
  `printer_id` INT NOT NULL,
  `printer_name` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`printer_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`Material`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`Material` (
  `material_id` INT NOT NULL,
  `material_name` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`material_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `mydb`.`printing`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `mydb`.`printing` (
  `transaction_id` binary(16) NOT NULL,
  `filename` VARCHAR(100) NOT NULL,
  `jobname` VARCHAR(45) NULL,
  `cost` DECIMAL(6,2) NOT NULL,
  `printer_id` INT NOT NULL,
  `material_id` INT NOT NULL,
  `tip` VARCHAR(45) NULL,
  `color` VARCHAR(45) NULL,
  `printingcol` VARCHAR(45) NULL,
  `estimated_date` DATETIME(3) NULL,
  `approval_date` DATETIME(3) NULL,
  `queue_date` DATETIME(3) NULL,
  `printstart_date` DATETIME(3) NULL,
  `ready_date` DATETIME(3) NULL,
  `dropped` TINYINT NULL,
  `error` TINYINT NULL,
  PRIMARY KEY (`transaction_id`),
  INDEX `print_transaction_fk_idx` (`transaction_id` ASC) VISIBLE,
  INDEX `print_printer_fk_idx` (`printer_id` ASC) VISIBLE,
  INDEX `print_material_fk_idx` (`material_id` ASC) VISIBLE,
  CONSTRAINT `print_transaction_fk`
    FOREIGN KEY (`transaction_id`)
    REFERENCES `mydb`.`Transaction` (`transaction_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `print_printer_fk`
    FOREIGN KEY (`printer_id`)
    REFERENCES `mydb`.`Printer` (`printer_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `print_material_fk`
    FOREIGN KEY (`material_id`)
    REFERENCES `mydb`.`Material` (`material_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

insert into mydb.inventory_part (part_id, name, quantity_available, current_cost) VALUES
(12345, "phillips screw size X", 17, .01), -- 17 screws in stock, one penny (0.01 dollars) per screw
(56789, "arduino micro without headers", 8, 12),  -- 8 arduinos in stock, 12 dollars per arduino
(35791, "hot glue stick", 5, .50); -- 4 hot glue gun sticks in stock, 0.50 dollars per stick

insert into mydb.student (net_id, email, utd_id, student_hold) values
('abc180002', "002@utdallas", 2, false),
('adf180004', "004@utdallas", 4, true),
('bcd180003', "003@utdallas", 3, false),
('bef180005', "005@utdallas", 5, false),
('bgh180007', "007@utdallas", 7, true),
('axy190000', "000@utdallas", 0, false),
('bxy190001', "001@utdallas", 1, false),
('aaa155001', "15001@utdallas", 151, false);

insert into mydb.groups (group_id, group_name, group_sponsor) VALUES
(24, "epics group", "ntafos"),
(357, "toolshed group", "robles"),
(01, "electrical group", "bishop");

insert into mydb.group_has_student (group_id, net_id) VALUES
(24,  'abc180002'),
(24,  'adf180004'),
(357, 'bcd180003'),
(357, 'bef180005'),
(357, 'bgh180007'),
(01,  'axy190000'),
(01,  'bxy190001'),
(01,  'aaa155001'),
(357,  'aaa155001');


insert into mydb.rental_tool (tool_id, name) VALUES
(111, "hammer"),
(222, "screwdriver"),
(333, "drill");

insert into mydb.transaction (transaction_id, group_id, net_id, date, type) values
(1,  24, 'abc180002', '2021-02-13T08:34:09', 'rental'),
(2,  24, 'abc180002', '2021-02-13T08:34:09', 'rental'),
(3,  24, 'adf180004', '2021-02-14T04:00:00', 'rental'),
(4, 357, 'bcd180003', '2021-02-18T04:03:03', 'rental'),
(5, 357, 'bcd180003', '2021-02-18T06:04:04', 'rental'),
(6, 357, 'bef180005', '2021-02-18T07:01:01', 'rental'),
(7, 357, 'bgh180007', '2021-02-22T14:15:00', 'rental');

insert into mydb.rented_tool (transaction_id, tool_id, returned_date, notification_sent) values
(1, 111, '2021-02-13T10:05:00', false),
(2, 222, '2021-02-13T10:05:00', false),
(3, 111,  null,                 false),
(4, 333, '2021-02-18T06:00:00', false),
(5, 333, '2021-02-18T08:00:00', false),
(6, 222, '2021-02-19T07:00:00', false),
(7, 222, null,                  false);


insert into mydb.transaction (transaction_id, group_id, net_id, date, type) values
(76,   24, 'abc180002', '2021-02-02T02:02:02.002', 'purchase'),
(77,  357, 'bef180005', '2021-03-10T06:00:00', 'purchase'),
(78,  357, 'bgh180007', '2021-03-10T06:05:00', 'purchase'),
(79,   24, 'adf180004', '2021-03-18T09:00:00', 'purchase'),
(80,   24, 'adf180004', '2021-03-18T09:05:00', 'purchase'),
(81,   01, 'bxy190001', '2021-03-22T15:00:00', 'purchase'),
(82,   01, 'aaa155001', '2021-03-22T15:05:00', 'purchase'),
(83,  357, 'aaa155001', '2021-03-22T15:10:00', 'purchase');

insert into mydb.purchased_part (transaction_id, part_id, quantity_purchased, purchased_cost) values
(76, 12345, 1, .01),
(77, 56789, 2, 12),
(78, 35791, 3, .5),
(79, 12345, 1, .01),
(80, 35791, 1, .5),
(81, 12345, 7, .01),
(82, 35791, 2, .5),
(83, 56789, 1, 12);