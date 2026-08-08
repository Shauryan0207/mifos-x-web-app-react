# OpenAPI Gaps & Missing Fields Report

This document tracks missing or incorrect fields in the OpenAPI-generated interfaces used in the React migration of the Mifos X Web App. Do modify this based if you notice any additions/deletions need to be made to this list

---

## Admin Users

### `/users`

**Missing in `GetUsersResponse`:**

- `isSelfServiceUser`

### `/users/{id}`

**Missing in `GetUsersUserIdResponse`:**

- `isSelfServiceUser`

---

## Admin Products

### `/products/loan-products/{id}/general`

**Missing in `GetLoanProductsProductIdResponse`:**

- `externalId`
- `startDate`
- `closeDate`
- `installmentInMultiplesOf`
- `repaymentStartDateType.description` (missing → wrong formatting)
- `accountMovesOutOfNPAOnlyOnArrearsCompletion`
- `holdGuaranteeFunds`
- More missing fields in description/code
- Unnecessary fields also present

### `/products/loan-products/create`

**Missing in `GetLoanProductsTemplateResponse`:**

- `fundOptions`
- `allowPartialPeriodInterestCalculation` is misspelled
- `delinquencyBucketOptions` missing
- `interestFreePeriodOptions` missing
- `overAppliedCalculationTypeOptions` missing
- `floatingRateOptions` missing

### `/products/saving-products/{id}/general`

**Missing in `GetSavingsProductsProductIdResponse`:**

- `enforceMinRequiredBalance`
- `withHoldTax`
- `allowOverdraft`
- `isDormancyTrackingActive`
- Additional fields missing

### `/savingsproducts (create)`

**Missing in `PostSavingsProductsRequest`:**

- `minRequiredOpeningBalance`
- `lockinPeriodFrequency`
- `lockinPeriodFrequencyType`
- `withdrawalFeeForTransfers`
- `minBalanceForInterestCalculation`
- `enforceMinRequiredBalance`
- `minRequiredBalance`
- `withHoldTax`
- `allowOverdraft`
- `isDormancyTrackingActive`

### `/products/share`

- Not present in OpenAPI

### `/products/products-mix`

- `loanproducts?associations=productMixes`
- `GetLoanProductsResponse` does not include product mix data

### `/charges`

- `taxGroupId` missing from `ChargeRequest`
- `taxGroupOptions` typed as `TaxGroupData`, but that type is missing `id` and `name`

### `/fixeddepositproducts`

- `amountRangeFrom`/`amountRangeTo` missing from `PostFixedDepositProductsChartSlabs`

### `/recurringdepositproducts`

- `amountRangeFrom`/`amountRangeTo` missing from `PostRecurringDepositProductsChartSlabs`

### `/taxes/component`

**Missing in `PostTaxesComponentsRequest`:**

- `debitAccountType`
- `debitAccountId`

**Misspelled in `PostTaxesComponentsRequest`:**

- `creditAccountId` is spelled as `creditAcountId` (missing 'c')
- `debitAccountId` is spelled as `debitAcountId` (missing 'c')

**Missing in `GetTaxesComponentsResponse`:**

- `debitAccountType`
- `debitAccount`

### `/taxes/group`

**Missing in `TaxGroupData` (template response):**

- `taxComponents` — API returns it but not in spec, only `taxAssociations` is present

**Missing in `GetTaxesGroupTaxAssociations`:**

- `endDate`

**Missing in `PutTaxesGroupTaxComponents`:**

- `startDate`

**Serialization issue in `PostTaxesGroupRequest` and `PutTaxesGroupTaxGroupIdRequest`:**

- `taxComponents` is typed as `Set` but must be sent as array for correct JSON serialization

---

## Admin Organization

### `/organization/offices`

- `GetOfficesResponse` missing `parentName`

### `/organization/currencies`

- `/v1/currencies (retrieveCurrencies)` → mapped to `ApplicationCurrencyConfigurationData`, but fetch fails
- `CurrencyData` with extra fields works instead

### `/organization/tellers/create`

- `PostTellersRequest` missing `endDate` → impossible to create tellers

### `/organization/holidays/create`

- `retrieveRepaymentScheduleUpdationTypeOptions` not mapped to any interface

### `/organization/holidays/{id}/edit`

- `GetHolidayResponse` missing `description` → cannot fetch previous value for edit

