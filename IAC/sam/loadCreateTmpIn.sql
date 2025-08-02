-- public."Tmp_In_Employee" definition

-- Drop table

-- DROP TABLE public."Tmp_In_Employee";

CREATE TABLE public."Tmp_In_Employee" (
	Row_ID serial,
    client_id varchar(64) NULL,
    Company_ID varchar(64) NOT NULL,
	Employee_ID varchar(64) NOT NULL,
	First_Name varchar(20) NULL,
	Last_Name varchar(20) NULL,
	Post_Code varchar(10) NULL,
	Annual_Salary money NULL,
	Date_of_Birth date NULL,
	Date_of_Hire date NULL,
	Date_of_Termination date NULL,
	Term_Reason varchar(20) NULL,
	Country varchar(6) NULL,
	Currency bpchar(3) NULL,
	Performance_Review varchar(20) NULL,
	Work_Location_ID varchar(20) NULL,
	Department_ID varchar(20) NULL,
	Job_ID varchar(20) NULL,
	Reports_To varchar(64) NULL,
	Last_Salary_Adjustment_Date date NULL,
	Address_1 varchar(48) NULL,
	Address_2 varchar(48) NULL,
	City varchar(32) NULL,
	State varchar(32) NULL,
	Flight_Risk_Score numeric(8, 4) NULL,
	Gender varchar(10) NULL,
	Marital_Status varchar(14) NULL,
	EEO1 varchar(14) NULL,
	period_date date NULL,
	last_update date NULL,
	processed bool NULL,
	CONSTRAINT "PK_Tmp_in_employee" PRIMARY KEY (Row_ID)
)
WITH (
	autovacuum_enabled=true
);