### `/organization/employees/{id}/edit`

- `UpdateStaffResponse`, `PutStaffResponse` missing required values for editing

### `/organization/tellers/{id}/edit`

- `GetTellersResponse` missing `endDate` and `description` → edit blocked

---

## Admin System

### `/system/data-tables`

- `GetDataTablesResponse` missing `entitySubType`
- Page works, but causes many TypeScript errors

### `/system/roles-and-permissions`

- `GetRolesResponse` missing `status`

---

## Admin Templates

### `/templates/template`

- `GetTemplatesTemplateResponse`: `entity`, `type` defined as numbers instead of arrays

### `/templates/{id}/template`

- no defined type

---

## Institution Centers

### `/centers`

- `GetCentersResponse` → references `GetCentersPageItems`
- `GetCentersPageItems` missing:
  - `accountNo`
  - `externalId`

### `/centers/{id}/general`

- `GetCentersCenterIdResponse` missing:
  - `accountNo`
  - `externalId`
  - `activationDate`
- Causes TypeScript errors

### `/centers` (POST)

- `PostCentersRequest` incomplete → only has:
  - `name`
  - `officeId`
  - `active`
- Other required fields missing

### `/centers/{id}/notes`

- No endpoint defined in OpenAPI generator

### `/centers/{id}`

- `GetCentersCenterIdResponse` missing `staff` data

### `/centers/{id}` (PUT)

- `PutCentersCenterIdRequest` incomplete `staffId`, `externalId` missing from both
  - `name`
- `PutGroupsGroupIdRequest` (the endpoint the Angular web-app actually PUTs to for center edits, `/v1/groups/{id}`, not `/v1/centers/{id}`) incomplete `staffId`, `externalId` missing from both

---

## Institution Groups

### `/groups`

- `GetGroupsResponse` → references `GetGroupsPageItems`
- `GetGroupsPageItems` missing:
  - `accountNo`
  - `externalId`

### `/groups` (POST)

- `PostGroupsResponse` missing:
  - `staffId`
  - `externalId`
  - `submittedOnDate`
  - `activationDate`
- Prevents group creation

---

## Institution Clients

### `/clients/{id}/charges/{chargeId}`

- `GetClientsChargesPageItems` missing `clientTransactionDatas`

### `/clients/template`

- `GetClientsTemplateResponse` missing `genderOptions`, `clientTypeOptions`, `clientClassificationOptions`

### `/clients`

- `PostClientsRequest` missing `staffId`, `isStaff`, `submittedOnDate`

### `/clients/{id}` (GET)

- `GetClientsClientIdResponse` missing `legalFormId`, `middlename`, `dateOfBirth`, `genderId`, `staffId`, `mobileNo`, `clientTypeId`, `clientClassificationId`, `submittedOnDate`

### `/clients/{id}` (PUT)

- `PutClientsClientIdRequest` only has `externalId`, `resourceExternalId`

### `/savingsaccounts/template`

- `GetSavingsAccountsTemplateResponse` missing `fieldOfficerOptions`, `interestCompoundingPeriodTypeOptions`, `interestPostingPeriodTypeOptions`, `interestCalculationTypeOptions`, `interestCalculationDaysInYearTypeOptions`, `lockinPeriodFrequencyTypeOptions`, `savingsAmountOnClosureTypeOptions`, `withdrawalFeeTypeOptions`, `chargeOptions`, `currencyOptions`

### `/savingsaccounts`

- `PostSavingsAccountsRequest` missing `fieldOfficerId`, `nominalAnnualInterestRate`, `interestCompoundingPeriodType`, `interestPostingPeriodType`, `interestCalculationType`, `interestCalculationDaysInYearType`, `minRequiredOpeningBalance`, `lockinPeriodFrequency`,

### `/accounts/share/template`

- `GetAccountsTypeTemplateResponse` missing `chargeOptions`, `minimumActivePeriodFrequencyTypeOptions``lockinPeriodFrequencyTypeOptions`, `currencyOptions`

---

### `/accountingrules` (POST) / `/accountingrules/{id}` (PUT)

- `AccountRuleRequest` missing `debitTags`, `creditTags`, `allowMultipleDebitEntries`, `allowMultipleCreditEntries`

### `/accountingrules/{id}` (GET)

- `AccountingRuleData` missing `accountToDebit`,`accountToCredit`
